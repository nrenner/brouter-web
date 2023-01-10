BR.RoutingPathQuality = L.Control.extend({
    options: {
        shortcut: {
            toggle: 67, // char code for 'c'
            muteKeyCode: 77, // char code for 'm'
        },
    },

    initialize: function (map, layersControl, options) {
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
                            1.0: '#ff0000', // red
                        },
                        outlineColor: 'dimgray',
                        renderer: renderer,
                    },
                    valueFunction: function (latLng, prevLatLng) {
                        var deltaAltitude = latLng.alt - prevLatLng.alt, // in m
                            distance = prevLatLng.distanceTo(latLng); // in m
                        if (distance === 0) {
                            return 0;
                        }
                        return (Math.atan(deltaAltitude / distance) * 180) / Math.PI;
                    },
                }),
            },
            altitude: {
                title: i18next.t('map.route-quality-shortcut', { action: '$t(map.route-quality-altitude)', key: 'C' }),
                icon: 'fa-area-chart',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        outlineColor: 'dimgray',
                        renderer: renderer,
                    },
                    valueFunction: function (latLng) {
                        return latLng.alt;
                    },
                }),
            },
            surface: {
                title: i18next.t('map.route-quality-surface'),
                icon: 'fa-road',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        renderer: renderer,
                        palette: {
                            // normal range
                            0.0: 'red',
                            0.45: 'yellow',
                            0.9: 'green',
                            // special value for unknown
                            1.0: '#888888',
                        },
                        // note: without this the lib will get min/max from the actual
                        // values rendering the special values moot
                        min: 0,
                        max: 1,
                        discreteStrokes: true,
                    },
                    valueFunction: (function () {
                        let cache = [];
                        return function (latLng) {
                            var feature = latLng.feature;
                            if (!feature.wayTags) {
                                return 1.0;
                            } else if (cache[feature.wayTags]) {
                                return cache[feature.wayTags];
                            }
                            let data = new URLSearchParams(feature.wayTags.replace(/\s+/g, '&')); // eslint-disable-line compat/compat
                            let surface = null;
                            switch (data.get('surface')) {
                                case 'paved':
                                case 'chipseal':
                                    surface = 0.8;
                                    break;
                                case 'asphalt':
                                case 'concrete':
                                    surface = 1;
                                    break;
                                case 'concrete:lanes':
                                case 'concrete:plates':
                                    surface = 0.6;
                                case 'sett':
                                case 'gravel':
                                case 'pebblestone':
                                case 'unpaved':
                                    surface = 0.5;
                                    break;
                                case 'paving_stones':
                                case 'compacted':
                                case 'fine_gravel':
                                    surface = 0.7;
                                    break;
                                case 'cobblestone':
                                case 'dirt':
                                case 'grass':
                                    surface = 0.2;
                                    break;
                                case 'unhewn_cobblestone':
                                    surface = 0.01;
                                    break;
                                case 'ground':
                                case 'earth':
                                    surface = 0.3;
                                    break;
                                case 'mud':
                                case 'sand':
                                    surface = 0.01;
                                    break;
                                case null:
                                    break;
                                /*default:
                                    console.warn('unhandled surface type', data.get('surface'));
                                    break;*/
                            }

                            // modifier tracktype; also sometimes only tracktype is available
                            if (data.get('highway') === 'track') {
                                switch (data.get('tracktype') || 'unknown') {
                                    case 'grade1':
                                        if (surface === null) {
                                            surface = 0.9;
                                        } /* else {
                                            don't change
                                        } */
                                        break;
                                    case 'grade2':
                                        if (surface === null) {
                                            surface = 0.7;
                                        } else {
                                            surface *= 0.9;
                                        }
                                        break;
                                    case 'grade3':
                                        if (surface === null) {
                                            surface = 0.4;
                                        } else {
                                            surface *= 0.8;
                                        }
                                        break;
                                    case 'grade4':
                                        if (surface === null) {
                                            surface = 0.1;
                                        } else {
                                            surface *= 0.6;
                                        }
                                        break;
                                    case 'grade5':
                                        if (surface === null) {
                                            surface = 0.01;
                                        } else {
                                            surface *= 0.4;
                                        }
                                        break;
                                }
                            }

                            if (surface !== null) {
                                // modifier for surface quality
                                switch (data.get('smoothness')) {
                                    case 'excellent':
                                        surface = Math.min(surface * 1.1, 1.0);
                                        break;
                                    case 'good':
                                        surface = Math.min(surface * 1.05, 1.0);
                                        break;
                                    case 'intermediate':
                                        surface *= 0.9;
                                        break;
                                    case 'bad':
                                        surface *= 0.7;
                                        break;
                                    case 'very_bad':
                                        surface *= 0.5;
                                        break;
                                    case 'horrible':
                                        surface *= 0.4;
                                        break;
                                    case 'very_horrible':
                                        surface *= 0.2;
                                        break;
                                    case 'impassable':
                                        surface *= 0.01;
                                        break;
                                }
                            }

                            // limit normal values 0-0.9 so 1.0 can be unknown
                            const final = surface === null ? 1.0 : surface * 0.9;
                            cache[feature.wayTags] = final;
                            return final;
                        };
                    })(),
                }),
            },
            cost: {
                title: i18next.t('map.route-quality-shortcut', { action: '$t(map.route-quality-cost)', key: 'C' }),
                icon: 'fa-usd',
                provider: new HotLineQualityProvider({
                    hotlineOptions: {
                        pct: 0.95, // skip (1 - pct) percent of largest values when calculating maximum
                        outlineColor: 'dimgray',
                        renderer: renderer,
                    },
                    valueFunction: function (latLng) {
                        var feature = latLng.feature;
                        var cost = feature.cost.perKm;
                        var distance = feature.distance / 1000; // in km
                        if (distance > 0) {
                            cost +=
                                (feature.cost.elev + feature.cost.turn + feature.cost.node + feature.cost.initial) /
                                distance;
                        }
                        return cost;
                    },
                }),
            },
        };
        this._initialProvider = this.options.initialProvider || 'incline';
        this.selectedProvider = this._initialProvider;

        this._active = false;
        this._muted = false;
    },

    onAdd: function (map) {
        this._map = map;

        map.on(
            'overlayadd',
            function (evt) {
                if (evt.layer === this._routingSegments) {
                    this._activate(this.routingPathButton);
                }
            },
            this
        );
        map.on(
            'overlayremove',
            function (evt) {
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
                onClick: L.bind(function (state) {
                    return L.bind(function (btn) {
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
                }, this)(nextState),
            });
        }

        if (this.options.shortcut.muteKeyCode || this.options.shortcut.toggle) {
            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
            L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);
        }

        this.routingPathButton = new L.easyButton({
            states: states,
        }).addTo(map);
        return new L.DomUtil.create('div');
    },

    _activate: function (btn) {
        this._active = true;
        this._getIcon(btn).classList.add('active');
        this._routingSegments.addTo(this._map);
    },

    _deactivate: function (btn) {
        this._active = false;
        this._getIcon(btn).classList.remove('active');
        this._map.removeLayer(this._routingSegments);
    },

    _getIcon: function (btn) {
        return btn.button.firstChild.firstChild;
    },

    update: function (track, layer) {
        var segments = [];
        layer.eachLayer(function (layer) {
            segments.push(layer);
        });
        this.segments = segments;
        this._update(this.segments);
    },

    setProvider: function (provider) {
        this.selectedProvider = provider;
        this._update(this.segments);
    },

    _update: function (segments) {
        this._routingSegments.clearLayers();
        var layers = this.providers[this.selectedProvider].provider.computeLayers(segments);
        if (layers) {
            for (var i = 0; i < layers.length; i++) {
                this._routingSegments.addLayer(layers[i]);
            }
        }
    },

    _keydownListener: function (e) {
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

    _keyupListener: function (e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && this._muted && e.keyCode === this.options.shortcut.muteKeyCode) {
            this._muted = false;
            this._activate(this.routingPathButton);
        }
    },
});

