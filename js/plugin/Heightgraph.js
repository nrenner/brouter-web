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
            }
        },

        /**
         * @param {LatLng[]} latLngs an array of LatLng objects, guaranteed to be not empty
         */
        _buildGeojsonFeatures: function(latLngs) {
            var self = this;
            // TODO set the alt to undefined on the first few points
            // TODO set the alt to undefined on the last few points
            // TODO set the alt to undefined on the first and last few points
            // TODO set the alt to undefined on all but first point
            // TODO set the alt to undefined on all but last point
            // TODO set the alt to undefined on all points
            // TODO set the alt to undefined on all between first and last points
            // TODO set the alt to undefined on all between first and middle point, and on all between middle and last point

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

                if (typeof currentGradient === 'undefined') {
                    // not enough points on the segment to calculate the gradient
                    currentFeature = self._buildFeature(segment, currentGradient);
                    features.push(currentFeature);
                } else if (currentGradient == previousGradient) {
                    // the gradient hasn't changed, we can append this segment to the last feature;
                    // since the segment contains, at index 0 the last point on the feature,
                    // add only points from index 1 onward
                    self._addPointsToFeature(currentFeature, segment.slice(1));
                } else {
                    // the gradient has changed; create a new feature
                    currentFeature = self._buildFeature(segment, currentGradient);
                    features.push(currentFeature);
                }

                // reset to prepare for the next iteration
                previousGradient = currentGradient;
            });
            // TODO at the end of 3rd render (breakpoint on line 203), feature 37 has undefined points;
            //      test with previous working version for errors in console

            // TODO when elevation profile is open, the toggle button should be blue, not gray

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

            var bufferDistance = this._calculateDistance(buffer);
            for (; index < latLngs.length; index++) {
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

            // if the buffer is not empty, add all points from it into the last segment
            if (segments.length === 0) {
                segments.push(buffer);
            } else if (buffer.length > 0) {
                var lastSegment = segments[segments.length - 1];
                buffer.forEach(function(p) {
                    lastSegment.push(p);
                });
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
         * The array must have at least 2 elements.
         */
        _calculateGradient: function(latLngs) {
            // TODO what if .alt is undefined on the heading or trailing points
            // the array is guaranteed to have 2+ elements
            var altDelta = latLngs[latLngs.length - 1].alt - latLngs[0].alt;
            var distance = this._calculateDistance(latLngs);

            var currentGradientPercentage = distance == 0 ? 0 : (altDelta * 100) / distance;
            var currentGradient = this._mapGradient(currentGradientPercentage);
            return currentGradient;
        },

        /**
         * Add the given array of LatLng points to the end of the provided feature.
         */
        _addPointsToFeature: function(feature, latLngs) {
            latLngs.forEach(function(point) {
                var coordinate = [point.lng, point.lat, point.alt];
                feature.geometry.coordinates.push(coordinate);
            });
        },

        _buildFeature: function(latLngs, gradient) {
            var coordinates = [];
            latLngs.forEach(function(latLng) {
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
            }
        }
    });

    var heightgraphControl = new Heightgraph();
    return heightgraphControl;
};
