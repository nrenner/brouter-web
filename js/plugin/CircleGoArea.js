BR.CircleGoArea = L.Control.extend({
    circleLayer: null,

    options: {
        radius: 1000, // in meters
        shortcut: {
            draw: {
                enable: 73, // char code for 'i'
                disable: 27 // char code for 'ESC'
            }
        }
    },
    initialize: function(routing, nogos, pois) {
        this.routing = routing;
        this.nogos = nogos;
        this.pois = pois;
    },

    onAdd: function(map) {
        var self = this;

        this.map = map;
        this.circleLayer = L.layerGroup([]).addTo(map);

        var radiusKm = (this.options.radius / 1000).toFixed();
        this.drawButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-circlego',
                    icon: 'fa-circle-o',
                    onClick: function() {
                        self.draw(true);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-start', { radius: radiusKm }),
                        key: 'I'
                    })
                },
                {
                    stateName: 'deactivate-circlego',
                    icon: 'fa-circle-o active',
                    onClick: function() {
                        self.draw(false);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-stop', { radius: radiusKm }),
                        key: '$t(keyboard.escape)'
                    })
                }
            ]
        });

        map.on('routing:draw-start', function() {
            self.draw(false);
        });

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        var container = new L.DomUtil.create('div');
        return container;
    },

    draw: function(enable) {
        this.drawButton.state(enable ? 'deactivate-circlego' : 'activate-circlego');
        if (enable) {
            this.routing.draw(false);
            this.pois.draw(false);
            this.map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this.map.getContainer(), 'circlego-draw-enabled');
        } else {
            this.map.off('click', this.onMapClick, this);
            L.DomUtil.removeClass(this.map.getContainer(), 'circlego-draw-enabled');
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

    setNogoCircle: function(center) {
        if (center) {
            var polygon = this.circleToPolygon(center, this.options.radius);
            $('#nogoJSON').val(JSON.stringify(polygon));
            this.nogos.uploadNogos();
        } else {
            this.nogos.clear();
        }
    },

    onMapClick: function(e) {
        this.setCircle([e.latlng.lng, e.latlng.lat]);
    },

    setCircle: function(center) {
        var self = this;
        var icon = L.VectorMarkers.icon({
            icon: 'home',
            markerColor: BR.conf.markerColors.circlego
        });
        var marker = L.marker([center[1], center[0]], { icon: icon, draggable: true, name: name })
            .on('dragend', function(e) {
                self.setNogoCircle([e.target.getLatLng().lng, e.target.getLatLng().lat]);
            })
            .on('click', function() {
                var drawing = self.drawButton.state() == 'deactivate-circlego';
                if (drawing) {
                    self.circleLayer.removeLayer(marker);
                    self.setNogoCircle(undefined);
                }
            });

        this.clear();
        marker.addTo(this.circleLayer);
        this.setNogoCircle(center);
        this.draw(false);
    },

    clear: function() {
        this.circleLayer.clearLayers();
    },

    getButton: function() {
        return this.drawButton;
    },

    getCircle: function() {
        var circle = this.circleLayer.getLayers().map(function(it) {
            return it.getLatLng();
        });
        if (circle && circle.length) {
            return [circle[0].lng.toFixed(6), circle[0].lat.toFixed(6), this.options.radius].join(',');
        } else {
            return null;
        }
    },

    toRadians: function(angleInDegrees) {
        return (angleInDegrees * Math.PI) / 180;
    },

    toDegrees: function(angleInRadians) {
        return (angleInRadians * 180) / Math.PI;
    },

    offset: function(c1, distance, bearing) {
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

    circleToPolygon: function(center, radius, numberOfSegments) {
        var n = numberOfSegments ? numberOfSegments : 64;

        var inner = [];
        for (var i = 0; i < n; ++i) {
            inner.push(this.offset(center, radius, (2 * Math.PI * -i) / n));
        }
        inner.push(inner[0]);

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: inner
                    }
                }
            ]
        };
    }
});

BR.CircleGoArea.include(L.Evented.prototype);
