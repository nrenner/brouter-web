BR.PoiMarkers = L.Control.extend({
    markersLayer: null,
    circlego: null,

    options: {
        shortcut: {
            draw: {
                enable: 80, // char code for 'p'
                disable: 27, // char code for 'ESC'
            },
        },
    },
    initialize(routing) {
        this.routing = routing;
        this.circlego = null;
    },

    onAdd(map) {
        var self = this;

        this.map = map;
        this.markersLayer = L.layerGroup([]).addTo(map);

        this.drawButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-poi',
                    icon: 'fa-hand-o-right',
                    onClick() {
                        self.draw(true);
                    },
                    title: i18next.t('keyboard.generic-shortcut', { action: '$t(map.draw-poi-start)', key: 'P' }),
                },
                {
                    stateName: 'deactivate-poi',
                    icon: 'fa-hand-o-right active',
                    onClick() {
                        self.draw(false);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: '$t(map.draw-poi-stop)',
                        key: '$t(keyboard.escape)',
                    }),
                },
            ],
        }).addTo(map);

        map.on('routing:draw-start', function () {
            self.draw(false);
        });

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        var container = new L.DomUtil.create('div');
        return container;
    },

    draw(enable) {
        this.drawButton.state(enable ? 'deactivate-poi' : 'activate-poi');
        if (enable) {
            this.routing.draw(false);
            if (this.circlego) this.circlego.draw(false);
            this.map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this.map.getContainer(), 'pois-draw-enabled');
        } else {
            this.map.off('click', this.onMapClick, this);
            L.DomUtil.removeClass(this.map.getContainer(), 'pois-draw-enabled');
        }
    },

    _keydownListener(e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable) {
            this.draw(false);
        } else if (e.keyCode === this.options.shortcut.draw.enable) {
            this.draw(true);
        }
    },

    onMapClick(e) {
        var self = this;
        bootbox.prompt({
            title: i18next.t('map.enter-poi-name'),
            // allow empty name with client-side formatting
            required: !BR.Browser.download,
            callback(result) {
                if (result !== null) {
                    self.addMarker(e.latlng, result);
                }
            },
        });
    },

    addMarker(latlng, name) {
        var icon = L.VectorMarkers.icon({
            icon: 'star',
            markerColor: BR.conf.markerColors.poi,
        });

        var content = BR.Util.sanitizeHTMLContent(name);
        var contentWithAction =
            '<p>' +
            content +
            '</p>' +
            '<p><button id="remove-poi-marker" class="btn btn-secondary"><i class="fa fa-trash"></i></button></p>';

        var self = this;
        var marker = L.marker(latlng, { icon, draggable: true, name })
            .bindPopup(contentWithAction)
            .on('dragend', function () {
                self.fire('update');
            })
            .on('popupopen', function () {
                this.unbindTooltip();
                $('#remove-poi-marker').on('click', function (e) {
                    self.markersLayer.removeLayer(marker);
                    e.preventDefault();
                    self.fire('update');
                });
            })
            .on('popupclose', function () {
                if (false === BR.Browser.touch) {
                    this.bindTooltip(content);
                }
            })
            .addTo(this.markersLayer);

        if (false === BR.Browser.touch) {
            marker.bindTooltip(content);
        }
    },

    clear() {
        this.markersLayer.clearLayers();
    },

    setMarkers(latLngNames) {
        this.clear();

        if (!latLngNames) return;

        for (var i = 0; i < latLngNames.length; i++) {
            var r = latLngNames[i];
            this.addMarker(r.latlng, r.name);
        }
    },

    getMarkers() {
        return this.markersLayer.getLayers().map(function (it) {
            return {
                latlng: it.getLatLng(),
                name: it.options.name,
            };
        });
    },
});

BR.PoiMarkers.include(L.Evented.prototype);
