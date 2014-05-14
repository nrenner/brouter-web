BR.Search = L.Control.Search.extend({
    options: {
        //url: 'http://nominatim.openstreetmap.org/search?format=json&q={s}',
        url: 'http://open.mapquestapi.com/nominatim/v1/search.php?format=json&q={s}',
        jsonpParam: 'json_callback',
        propertyName: 'display_name',
        propertyLoc: ['lat','lon'],
        markerLocation: false,
        circleLocation: false,
        autoType: false,
        autoCollapse: true,
        minLength: 2,
        zoom: 12
    },
 
    // patch: interferes with draw plugin (adds all layers twice to map?) 
    _onLayerAddRemove: function() {}
});
