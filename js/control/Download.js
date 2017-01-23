BR.Download = L.Class.extend({
    update: function (urls) {
        if (urls) {
            ['gpx', 'kml', 'geojson', 'csv'].forEach(function(e, i, a) {
                var a = L.DomUtil.get('dl-'+e);
                a.setAttribute('href', urls[e]);
                a.setAttribute('download', 'brouter.'+e);
                a.removeAttribute('disabled');
            })
        }
    }
});

BR.download = function() {
    return new BR.Download();
};
