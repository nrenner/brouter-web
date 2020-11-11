BR.Heightgraph = function(map, layersControl, routing, pois) {
    Heightgraph = L.Control.Heightgraph.extend({
        options: {
            width: $('#map').outerWidth(),
            margins: {
                top: 15,
                right: 30,
                bottom: 30,
                left: 70
            },
            expandControls: false,
            mappings: {
                gradient: {
                    '-5': {
                        text: '- 16%+',
                        color: '#028306'
                    },
                    '-4': {
                        text: '- 10-15%',
                        color: '#2AA12E'
                    },
                    '-3': {
                        text: '- 7-9%',
                        color: '#53BF56'
                    },
                    '-2': {
                        text: '- 4-6%',
                        color: '#7BDD7E'
                    },
                    '-1': {
                        text: '- 1-3%',
                        color: '#A4FBA6'
                    },
                    '0': {
                        text: '0%',
                        color: '#ffcc99'
                    },
                    '1': {
                        text: '1-3%',
                        color: '#F29898'
                    },
                    '2': {
                        text: '4-6%',
                        color: '#E07575'
                    },
                    '3': {
                        text: '7-9%',
                        color: '#CF5352'
                    },
                    '4': {
                        text: '10-15%',
                        color: '#BE312F'
                    },
                    '5': {
                        text: '16%+',
                        color: '#AD0F0C'
                    }
                }
            },
            // extra options
            shortcut: {
                toggle: 69 // char code for 'e'
            },
            patches: {
                // whether or not to compensate for the bug in Leaflet.Heightgraph
                // which makes the chart rendering to break if the track contains points
                // without an elevation/altitude coordinate;
                // if set to true, the elevation of these points will be inferred
                // from the adjacent points which have it
                inferElevation: true
            }
        },

        addBelow: function(map) {
            // waiting for https://github.com/MrMufflon/Leaflet.Elevation/pull/66
            // this.width($('#map').outerWidth());
            this.options.width = $('#content').outerWidth();

            if (this.getContainer() != null) {
                this.remove(map);
            }

            function setParent(el, newParent) {
                newParent.appendChild(el);
            }
            this.addTo(map);

            // move elevation graph outside of the map
            setParent(this.getContainer(), document.getElementById('elevation-chart'));

            // bind the the mouse move and mouse out handlers, I'll reuse them later on
            this._mouseMoveHandlerBound = this.mapMousemoveHandler.bind(this);
            this._mouseoutHandlerBound = this._mouseoutHandler.bind(this);

            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
            this.initCollapse(map);

            var self = this;
            var container = $('#elevation-chart');
            $(window).resize(function() {
                // avoid useless computations if the chart is not visible
                if (container.is(':visible')) {
                    self.resize({
                        width: container.width(),
                        height: container.height()
                    });
                }
            });
            // Trigger the chart resize after the toggle animation is complete,
            // in case the window was resized while the chart was not visible.
            // The resize must be called after the animation (i.e. 'shown.bs.collapse')
            // and cannot be called before the animation (i.e. 'show.bs.collapse'),
            // for the container has the old width pre animation and new width post animation.
            container.on('shown.bs.collapse', function() {
                self.resize({
                    width: container.width(),
                    height: container.height()
                });
            });

            // and render the chart
            this.update();
        },

        initCollapse: function(map) {
            var self = this;
            var onHide = function() {
                $('#elevation-btn').removeClass('active');
                // we must fetch tiles that are located behind elevation-chart
                map._onResize();

                if (this.id && BR.Util.localStorageAvailable() && !self.shouldRestoreChart) {
                    localStorage.removeItem(this.id);
                }
            };
            var onShow = function() {
                $('#elevation-btn').addClass('active');

                if (this.id && BR.Util.localStorageAvailable()) {
                    localStorage[this.id] = 'true';
                }
            };
            // on page load, we want to restore collapse state from previous usage
            $('#elevation-chart')
                .on('hidden.bs.collapse', onHide)
                .on('shown.bs.collapse', onShow)
                .each(function() {
                    if (this.id && BR.Util.localStorageAvailable() && localStorage[this.id] === 'true') {
                        self.shouldRestoreChart = true;
                    }
                });
        },

        _keydownListener: function(e) {
            if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.toggle) {
                $('#elevation-btn').click();
            }
        },

        update: function(track, layer) {
            // bring height indicator to front, because of track casing in BR.Routing
            if (this._mouseHeightFocus) {
                var g = this._mouseHeightFocus._groups[0][0].parentNode;
                g.parentNode.appendChild(g);
            }

            if (track && track.getLatLngs().length > 0) {
                var geojsonFeatures = this._buildGeojsonFeatures(track.getLatLngs());
                this.addData(geojsonFeatures);

                // re-add handlers
                if (layer) {
                    layer.on('mousemove', this._mouseMoveHandlerBound);
                    layer.on('mouseout', this._mouseoutHandlerBound);
                }

                if (this.shouldRestoreChart === true) $('#elevation-chart').collapse('show');
                this.shouldRestoreChart = undefined;
            } else {
                this._removeMarkedSegmentsOnMap();
                this._resetDrag();

                // clear chart by passing an empty dataset
                this.addData([]);

                // and remove handlers
                if (layer) {
                    layer.off('mousemove', this._mouseMoveHandlerBound);
                    layer.off('mouseout', this._mouseoutHandlerBound);
                }

                if ($('#elevation-chart').hasClass('show')) {
                    this.shouldRestoreChart = true;
                }
                $('#elevation-chart').collapse('hide');
            }
        },

        /**
         * @param {LatLng[]} latLngs an array of LatLng objects, guaranteed to be not empty
         */
        _buildGeojsonFeatures: function(latLngs) {
            var self = this;

            // since the altitude coordinate on points is not very reliable, let's normalize it
            // by taking into account only the altitude on points at a given min distance

            // the minimum distance (in meters) between points which we consider
            // for the purpose of calculating altitudes and gradients;
            // consider 200 segments on the route, at least 200m long each
            // for short routes, make sure we still have enough of a distance to normalize over;
            // for long routes, we can afford to normalized over a longer distance,
            // hence increasing the accuracy
            var totalDistance = self._calculateDistance(latLngs);
            var bufferMinDistance = Math.max(totalDistance / 200, 200);

            var segments = self._partitionByMinDistance(latLngs, bufferMinDistance);

            var features = [];

            // this is going to be initialized in the first loop, no need to initialize now
            var currentFeature;

            // undefined is fine, as it will be different to the current gradient in the first loop
            var previousGradient;

            segments.forEach(function(segment) {
                var currentGradient = self._calculateGradient(segment);

                if (currentGradient == previousGradient) {
                    // the gradient hasn't changed, we can append this segment to the last feature;
                    // since the segment contains, at index 0,
                    // the last point on the current feature, add only points from index 1 onward
                    self._addPointsToFeature(currentFeature, segment.slice(1));
                } else {
                    // the gradient has changed; create a new feature
                    currentFeature = self._buildFeature(segment, currentGradient);
                    features.push(currentFeature);
                }

                // reset to prepare for the next iteration
                previousGradient = currentGradient;
            });

            return [
                {
                    type: 'FeatureCollection',
                    features: features,
                    properties: {
                        Creator: 'OpenRouteService.org',
                        records: features.length,
                        summary: 'gradient'
                    }
                }
            ];
        },

        /**
         * Given the list of latLng points, partition them into segments
         * at least _minDistance__ meters long,
         * where the first and last points always have a valid altitude.
         * NOTE: Given that some of the given points might not have a valid altitude,
         *       the first point(s) in the first buffer, as well as the last point(s)
         *       in the last buffer, might not have a valid altitude.
         */
        _partitionByMinDistance: function(latLngs, minDistance) {
            var segments = [];

            // temporary buffer where we add points
            // until the distance between them is at least minDistance
            var buffer = [];

            // push all points up to (and including) the first one with a valid altitude
            var index = 0;
            for (; index < latLngs.length; index++) {
                var latLng = latLngs[index];
                buffer.push(latLng);
                if (typeof latLng.alt !== 'undefined') {
                    break;
                }
            }

            // since the segments are used for gradient calculation (hence alt is needed),
            // consider 0 length so far,
            // for all points so far, except for the last one, don't have an altitude
            var bufferDistance = 0;

            // since index was already used, start at the next one
            for (index = index + 1; index < latLngs.length; index++) {
                var latLng = latLngs[index];
                buffer.push(latLng); // the buffer contains at least 2 points by now
                bufferDistance =
                    bufferDistance +
                    // never negative
                    buffer[buffer.length - 1].distanceTo(buffer[buffer.length - 2]);

                // if we reached the tipping point, add the buffer to segments, then flush it;
                // if this point doesn't have a valid alt, continue to the next one
                if (bufferDistance >= minDistance && typeof latLng.alt !== 'undefined') {
                    segments.push(buffer);
                    // re-init the buffer with the last point from the previous buffer
                    buffer = [buffer[buffer.length - 1]];
                    bufferDistance = 0;
                }
            }

            // if the buffer is not empty, add all points from it (except for the first one)
            // to the last segment
            if (segments.length === 0) {
                segments.push(buffer);
            } else if (buffer.length > 0) {
                var lastSegment = segments[segments.length - 1];
                for (var i = 1; i < buffer.length; i++) {
                    lastSegment.push(buffer[i]);
                }
            }

            return segments;
        },

        /**
         * Calculate the distance between all LatLng points in the given array.
         */
        _calculateDistance: function(latLngs) {
            var distance = 0;
            for (var i = 1; i < latLngs.length; i++) {
                distance += latLngs[i].distanceTo(latLngs[i - 1]); // never negative
            }
            return distance;
        },

        /**
         * Calculate the gradient between the first and last point in the LatLng array,
         * and map it to a gradient level.
         * If less than 2 points have an altitude coordinate, the 0 gradient is returned.
         */
        _calculateGradient: function(latLngs) {
            if (latLngs.length < 2) {
                return this._mapGradient(0);
            }

            // find the index of the first point with a valid altitude
            var firstIndex = -1;
            for (var i = 0; i < latLngs.length; i++) {
                if (typeof latLngs[i].alt !== 'undefined') {
                    firstIndex = i;
                    break;
                }
            }
            // if no point with a valid altitude was found, there's not much to do here
            if (firstIndex == -1) {
                return this._mapGradient(0);
            }

            // find the index of the last point with a valid altitude
            var lastIndex = -1;
            for (var i = latLngs.length - 1; i > firstIndex; i--) {
                if (typeof latLngs[i].alt !== 'undefined') {
                    lastIndex = i;
                    break;
                }
            }
            // if no point with a valid altitude was found between firstIndex and end of array,
            // there's not much else to do
            if (lastIndex == -1) {
                return this._mapGradient(0);
            }

            var altDelta = latLngs[lastIndex].alt - latLngs[firstIndex].alt;

            // calculate the distance only from firstIndex to lastIndex;
            // points before or after don't have a valid altitude,
            // hence they are not included in the gradient calculation
            var distance = this._calculateDistance(latLngs.slice(firstIndex, lastIndex + 1));

            var currentGradientPercentage = distance == 0 ? 0 : (altDelta * 100) / distance;
            var currentGradient = this._mapGradient(currentGradientPercentage);
            return currentGradient;
        },

        /**
         * Add the given array of LatLng points to the end of the provided feature.
         */
        _addPointsToFeature: function(feature, latLngs) {
            var latLngsWithElevation = this._inferElevation(latLngs);
            latLngsWithElevation.forEach(function(point) {
                var coordinate = [point.lng, point.lat, point.alt];
                feature.geometry.coordinates.push(coordinate);
            });
        },

        _buildFeature: function(latLngs, gradient) {
            var latLngsWithElevation = this._inferElevation(latLngs);
            var coordinates = [];
            latLngsWithElevation.forEach(function(latLng) {
                coordinates.push([latLng.lng, latLng.lat, latLng.alt]);
            });

            return {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                },
                properties: {
                    attributeType: gradient
                }
            };
        },

        /**
         * If the global flag is true, return a new list of LatLng points
         * which all have the elevation coordinate set,
         * so that the overall gradient profile of the point list stays the same.
         * If there are points without elevation at the start or end of the given list,
         * the elevation coordinate is set so that the gradient profile to the closest point
         * with elevation is flat (i.e. the gradient is 0).
         * If the global flag is false, the given list is returned.
         */
        _inferElevation: function(latLngs) {
            if (this.options.patches.inferElevation != true || latLngs.length === 0) {
                return latLngs;
            }

            var result = latLngs.slice();

            this._inferElevationStart(result);
            this._inferElevationEnd(result);

            // find points without elevation and set it
            var previousIndex = -1; // keep track of the index of the previous point with elevation
            for (var i = 0; i < result.length; i++) {
                if (typeof result[i].alt !== 'undefined') {
                    previousIndex = i;
                    continue;
                }

                // we've just found the first point in a potential series

                // if there is no previous point with elevation (which is unexpected),
                // we're in a pickle, hence skip the current point
                if (previousIndex == -1) {
                    continue;
                }

                // look up the next point with ele
                var nextIndex = i + 1;
                for (; nextIndex < result.length; nextIndex++) {
                    if (typeof result[nextIndex].alt !== 'undefined') {
                        break;
                    }
                }
                // if we got to the end of list and haven't found a point with elevation
                // (which is unexpected), we're in a pickle, hence skip the current point
                if (nextIndex == result.length) {
                    continue;
                }

                // fix the elevation on all points in the current series
                this._inferElevationSublist(result, previousIndex + 1, nextIndex - 1);

                // finally, since we've fixed the current series, skip to the next point
                i = nextIndex - 1;
            }

            return result;
        },

        /*
         * Check for points without elevation at the start of the list;
         * if such points are found, set their elevation to be the same
         * as the elevation on the first point with such coordinate.
         * If no points in the list have an elevation coordinate, set it to 0 on all.
         * Note that the given list of LatLng points is mutated.
         */
        _inferElevationStart: function(latLngs) {
            // if the list is empty, or the first point has elevation, there's nothing to do
            if (latLngs.length == 0 || typeof latLngs[0].alt !== 'undefined') {
                return;
            }

            var index = 0; // the index of the first point with elevation
            var alt = 0; // the elevation of the first point with such coordinate
            for (; index < latLngs.length; index++) {
                if (typeof latLngs[index].alt !== 'undefined') {
                    alt = latLngs[index].alt;
                    break;
                }
            }
            // set the elevation on all points without it at the start of the list
            for (var i = 0; i < index; i++) {
                var point = latLngs[i];
                latLngs[i] = L.latLng(point.lat, point.lng, alt);
            }
        },

        /*
         * Check for points without elevation at the end of the list;
         * if such points are found, set their elevation to be the same
         * as the elevation on the last point with such coordinate.
         * If no points in the list have an elevation coordinate, set it to 0 on all.
         * Note that the given list of LatLng points is mutated.
         */
        _inferElevationEnd: function(latLngs) {
            // if the list is empty, or the last point has elevation, there's nothing to do
            if (latLngs.length == 0 || typeof latLngs[latLngs.length - 1].alt !== 'undefined') {
                return;
            }

            var index = latLngs.length - 1; // the index of the last point with elevation
            var alt = 0; // the elevation of the last point with such coordinate
            for (; index >= 0; index--) {
                if (typeof latLngs[index].alt !== 'undefined') {
                    alt = latLngs[index].alt;
                    break;
                }
            }
            // set the elevation on all points without it at the end of the list
            for (var i = index + 1; i < latLngs.length; i++) {
                var point = latLngs[i];
                latLngs[i] = L.latLng(point.lat, point.lng, alt);
            }
        },

        /**
         * Given the list of LatLng points,
         * and the series of points without elevation from startIndex to endIndex,
         * set the elevation on these points so that the gradient from
         * startIndex-1 to endIndex+1 is constant.
         * startIndex must be preceeded by a point with elevation;
         * endIndex must be followed by a point with elevation.
         * Note that the given list of LatLng points is mutated.
         */
        _inferElevationSublist: function(latLngs, startIndex, endIndex) {
            var previousIndex = startIndex - 1; // index of the previous point with elevation before this series
            var nextIndex = endIndex + 1; // index of the next point with elevation after this series

            // calculate the overall gradient for the current series
            var distance = this._calculateDistance(latLngs.slice(previousIndex, nextIndex + 1));
            var altitudeDelta = latLngs[nextIndex].alt - latLngs[previousIndex].alt;
            var gradient = distance == 0 ? 0 : (altitudeDelta * 100) / distance;

            // now  fix the elevation on each point in the series, one by one
            for (var i = startIndex; i <= endIndex; i++) {
                var dist = latLngs[i].distanceTo(latLngs[i - 1]);
                var alt = (gradient * dist) / 100 + latLngs[i - 1].alt;
                var point = latLngs[i];
                latLngs[i] = L.latLng(point.lat, point.lng, Number(alt.toFixed(1)));
            }
        },

        /**
         * Map a gradient percentage to one of the levels defined
         * in options.mappings.gradient.
         */
        _mapGradient: function(gradientPercentage) {
            if (gradientPercentage <= -16) {
                return -5;
            } else if (gradientPercentage > -16 && gradientPercentage <= -10) {
                return -4;
            } else if (gradientPercentage > -10 && gradientPercentage <= -7) {
                return -3;
            } else if (gradientPercentage > -7 && gradientPercentage <= -4) {
                return -2;
            } else if (gradientPercentage > -4 && gradientPercentage <= -1) {
                return -1;
            } else if (gradientPercentage > -1 && gradientPercentage < 1) {
                return 0;
            } else if (gradientPercentage >= 1 && gradientPercentage < 4) {
                return 1;
            } else if (gradientPercentage >= 4 && gradientPercentage < 7) {
                return 2;
            } else if (gradientPercentage >= 7 && gradientPercentage < 10) {
                return 3;
            } else if (gradientPercentage >= 10 && gradientPercentage < 16) {
                return 4;
            } else if (gradientPercentage >= 16) {
                return 5;
            } else {
                console.log('Unknown gradientPercentage: ', gradientPercentage, '; cannot map');
                return 0;
            }
        }
    });

    var heightgraphControl = new Heightgraph();
    return heightgraphControl;
};
