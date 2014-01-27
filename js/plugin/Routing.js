BR.Routing = L.Routing.extend({
    options: {
        /* not implemented yet
        icons: {
            start: new L.Icon.Default({iconUrl: 'bower_components/leaflet-gpx/pin-icon-start.png'}),
            end: new L.Icon.Default(),
            normal: new L.Icon.Default()
        },*/
        snapping: null
    },

    onAdd: function (map) {
        var container = L.Routing.prototype.onAdd.call(this, map);

        // enable drawing mode
        this.draw(true);
        
        return container;
    }
});