var HotLineQualityProvider = L.Class.extend({
    initialize: function (options) {
        this.hotlineOptions = options.hotlineOptions;
        this.valueFunction = options.valueFunction;
    },

    computeLayers: function (segments) {
        var layers = [];
        if (segments) {
            var segmentLatLngs = [];
            var flatLines = [];
            for (var i = 0; segments && i < segments.length; i++) {
                var segment = segments[i];
                if (segment._routing?.beeline) continue;
                var vals = this._computeLatLngVals(segment);
                segmentLatLngs.push(vals);
                Array.prototype.push.apply(flatLines, vals);
            }

            if (flatLines.length > 0) {
                var hotlineOptions = L.extend({}, this.hotlineOptions);
                if (!hotlineOptions.min && !hotlineOptions.max) {
                    hotlineOptions.pct = hotlineOptions.pct ? hotlineOptions.pct : 1.0;
                    var minMax = this._calcMinMaxValues(flatLines, hotlineOptions.pct);
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

    _computeLatLngVals: function (segment) {
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

    _convertToArray: function (latLng, val) {
        return [latLng.lat, latLng.lng, val];
    },

    _calcMinMaxValues: function (lines, pct) {
        lines.sort(function(a, b){return a[2] - b[2]});
        var min = lines[0][2];
        var max = lines[Math.ceil(pct * lines.length) - 1][2];
        if (min === max) {
            max = min + 1;
        }
        return {
            min: min,
            max: max,
        };
    },
});
