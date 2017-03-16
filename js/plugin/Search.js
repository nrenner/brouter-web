BR.Search = L.Control.Geocoder.extend({
    options: {
        geocoder: new L.Control.Geocoder.Nominatim({
            serviceUrl: 'https://nominatim.openstreetmap.org/'
        }),
        position: 'topleft'
    },

    onAdd: function (map) {
        map.attributionControl.addAttribution(
            'search by <a href="http://wiki.openstreetmap.org/wiki/Nominatim" target="_blank">Nominatim</a>');

        return L.Control.Geocoder.prototype.onAdd.call(this, map);
    },

    markGeocode: function(result) {
        this._map.fitBounds(result.geocode.bbox, {
            maxZoom: 17
        });

        this.clear();
        this._geocodeMarker = new L.CircleMarker(result.geocode.center, {
            interactive: false,
            color: 'red',
            opacity: 1,
            weight: 3
        }).addTo(this._map);

        return this;
    },

    clear: function() {
        if (this._geocodeMarker) {
            this._map.removeLayer(this._geocodeMarker);
        }
    }
});
