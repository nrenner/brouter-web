BR.CircleGoArea = L.Control.extend({
    radius: null, // in meters
    circleLayer: null,
    boundaryLayer: null,
    maskRenderer: L.svg({ padding: 2 }),
    countries: null,
    countriesMask: null,
    states: null,
    statesLoading: false,

    options: {
        countriesUrl: BR.conf.countriesUrl || 'dist/boundaries/countries.topo.json',
        statesUrl: BR.conf.statesUrl || 'dist/boundaries/germany-states.topo.json',
        overpassBaseUrl: BR.conf.overpassBaseUrl || 'https://overpass-api.de/api/interpreter?data=',
        shortcut: {
            draw: {
                enable: 73, // char code for 'i'
                disable: 27, // char code for 'ESC'
            },
        },
    },

    initialize: function (routing, nogos, pois, options) {
        this.routing = routing;
        this.nogos = nogos;
        this.pois = pois;
        L.setOptions(this, options);
    },

    onAdd: function (map) {
        var self = this;

        this.map = map;
        this.circleLayer = L.layerGroup([]).addTo(map);

        this.drawButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-circlego',
                    icon: 'fa-circle-o',
                    onClick: function () {
                        self.draw(true);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-start'),
                        key: 'I',
                    }),
                },
                {
                    stateName: 'deactivate-circlego',
                    icon: 'fa-circle-o active',
                    onClick: function () {
                        self.draw(false);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-stop'),
                        key: '$t(keyboard.escape)',
                    }),
                },
            ],
        });

        this.drawButton.disable();
        this.once(
            'countries:loaded',
            function () {
                this.drawButton.enable();
                if (this.marker && !this.marker.dragging.enabled()) {
                    this.marker.dragging.enable();
                }
            },
            this
        );
        this._loadCountries();

        // preload states in parallel, before clicked country is known, using browser language as indicator
        if (BR.Util.isCountry('DE')) {
            this._loadStates();
        }

        map.on('routing:draw-start', function () {
            self.draw(false);
        });

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        var container = new L.DomUtil.create('div');
        return container;
    },

    draw: function (enable) {
        this.drawButton.state(enable ? 'deactivate-circlego' : 'activate-circlego');
        if (enable) {
            this.routing.draw(false);
            this.pois.draw(false);
            this.map.on('click', this.onMapClick, this);
            if (this.countriesMask) {
                this.map.addLayer(this.countriesMask);
            }
            this._unlockOutsideArea();
            L.DomUtil.addClass(this.map.getContainer(), 'circlego-draw-enabled');
        } else {
            this.map.off('click', this.onMapClick, this);
            if (this.countriesMask && this.map.hasLayer(this.countriesMask)) {
                this.map.removeLayer(this.countriesMask);
            }
            this._lockOutsideArea();
            L.DomUtil.removeClass(this.map.getContainer(), 'circlego-draw-enabled');
        }
    },

    _keydownListener: function (e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable) {
            this.draw(false);
        } else if (e.keyCode === this.options.shortcut.draw.enable) {
            this.draw(true);
        }
    },

    _getBoundary: function (center, adminLevel, adminLevelFallback) {
        adminLevel = adminLevel || 8;
        var query =
            '[out:json]; is_in(' +
            center[1] +
            ', ' +
            center[0] +
            ')->.a;' +
            '(area.a[admin_level="' +
            adminLevel +
            '"];)->.p; relation(pivot.p); out geom;';

        if (adminLevelFallback) {
            // order is important (separate out), so fallback entry always comes last in result
            query += '(area.a[admin_level="' + adminLevelFallback + '"];)->.p; relation(pivot.p); out geom;';
        }

        var url = this.options.overpassBaseUrl + encodeURIComponent(query);

        this.marker.setIcon(this.iconSpinner);
        BR.Util.getJson(
            url,
            'boundary for coordinate "' + center + '"',
            L.bind(function (err, osmJson) {
                if (!err) {
                    if (osmJson.elements.length === 0) {
                        if (adminLevel === 8 || adminLevel === 7) {
                            // admin_level 6 (kreisfreie Stadt)
                            this._getBoundary(center, 6);
                        } else {
                            BR.message.showError('No boundary found for coordinate "' + center + '"');
                        }
                        return;
                    }

                    var geoJson = osmtogeojson(osmJson);

                    this._setBoundary(geoJson);
                }

                this.marker.setIcon(this.icon);
            }, this)
        );
    },

    _setBoundary: function (geoJson) {
        // drop admin_centre nodes
        geoJson.features = geoJson.features.filter(function (feature) {
            return feature.geometry.type !== 'Point';
        });

        var boundaryLine = turf.polygonToLine(geoJson.features[0]);
        this.boundaryLayer = L.geoJson(boundaryLine, {
            style: function (feature) {
                return {
                    weight: 1,
                    color: 'black',
                    opacity: 0.6,
                    interactive: false,
                };
            },
        }).addTo(this.map);

        var buffer = turf.buffer(geoJson, this.radius, { units: 'meters' });

        var ring = turf.polygonToLine(buffer.features[0]);
        if (ring.type !== 'FeatureCollection') {
            ring = turf.featureCollection([ring]);
        }

        /* hack: it seems there is a bug when using a single closed ring line,
        cf. https://github.com/nrenner/brouter-web/issues/349#issue-755514458
        so instead cut into smaller chunks of about half the circumference that worked for circles */
        var split = turf.lineChunk(ring, 62, { units: 'kilometers' });

        this._setNogo(split);
        this.setOutsideArea(ring);
    },

    _getPolygonForPoint: function (center, featureCollection) {
        var polygon = null;
        var point = turf.point(center);

        var features = featureCollection.features;
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var inside = turf.booleanPointInPolygon(point, feature);
            if (inside) {
                polygon = feature;
                break;
            }
        }

        return polygon;
    },

    _getState: function (center) {
        return this._getPolygonForPoint(center, this.states);
    },

    _getCountry: function (center) {
        return this._getPolygonForPoint(center, this.countries);
    },

    _applyStateRules: function (center) {
        var state = this._getState(center);

        if (state) {
            var ref = state.properties.all_tags.ref;

            if (['MV', 'NDS', 'SL', 'SN'].indexOf(ref) !== -1) {
                // Address
                this._setNogoCircle(center);
            } else if (ref === 'ST') {
                // admin_level 7 + 8 (Gemeinde oder Verbandsgemeinde)
                // Also select AL 8 (Gemeinde) as fallback where there is no AL 7.
                // AL 7 first, so we can always take first entry.
                this._getBoundary(center, 7, 8);
            } else if (ref === 'BB') {
                // admin_level 6 (Landkreis oder kreisfreie Stadt)
                this._getBoundary(center, 6);
            } else if (ref === 'HH' || state.properties.id === -62422) {
                // admin_level 4 - (Bundesländer und Stadtstaaten)
                // Hamburg and Berlin (AL 4) included in states file (Berlin ref missing)
                this._setBoundary(turf.featureCollection([state]));
            } else {
                console.error('unhandled state: ' + ref + ', id: ' + state.properties.id);
                this._getBoundary(center);
            }
        } else {
            // admin_level 8 (Gemeinde)
            this._getBoundary(center);
        }
    },

    _applyCountryRules: function (center) {
        var country = this._getCountry(center);

        if (country) {
            var name = country.properties.name;

            if (name === 'Germany') {
                this.radius = 15000;

                if (!this.states) {
                    this.marker.setIcon(this.iconSpinner);
                    this.once(
                        'states:loaded',
                        function () {
                            this.marker.setIcon(this.icon);
                            if (this.states) {
                                this._applyStateRules(center);
                            }
                        },
                        this
                    );
                    this._loadStates();
                } else {
                    this._applyStateRules(center);
                }
            } else if (name === 'Metropolitan France') {
                this.radius = 20000;
                this._setNogoCircle(center);
            } else {
                console.error('unhandled country: ' + name);
                this.radius = null;
            }
        } else {
            // NOOP, no rules implemented for this location
            this.radius = null;
        }
    },

    // debugging
    _logStates: function (states) {
        for (var i = 0; i < states.features.length; i++) {
            var state = states.features[i];
            console.log(
                state.properties.all_tags.ref + ', ' + state.properties.all_tags.name + ', ' + state.properties.id
            );
        }
    },

    // debugging
    _addGeoJsonLayer: function (states, options) {
        // delay, otherwise triggers premature hash update through mapmove
        setTimeout(
            L.bind(function () {
                L.geoJson(states, {
                    style: function (feature) {
                        return L.extend(
                            {
                                weight: 1,
                                color: 'navy',
                                opacity: 0.8,
                                fill: false,
                                interactive: false,
                            },
                            options
                        );
                    },
                }).addTo(this.map);
            }, this),
            100
        );
    },

    _loadStates: function () {
        if (this.statesLoading) return;

        this.statesLoading = true;
        BR.Util.getGeoJson(
            this.options.statesUrl,
            'states',
            L.bind(function (err, data) {
                if (!err) {
                    this.states = data;

                    // debugging
                    //this._logStates(this.states);
                    //this._addGeoJsonLayer(this.states);
                }

                this.statesLoading = false;
                this.fire('states:loaded');
            }, this)
        );
    },

    _loadCountries: function () {
        BR.Util.getJson(
            this.options.countriesUrl,
            'countries',
            L.bind(function (err, data) {
                if (err) return;

                var key = Object.keys(data.objects)[0];
                this.countries = topojson.feature(data, data.objects[key]);

                var union = topojson.merge(data, [data.objects[key]]);
                this.countriesMask = L.geoJson(union, {
                    renderer: this.maskRenderer,
                    // use Leaflet.snogylop plugin here, turf.mask too slow (~4s) for some reason
                    invert: true,
                    style: function (feature) {
                        return {
                            weight: 1,
                            color: 'darkgreen',
                            opacity: 0.8,
                            fillColor: '#020',
                            fillOpacity: 0.2,
                            className: 'circlego-outside',
                        };
                    },
                });
                this.countriesMask.on('click', L.DomEvent.stop);
                this.countriesMask.bindTooltip(i18next.t('map.not-applicable-here'), {
                    sticky: true,
                    offset: [10, 0],
                    direction: 'right',
                    opacity: 0.8,
                });

                this.fire('countries:loaded');
            }, this)
        );
    },

    _setNogo: function (ring) {
        this.nogoPolylines = L.geoJson(ring, BR.NogoAreas.prototype.polylineOptions);
        this.nogos.addNogos(null, this.nogoPolylines.getLayers(), null);
    },

    _removeNogo: function () {
        if (this.nogoPolylines) {
            this.nogos.removeNogos(null, this.nogoPolylines.getLayers(), null);
            this.nogoPolylines = null;
        }
    },

    _setNogoCircle: function (center) {
        var polygon = this.circleToPolygon(center, this.radius);
        this._setNogo(polygon);
        this.setOutsideArea(polygon);
    },

    setNogoRing: function (center) {
        this._clearLayers();
        this._removeNogo();

        if (center) {
            if (!this.countries) {
                // wait for countries to be loaded (when circlego hash parameter without polylines)
                this.marker.setIcon(this.iconSpinner);
                this.once(
                    'countries:loaded',
                    function () {
                        this.marker.setIcon(this.icon);
                        this._applyCountryRules(center);
                    },
                    this
                );
            } else {
                this._applyCountryRules(center);
            }
        }
    },

    _lockOutsideArea: function () {
        if (this.outsideArea) {
            this.outsideArea.eachLayer(function (layer) {
                layer._path.classList.add('circlego-outside');
            });
            this.outsideArea.on('click', L.DomEvent.stop);
        }
    },

    _unlockOutsideArea: function () {
        if (this.outsideArea) {
            this.outsideArea.eachLayer(function (layer) {
                layer._path.classList.remove('circlego-outside');
            });
            this.outsideArea.off('click', L.DomEvent.stop);
        }
    },

    setOutsideArea: function (ring) {
        var mask = turf.mask(turf.polygonize(ring));

        this.outsideArea = L.geoJson(mask, {
            renderer: this.maskRenderer,
            style: function (feature) {
                return {
                    weight: 4,
                    color: 'black',
                    opacity: 0.4,
                    fillColor: 'black',
                    fillOpacity: 0.4,
                };
            },
            smoothFactor: 0.5,
        }).addTo(this.map);

        this._lockOutsideArea();
    },

    onMapClick: function (e) {
        this.setCircle([e.latlng.lng, e.latlng.lat]);
    },

    setOptions: function (opts) {
        this.radius = opts.circlego[2];
        if (opts.polylines) {
            this.nogoPolylines = L.featureGroup(opts.polylines, BR.NogoAreas.prototype.polylineOptions);
        }
        this.setCircle([opts.circlego[0], opts.circlego[1]], opts.polylines);
    },

    setCircle: function (center, polylines) {
        var marker = (this.marker = this._createMarker(center));

        this.clear();
        marker.addTo(this.circleLayer);

        // prevent editing (when called by hash) until countries are loaded, see _loadCountries call in onAdd
        if (!this.countries) {
            marker.dragging.disable();
        }

        if (!polylines) {
            this.setNogoRing(center);
        } else {
            var features = [];
            for (var i = 0; i < polylines.length; i++) {
                features.push(polylines[i].toGeoJSON());
            }

            var ring = turf.featureCollection(features);
            this.setOutsideArea(ring);
        }
        this.draw(false);
    },

    _createMarker: function (center) {
        var self = this;
        var icon = (this.icon = L.VectorMarkers.icon({
            icon: 'home',
            markerColor: BR.conf.markerColors.circlego,
        }));
        this.iconSpinner = L.VectorMarkers.icon({
            icon: 'spinner',
            spin: true,
            markerColor: BR.conf.markerColors.circlego,
        });

        var popupContent =
            '<button id="remove-ringgo-marker" class="btn btn-secondary"><i class="fa fa-trash"></i></button>';

        var marker = L.marker([center[1], center[0]], {
            icon: icon,
            draggable: true,
            // prevent being on top of route markers
            zIndexOffset: -500,
        })
            .bindPopup(popupContent)
            .on('dragend', function (e) {
                self.setNogoRing([e.target.getLatLng().lng, e.target.getLatLng().lat]);
            })
            .on('click', function () {
                var drawing = self.drawButton.state() == 'deactivate-circlego';
                if (drawing) {
                    self.circleLayer.removeLayer(marker);
                    self.setNogoRing(undefined);
                }
            })
            .on(
                'popupopen',
                function (evt) {
                    this._onPopupOpen(evt.popup, popupContent);
                },
                this
            )
            .on('popupclose', this._onPopupClose, this);

        return marker;
    },

    _onPopupOpen: function (popup, popupContent) {
        var exportName = '';
        var html = '<p>';
        if (this.radius) {
            if (this.boundaryLayer) {
                var name = this.boundaryLayer.getLayers()[0].feature.properties.name;
                exportName += name + ' + ';
                html += BR.Util.sanitizeHTMLContent(name) + '<br />+ ';
            }
            var radiusText = (this.radius / 1000).toFixed();
            exportName += radiusText + ' km';
            html += radiusText + '&#8239;km';
            if (this.nogoPolylines) {
                html += '</p><p>';
                html +=
                    '<a id="ringgo-download-gpx" href="javascript:;" download="radius.gpx">' +
                    i18next.t('export.format_gpx') +
                    '</a>';
                html += '<br />';
                html +=
                    '<a id="ringgo-download-geojson" href="javascript:;" download="radius.geojson">' +
                    i18next.t('export.format_geojson') +
                    '</a>';
            }
        } else {
            html += i18next.t('map.not-applicable-here');
        }
        html += '</p>';
        popup.setContent(html + popupContent);

        if (this.nogoPolylines) {
            var link = location.href.replace(/&polylines=[^&]*/, '');
            var geoJson = this.nogoPolylines.toGeoJSON();
            var gpx = togpx(geoJson, { metadata: { name: exportName, link: link } });
            this._setDownloadUrl(gpx, 'application/gpx+xml', 'ringgo-download-gpx');
            this._setDownloadUrl(
                JSON.stringify(geoJson, null, 2),
                'application/vnd.geo+json',
                'ringgo-download-geojson'
            );
        }

        $('#remove-ringgo-marker').on(
            'click',
            L.bind(function (e) {
                e.preventDefault();
                this.circleLayer.removeLayer(this.marker);
                this.setNogoRing(undefined);
            }, this)
        );
    },

    _onPopupClose: function (evt) {
        this._revokeDownloadUrl('ringgo-download-gpx');
        this._revokeDownloadUrl('ringgo-download-geojson');
    },

    _setDownloadUrl: function (text, mimeType, elementId) {
        var blob = new Blob([text], {
            type: mimeType + ';charset=utf-8',
        });
        var objectUrl = URL.createObjectURL(blob);
        var download = document.getElementById(elementId);
        download.href = objectUrl;
    },

    _revokeDownloadUrl: function (elementId) {
        var download = document.getElementById(elementId);
        if (download) {
            URL.revokeObjectURL(download.href);
        }
    },

    _clearLayers: function () {
        if (this.outsideArea) {
            this.map.removeLayer(this.outsideArea);
            this.outsideArea = null;
        }
        if (this.boundaryLayer) {
            this.map.removeLayer(this.boundaryLayer);
            this.boundaryLayer = null;
        }
    },

    clear: function () {
        this.circleLayer.clearLayers();
        this._clearLayers();
    },

    getButton: function () {
        return this.drawButton;
    },

    getCircle: function () {
        var circle = this.circleLayer.getLayers().map(function (it) {
            return it.getLatLng();
        });
        if (circle && circle.length) {
            return [circle[0].lng.toFixed(6), circle[0].lat.toFixed(6), this.radius].join(',');
        } else {
            return null;
        }
    },

    toRadians: function (angleInDegrees) {
        return (angleInDegrees * Math.PI) / 180;
    },

    toDegrees: function (angleInRadians) {
        return (angleInRadians * 180) / Math.PI;
    },

    offset: function (c1, distance, bearing) {
        var lon1 = this.toRadians(c1[0]);
        var lat1 = this.toRadians(c1[1]);
        var dByR = distance / 6378137; // distance divided by 6378137 (radius of the earth) wgs84
        var lat = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing));
        var lon =
            lon1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
                Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat)
            );
        return [this.toDegrees(lon), this.toDegrees(lat)];
    },

    circleToPolygon: function (center, radius, numberOfSegments) {
        var n = numberOfSegments ? numberOfSegments : 64;

        var inner = [];
        for (var i = 0; i < n; ++i) {
            inner.push(this.offset(center, radius, (2 * Math.PI * -i) / n));
        }
        inner.push(inner[0]);

        /* hack: it seems there is a bug when using a single closed ring line,
         cf. https://github.com/nrenner/brouter-web/issues/349#issue-755514458
         so instead we use 2 half rings to ensure we properly close the area */
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: inner.slice(n / 2),
                    },
                },
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: inner.slice(0, n / 2 + 1),
                    },
                },
            ],
        };
    },
});

BR.CircleGoArea.include(L.Evented.prototype);

BR.circleGoArea = function (routing, nogos, pois) {
    return new BR.CircleGoArea(routing, nogos, pois);
};
