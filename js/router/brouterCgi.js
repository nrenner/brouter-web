// BRouter online demo interface
// TODO remove or adopt to new structure (only supports two waypoints!)
var brouterCgi = (function() {
    // http://brouter.de/cgi-bin/brouter.sh?coords=13.404681_52.520185_13.340278_52.512356_trekking_0
    //var URL_TEMPLATE = '/cgi-bin/proxy.cgi?url=' + 'http://brouter.de/cgi-bin/brouter.sh?coords={fromLng}_{fromLat}_{toLng}_{toLat}_{profile}_{alt}';
    var URL_TEMPLATE =
        '/proxy.php?url=' + 'cgi-bin/brouter.sh?coords={fromLng}_{fromLat}_{toLng}_{toLat}_{profile}_{alt}';
    var PRECISION = 6;

    function getUrl(polyline) {
        var latLngs = polyline.getLatLngs();
        var urlParams = {
            fromLat: L.Util.formatNum(latLngs[0].lat, PRECISION),
            fromLng: L.Util.formatNum(latLngs[0].lng, PRECISION),
            toLat: L.Util.formatNum(latLngs[1].lat, PRECISION),
            toLng: L.Util.formatNum(latLngs[1].lng, PRECISION),
            profile: 'trekking',
            alt: '0'
        };
        var url = L.Util.template(URL_TEMPLATE, urlParams);
        //console.log(url);
        //return 'test/test.gpx';
        return url;
    }

    return {
        getUrl: getUrl
    };
})();
