L.BRouter = L.Class.extend({
    statics: {
        // http://localhost:17777/brouter?lonlats=1.1,1.2|2.1,2.2|3.1,3.2|4.1,4.2&nogos=-1.1,-1.2,1|-2.1,-2.2,2&profile=shortest&alternativeidx=1&format=kml
        URL_TEMPLATE: 'http://localhost:17777/brouter?lonlats={lonlats}&nogos={nogos}&profile={profile}&alternativeidx={alternativeidx}&format={format}',
        PRECISION: 6,
        NUMBER_SEPARATOR: ',',
        GROUP_SEPARATOR: '|'
    },
    
    options: {
        format: 'gpx'
    },

    initialize: function (options) {
        L.setOptions(this, options);
    },

    setOptions: function(options) {
        L.setOptions(this, options);
    },

    getUrl: function(latLngs, format) {
        var urlParams = {
            lonlats: this._getLonLatsString(latLngs),
            nogos: this._getNogosString(this.options.nogos),
            profile: this.options.profile,
            alternativeidx: this.options.alternative,
            format: format || this.options.format
        };
        var url = L.Util.template(L.BRouter.URL_TEMPLATE, urlParams);
        return url;
    },

    getRoute: function(latLngs, cb) {
        var url = this.getUrl(latLngs);
        if (!url) {
            return cb(new Error('Error getting route URL'));
        }

        var gpxLayer = new L.GPX(url, {
            async: true,
            polyline_options: {
                opacity: 0.6
            },
            marker_options: {
                startIconUrl: null,
                endIconUrl: null
            }
        }).on('loaded', function(e) {
            // leaflet.spin
            gpxLayer.fire('data:loaded');
            var gpx = e.target;
           
            return cb(null, gpx.getLayers()[0]);
        })/* TODO no error handling in leaflet-gpx
          .on('error', function(e){
            console.error('error');
            gpxLayer.fire('data:loaded');
            return cb(new Error('Routing failed'));
        })*/;
    },

    getRouteSegment: function(l1, l2, cb) {
        return this.getRoute([l1, l2], cb);
    },

    _getLonLatsString: function(latLngs) {
        var s = '';
        for (var i = 0; i < latLngs.length; i++) {
            s += this._formatLatLng(latLngs[i]);
            if (i < (latLngs.length - 1)) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },
    
    _getNogosString: function(nogos) {
        var s = '';
        for (var i = 0, circle; i < nogos.length; i++) {
            circle = nogos[i];
            s += this._formatLatLng(circle.getLatLng());
            s += L.BRouter.NUMBER_SEPARATOR;
            s += Math.round(circle.getRadius());
            if (i < (nogos.length - 1)) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    // formats L.LatLng object as lng,lat string
    _formatLatLng: function(latLng) {
        var s = '';
        s += L.Util.formatNum(latLng.lng, L.BRouter.PRECISION);
        s += L.BRouter.NUMBER_SEPARATOR;
        s += L.Util.formatNum(latLng.lat, L.BRouter.PRECISION);
        return s;
    }
});

L.bRouter = function (options) {
    return new L.BRouter(options);
};