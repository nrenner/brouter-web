BR.Routing = L.Routing.extend({
    options: {
        icons: {
            /* not implemented yet
            start: new L.Icon.Default({iconUrl: 'bower_components/leaflet-gpx/pin-icon-start.png'}),
            end: new L.Icon.Default(),
            normal: new L.Icon.Default()
            */
            draw: false
        },
        snapping: null
    },

    onAdd: function (map) {
        var container = L.Routing.prototype.onAdd.call(this, map);

        this._draw.on('enabled', function() {
            L.DomUtil.addClass(map.getContainer(), 'routing-draw-enabled');
        });
        this._draw.on('disabled', function() {
            L.DomUtil.removeClass(map.getContainer(), 'routing-draw-enabled');
        });

        // enable drawing mode
        this.draw(true);
        
        return container;
    }
});
