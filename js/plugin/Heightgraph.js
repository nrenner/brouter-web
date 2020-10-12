BR.Heightgraph = L.Control.Heightgraph.extend({
    options: {
        width: $('#map').outerWidth(),
        margins: {
            top: 15,
            right: 30,
            bottom: 40,
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

        // and render the chart
        this.update();
    },

    update: function(track, layer) {
        // bring height indicator to front, because of track casing in BR.Routing
        if (this._mouseHeightFocus) {
            var g = this._mouseHeightFocus[0][0].parentNode;
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
        var features = [];

        // this is going to be initialized in the first iteration
        var currentFeature;
        // undefined is fine, as it will be different than the next gradient
        var previousGradient;
        for (var i = 1; i < latLngs.length; i++) {
            var previousPoint = latLngs[i - 1];
            var currentPoint = latLngs[i];

            var dist = currentPoint.distanceTo(previousPoint); // always > 0
            var altDelta = currentPoint.alt - previousPoint.alt;
            var currentGradient = this._mapGradient((altDelta * 100) / dist);

            var coordinate = [currentPoint.lng, currentPoint.lat, currentPoint.alt];

            if (currentGradient == previousGradient) {
                currentFeature.geometry.coordinates.push(coordinate);
            } else {
                currentFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [coordinate]
                    },
                    properties: {
                        attributeType: currentGradient
                    }
                };
                features.push(currentFeature);
            }

            // prepare for the next iteration
            previousGradient = currentGradient;
        }

        // insert the first coordinate in pole position,
        // and give it the same gradient as the next one
        features[0].geometry.coordinates.splice(0, 0, [latLngs[0].lng, latLngs[0].lat, latLngs[0].alt]);

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
     * Map a gradient percentage to one of the codes defined
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
