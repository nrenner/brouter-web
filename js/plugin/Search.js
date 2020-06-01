BR.Search = L.Control.Geocoder.extend({
    options: {
        geocoder: new L.Control.Geocoder.LatLng({
            next: new L.Control.Geocoder.Nominatim({
                serviceUrl: 'https://nominatim.openstreetmap.org/'
            }),
            sizeInMeters: 800
        }),
        position: 'topleft'
    },

    initialize: function(options) {
        L.Control.Geocoder.prototype.initialize.call(this, options);
        L.setOptions(this, {
            // i18next.t will only return 'undefined' if it is called in a static context
            // (e.g. when added directly to "options:" above), so we have to call it here
            placeholder: i18next.t('map.geocoder-placeholder')
        });
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
