BR.PoiMarkers = L.Control.extend({
    markersLayer: null,

    options: {
        routing: null,
        shortcut: {
            draw: {
                enable: 80, // char code for 'p'
                disable: 27 // char code for 'ESC'
            }
        }
    },

    onAdd: function(map) {
        var self = this;

        this.map = map;
        this.markersLayer = L.layerGroup([]).addTo(map);

        this.drawButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-poi',
                    icon: 'fa-hand-o-right',
                    onClick: function() {
                        self.draw(true);
                    },
                    title: i18next.t('keyboard.generic-shortcut', { action: '$t(map.draw-poi-start)', key: 'P' })
                },
                {
                    stateName: 'deactivate-poi',
                    icon: 'fa-hand-o-right active',
                    onClick: function() {
                        self.draw(false);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: '$t(map.draw-poi-stop)',
                        key: '$t(keyboard.escape)'
                    })
                }
            ]
        }).addTo(map);

        map.on('routing:draw-start', function() {
            self.draw(false);
        });

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        var container = new L.DomUtil.create('div');
        return container;
    },

    draw: function(enable) {
        this.drawButton.state(enable ? 'deactivate-poi' : 'activate-poi');
        if (enable) {
            this.options.routing.draw(false);
            this.map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this.map.getContainer(), 'pois-draw-enabled');
        } else {
            this.map.off('click', this.onMapClick, this);
            L.DomUtil.removeClass(this.map.getContainer(), 'pois-draw-enabled');
        }
    },

    _keydownListener: function(e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable) {
            this.draw(false);
        } else if (e.keyCode === this.options.shortcut.draw.enable) {
            this.draw(true);
        }
    },

    onMapClick: function(e) {
        var self = this;
        bootbox.prompt({
            title: i18next.t('map.enter-poi-name'),
            callback: function(result) {
                if (result !== null) {
                    self.addMarker(e.latlng, result);
                }
            }
        });
    },

    addMarker: function(latlng, name) {
        var icon = L.VectorMarkers.icon({
            icon: 'star',
            markerColor: BR.conf.markerColors.poi
        });

        var content = BR.Util.sanitizeHTMLContent(name) + '<br>';
        content += "<button id='remove-poi-marker' class='btn btn-secondary'><i class='fa fa-trash'></i></button>";

        var self = this;
        var marker = L.marker(latlng, { icon: icon, draggable: true, name: name })
            .bindPopup(content)
            .on('dragend', function() {
                self.fire('update');
            })
            .on('popupopen', function() {
                $('#remove-poi-marker').on('click', function(e) {
                    self.markersLayer.removeLayer(marker);
                    e.preventDefault();
                    self.fire('update');
                });
            })
            .addTo(this.markersLayer);
    },

    clear: function() {
        this.markersLayer.clearLayers();
    },

    setMarkers: function(latLngNames) {
        this.clear();

        if (!latLngNames) return;

        for (var i = 0; i < latLngNames.length; i++) {
            var r = latLngNames[i];
            this.addMarker(r.latlng, r.name);
        }
    },

    getMarkers: function() {
        return this.markersLayer.getLayers().map(function(it) {
            return {
                latlng: it._latlng,
                name: it.options.name
            };
        });
    }
});

BR.PoiMarkers.include(L.Evented.prototype);
