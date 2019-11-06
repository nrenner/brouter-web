BR.RoutingPathQuality = L.Control.extend({
    initialize: function(map, layersControl, options) {
        L.setOptions(this, options);

        // hotline uses canvas and cannot be moved in front of the svg, so we create another pane
        map.createPane('routingQualityPane');
        map.getPane('routingQualityPane').style.zIndex = 450;
        map.getPane('routingQualityPane').style.pointerEvents = 'none';
        var renderer = new L.Hotline.Renderer({ pane: 'routingQualityPane' });

        this._routingSegments = L.featureGroup();
        layersControl.addOverlay(this._routingSegments, i18next.t('map.layer.route-quality'));

        this.providers = {
            incline: {
                title: i18next.t('map.route-quality-incline'),
                icon: 'fa-line-chart',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        min: -15,
                        max: 15,
                        palette: {
                            0.0: '#ff0000',
                            0.5: '#00ff00',
                            1.0: '#ff0000'
                        },
                        renderer: renderer
                    },
                    valueFunction: function(latLng, prevLatLng) {
                        var deltaAltitude = latLng.alt - prevLatLng.alt, // in m
                            distance = prevLatLng.distanceTo(latLng); // in m
                        if (distance === 0) {
                            return 0;
                        }
                        return (Math.atan(deltaAltitude / distance) * 180) / Math.PI;
                    }
                })
            },
            altitude: {
                title: i18next.t('map.route-quality-altitude'),
                icon: 'fa-area-chart',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        renderer: renderer
                    },
                    valueFunction: function(latLng) {
                        return latLng.alt;
                    }
                })
            },
            cost: {
                title: i18next.t('map.route-quality-cost'),
                icon: 'fa-usd',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        renderer: renderer
                    },
                    valueFunction: function(latLng) {
                        var feature = latLng.feature;
                        return (
                            feature.cost.perKm +
                            feature.cost.elev +
                            feature.cost.turn +
                            feature.cost.node +
                            feature.cost.initial
                        );
                    }
                })
            }
        };
        this.selectedProvider = this.options.initialProvider || 'incline';
    },

    onAdd: function(map) {
        var self = this;
        this._map = map;
        this._routingSegments.addTo(map);

        var states = [],
            i,
            keys = Object.keys(this.providers),
            l = keys.length;

        for (i = 0; i < l; ++i) {
            var provider = this.providers[keys[i]];
            var nextState = keys[(i + 1) % l];
            states.push({
                stateName: keys[i],
                icon: provider.icon,
                title: provider.title,
                onClick: function(btn) {
                    btn.state(nextState);
                    self.setProvider(nextState);
                }
            });
        }

        this.routingPathButton = new L.easyButton({
            states: states
        }).addTo(map);
        return new L.DomUtil.create('div');
    },

    update: function(track, layer) {
        var segments = [];
        layer.eachLayer(function(layer) {
            segments.push(layer);
        });
        this.segments = segments;
        this._update(this.segments);
    },

    setProvider: function(provider) {
        this.selectedProvider = provider;
        this._update(this.segments);
        this._routingSegments.addTo(this._map);
    },

    _update: function(segments) {
        this._routingSegments.clearLayers();
        var layers = this.providers[this.selectedProvider].provider.computeLayers(segments);
        if (layers) {
            for (var i = 0; i < layers.length; i++) {
                this._routingSegments.addLayer(layers[i]);
            }
        }
    }
});

var HotLineQualityProvider = L.Class.extend({
    initialize: function(options) {
        this.hotlineOptions = options.hotlineOptions;
        this.valueFunction = options.valueFunction;
    },

    computeLayers: function(segments) {
        var layers = [];
        if (segments) {
            var segmentLatLngs = [];
            var flatLines = [];
            for (var i = 0; segments && i < segments.length; i++) {
                var segment = segments[i];
                var vals = this._computeLatLngVals(segment);
                segmentLatLngs.push(vals);
                Array.prototype.push.apply(flatLines, vals);
            }

            if (flatLines.length > 0) {
                var hotlineOptions = {
                    min: this.hotlineOptions.min,
                    max: this.hotlineOptions.max,
                    palette: this.hotlineOptions.palette,
                    renderer: this.hotlineOptions.renderer
                };
                if (!hotlineOptions.min && !hotlineOptions.max) {
                    var minMax = this._calcMinMaxValues(flatLines);
                    hotlineOptions.min = minMax.min;
                    hotlineOptions.max = minMax.max;
                }

                for (var i = 0; i < segmentLatLngs.length; i++) {
                    var line = segmentLatLngs[i];
                    var hotline = L.hotline(line, hotlineOptions);
                    layers.push(hotline);
                }
            }
        }
        return layers;
    },

    _computeLatLngVals: function(segment) {
        var latLngVals = [],
            segmentLatLngs = segment.getLatLngs(),
            segmentLength = segmentLatLngs.length;

        for (var i = 0; i < segmentLength; i++) {
            var val = this.valueFunction.call(
                this,
                segmentLatLngs[i],
                segmentLatLngs[Math.max(i - 1, 0)],
                i,
                segmentLatLngs
            );
            latLngVals.push(this._convertToArray(segmentLatLngs[i], val));
        }
        return latLngVals;
    },

    _convertToArray: function(latLng, val) {
        return [latLng.lat, latLng.lng, val];
    },

    _calcMinMaxValues: function(lines) {
        var min = lines[0][2],
            max = min;
        for (var i = 1; lines && i < lines.length; i++) {
            var line = lines[i];
            max = Math.max(max, line[2]);
            min = Math.min(min, line[2]);
        }
        if (min === max) {
            max = min + 1;
        }
        return {
            min: min,
            max: max
        };
    }
});
