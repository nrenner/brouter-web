/*
 * Leaflet Routing Storage
 *
 * Storing routable objects
 * 
 * @dependencies L, L.Routing
 *
 * @usage new L.Routing(options);
*/

(function () {
  L.Routing.Storage = L.MultiPolyline.extend({
    /**
     * Class constructor
    */
    initialize: function (latlngs, options) {
      this._layers = {};
      this._options = options;
      this.setLatLngs(latlngs);
      
      this.on('layeradd', function() {
        console.log('layeradd', arguments);
      }, this);
    }
  });
  	  
  L.Routing.storage = function (latlngs, options) {
    return new L.MultiPolyline(latlngs, options);
  };
  
}());
