BR.RoutingPathQuality = L.Control.extend({
    options: {
        shortcut: {
            toggle: 67, // char code for 'c'
            muteKeyCode: 77 // char code for 'm'
        }
    },

    initialize: function(map, layersControl, options) {
        L.setOptions(this, options);

        // hotline uses canvas and cannot be moved in front of the svg, so we create another pane
        map.createPane('routingQualityPane');
        map.getPane('routingQualityPane').style.zIndex = 450;
        map.getPane('routingQualityPane').style.pointerEvents = 'none';
        var renderer = new L.Hotline.Renderer({ pane: 'routingQualityPane' });

        this._routingSegments = L.featureGroup();
        this._routingSegments.id = 'route-quality'; // for URL hash instead of language name
        layersControl.addOverlay(this._routingSegments, i18next.t('map.layer.route-quality'));

        this.providers = {
            incline: {
                title: i18next.t('map.route-quality-shortcut', { action: '$t(map.route-quality-incline)', key: 'C' }),
                icon: 'fa-line-chart',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        min: -8.5,
                        max: 8.5, // angle in degree, == 15% incline
                        palette: {
                            0.0: '#0000ff', // blue
                            0.25: '#00ffff', // cyan
                            0.5: '#00ff00', // green
                            0.75: '#ffff00', // yellow
                            1.0: '#ff0000' // red
                        },
                        outlineColor: 'dimgray',
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
                title: i18next.t('map.route-quality-shortcut', { action: '$t(map.route-quality-altitude)', key: 'C' }),
                icon: 'fa-area-chart',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        outlineColor: 'dimgray',
                        renderer: renderer
                    },
                    valueFunction: function(latLng) {
                        return latLng.alt;
                    }
                })
            },
            cost: {
                title: i18next.t('map.route-quality-shortcut', { action: '$t(map.route-quality-cost)', key: 'C' }),
                icon: 'fa-usd',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        outlineColor: 'dimgray',
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
        this._initialProvider = this.options.initialProvider || 'incline';
        this.selectedProvider = this._initialProvider;

        this._active = false;
        this._muted = false;
    },

    onAdd: function(map) {
        this._map = map;

        map.on(
            'overlayadd',
            function(evt) {
                if (evt.layer === this._routingSegments) {
                    this._activate(this.routingPathButton);
                }
            },
            this
        );
        map.on(
            'overlayremove',
            function(evt) {
                if (evt.layer === this._routingSegments) {
                    this._deactivate(this.routingPathButton);
                }
            },
            this
        );

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
                onClick: L.bind(function(state) {
                    return L.bind(function(btn) {
                        if (this._active) {
                            btn.state(state);
                            this.setProvider(state);

                            if (state === this._initialProvider) {
                                this._deactivate(btn);
                            } else {
                                this._getIcon(btn).classList.add('active');
                            }
                        } else {
                            this._activate(btn);
                        }
                    }, this);
                }, this)(nextState)
            });
        }

        if (this.options.shortcut.muteKeyCode || this.options.shortcut.toggle) {
            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
            L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);
        }

        this.routingPathButton = new L.easyButton({
            states: states
        }).addTo(map);
        return new L.DomUtil.create('div');
    },

    _activate: function(btn) {
        this._active = true;
        this._getIcon(btn).classList.add('active');
        this._routingSegments.addTo(this._map);
    },

    _deactivate: function(btn) {
        this._active = false;
        this._getIcon(btn).classList.remove('active');
        this._map.removeLayer(this._routingSegments);
    },

    _getIcon: function(btn) {
        return btn.button.firstChild.firstChild;
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
    },

    _update: function(segments) {
        this._routingSegments.clearLayers();
        var layers = this.providers[this.selectedProvider].provider.computeLayers(segments);
        if (layers) {
            for (var i = 0; i < layers.length; i++) {
                this._routingSegments.addLayer(layers[i]);
            }
        }
    },

    _keydownListener: function(e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (this._active && e.keyCode === this.options.shortcut.muteKeyCode) {
            this._muted = true;
            this._deactivate(this.routingPathButton);
        }
        if (!this._muted && e.keyCode === this.options.shortcut.toggle) {
            this.routingPathButton.button.click();
        }
    },

    _keyupListener: function(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && this._muted && e.keyCode === this.options.shortcut.muteKeyCode) {
            this._muted = false;
            this._activate(this.routingPathButton);
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
                var hotlineOptions = L.extend({}, this.hotlineOptions);
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
