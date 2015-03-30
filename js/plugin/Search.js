BR.Search = L.Control.Geocoder.extend({
    options: {
        geocoder: new L.Control.Geocoder.Nominatim({
            serviceUrl: 'https://open.mapquestapi.com/nominatim/v1/'
        }),
        position: 'topleft'
    },

		onAdd: function (map) {
        map.attributionControl.addAttribution('Nominatim Search Courtesy of '
            + '<a href="http://www.mapquest.com/" target="_blank">MapQuest</a>'
            + ' <img src="http://developer.mapquest.com/content/osm/mq_logo.png">');

        return L.Control.Geocoder.prototype.onAdd.call(this, map);
    },

    markGeocode: function(result) {
        this._map.fitBounds(result.bbox, {
            maxZoom: 17
        });

        this.clear();
        this._geocodeMarker = new L.CircleMarker(result.center, {
            clickable: false,
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
