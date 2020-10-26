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
                        text: '16%+',
                        color: '#028306'
                    },
                    '-4': {
                        text: '10-15%',
                        color: '#2AA12E'
                    },
                    '-3': {
                        text: '7-9%',
                        color: '#53BF56'
                    },
                    '-2': {
                        text: '4-6%',
                        color: '#7BDD7E'
                    },
                    '-1': {
                        text: '1-3%',
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
                // TODO
                /*
    var geojson = track.toGeoJSON();
    geojson.properties = { attributeType: 0 };
    var data = [
        {
            type: 'FeatureCollection',
            features: [geojson],
            properties: {
                Creator: 'OpenRouteService.org',
                records: 1,
                summary: 'gradient'
            }
        }
    ];
    this.addData(data);
    */

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

            var features = [];

            // this is going to be initialized on the first buffer flush
            var currentFeature;

            // undefined is fine, as it will be different than the current gradient
            // in the first buffer flush
            var previousGradient;

            // since the altitude coordinate on points is not very reliable, let's normalize it
            // by averaging the gradient over several point (within the min distance defined below)
            var buffer = [];
            var bufferDistance = 0;

            // each subsequent feature starts with the last point on the previous features,
            // and hence keep track of it
            var lastFeaturePoint;

            // the minimum distance (in meters) between the points in the buffer;
            // once reached, the buffer is flushed
            var bufferMinDistance = 200;
            // TODO calculate min distance based on the total route distance

            if (latLngs.length > 0) {
                buffer.push(latLngs[0]);
            }
            for (var i = 1; i < latLngs.length; i++) {
                buffer.push(latLngs[i]); // the buffer contains at least 2 points by now
                bufferDistance =
                    bufferDistance +
                    // never negative
                    buffer[buffer.length - 1].distanceTo(buffer[buffer.length - 2]);

                console.log('point:', latLngs[i], 'bufferDistance:', bufferDistance);
                // if we reached the tipping point,
                // each point in the buffer gets the same gradient rating,
                // and flush the buffer
                if (bufferDistance >= bufferMinDistance) {
                    var altDelta = buffer[buffer.length - 1].alt - buffer[0].alt;
                    var currentGradientPercentage = (altDelta * 100) / bufferDistance; // never division by 0
                    var currentGradient = self._mapGradient(currentGradientPercentage);
                    console.log('currentGradient:', currentGradient);

                    if (currentGradient == previousGradient) {
                        // the gradient hasn't changed; flush into the last feature
                        console.log('adding points in buffer to the current feature:', buffer);
                        buffer.forEach(function(point) {
                            var coordinate = [point.lng, point.lat, point.alt];
                            currentFeature.geometry.coordinates.push(coordinate);
                        });
                    } else {
                        // the gradient has changed; flush into a new feature
                        currentFeature = self._buildFeature(buffer, currentGradient);
                        console.log('building new feature:', currentFeature);
                        features.push(currentFeature);
                    }

                    // prepare for the next iteration
                    previousGradient = currentGradient;
                    lastFeaturePoint = buffer[buffer.length - 1]; // before clearing the buffer
                    // TODO this is wrong, as on line 209 and 249 it will be repeated
                    buffer = [lastFeaturePoint];
                    bufferDistance = 0;
                }
            }

            // handle the remaining points in the buffer
            if (typeof currentFeature === 'undefined') {
                if (buffer.length > 1) {
                    // TODO remove duplication
                    // building a feature with the few points on the route
                    console.log('building a feature with the few points on the route');
                    var altDelta = buffer[buffer.length - 1].alt - buffer[0].alt;
                    // bufferDistance as already initialized in the main for loop
                    var currentGradientPercentage = (altDelta * 100) / bufferDistance; // never division by 0
                    var currentGradient = self._mapGradient(currentGradientPercentage);

                    currentFeature = self._buildFeature(buffer, currentGradient);
                    features.push(currentFeature);
                }
            } else {
                // adding a few more points to the last feature
                console.log('adding a few more points to the last feature; point count:', buffer.length);
                buffer.forEach(function(point) {
                    var coordinate = [point.lng, point.lat, point.alt];
                    currentFeature.geometry.coordinates.push(coordinate);
                });
            }
            /*
            // each feature starts with the last point on the previous feature;
            // this will also take care of inserting the firstmost point
            // (latLngs[0]) at position 0 into the first feature in the list
            for (var i = 1; i < latLngs.length; i++) {
                var previousPoint = latLngs[i - 1];
                var currentPoint = latLngs[i];

                var dist = currentPoint.distanceTo(previousPoint); // never negative
                var altDelta = currentPoint.alt - previousPoint.alt;
                var currentGradientPercentage = (altDelta * 100) / dist;
                var currentGradient = dist == 0 ? 0 : this._mapGradient(currentGradientPercentage);
                // TODO
                console.log(
                    'gradient %:',
                    currentGradientPercentage,
                    '; gradient level:',
                    currentGradient,
                    '; dist:',
                    dist,
                    '; alt:',
                    altDelta,
                    '; previous point:',
                    previousPoint.lng,
                    previousPoint.lat,
                    previousPoint.alt,
                    '; current point:',
                    currentPoint.lng,
                    currentPoint.lat,
                    currentPoint.alt
                );

                if (currentGradient == previousGradient) {
                    var coordinate = [currentPoint.lng, currentPoint.lat, currentPoint.alt];
                    currentFeature.geometry.coordinates.push(coordinate);
                } else {
                    currentFeature = this._buildFeature([previousPoint, currentPoint], currentGradient);
                    features.push(currentFeature);
                }

                // prepare for the next iteration
                previousGradient = currentGradient;
            }
*/
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

        _buildFeature: function(subsequentPoints, gradient) {
            var coordinates = [];
            subsequentPoints.forEach(function(point) {
                coordinates.push([point.lng, point.lat, point.alt]);
            });

            return {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                    // coordinates: [[point1.lng, point1.lat, point1.alt], [point2.lng, point2.lat, point2.alt]]
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
