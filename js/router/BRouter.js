
BR.HOST = 'http://localhost:17777';

L.BRouter = L.Class.extend({
    statics: {
        // /brouter?lonlats=1.1,1.2|2.1,2.2|3.1,3.2|4.1,4.2&nogos=-1.1,-1.2,1|-2.1,-2.2,2&profile=shortest&alternativeidx=1&format=kml
        URL_TEMPLATE: BR.HOST + '/brouter?lonlats={lonlats}&nogos={nogos}&profile={profile}&alternativeidx={alternativeidx}&format={format}',
        URL_PROFILE_UPLOAD: BR.HOST + '/brouter/profile',
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

    getUrlParams: function(latLngs, format) {
        return {
            lonlats: this._getLonLatsString(latLngs),
            nogos: this._getNogosString(this.options.nogos),
            profile: this.options.profile,
            alternativeidx: this.options.alternative,
            format: format || this.options.format
        };
    },

    parseUrlParams: function(params) {
        var opts = {};
        if (params.lonlats) {
            opts.lonlats = this._parseLonLats(params.lonlats);
        }
        if (params.nogos) {
            opts.nogos = this._parseNogos(params.nogos);
        }
        if (params.alternativeidx) {
            opts.alternative = params.alternativeidx;
        }
        if (params.profile) {
            opts.profile = params.profile;
        }
        if (params.format) {
            opts.format = params.format;
        }
        return opts;
    },

    getUrl: function(latLngs, format) {
        var urlParams = this.getUrlParams(latLngs, format);
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

    uploadProfile: function(profileId, profileText, cb) {
        var url = L.BRouter.URL_PROFILE_UPLOAD;
            xhr = new XMLHttpRequest();

        // reuse existing profile file
        if (profileId) {
            url += '/' + profileId;
        }

        xhr.open('POST', url, true);
        xhr.onload = L.bind(this._handleProfileResponse, this, xhr, cb);

        // send profile text only, as text/plain;charset=UTF-8
        xhr.send(profileText);
    },

    _handleProfileResponse: function(xhr, cb) {
        var profile;

        if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 0) {
            // e.g. profileid=1400498280259
            profile = xhr.responseText.split('=')[1];

            cb(profile);
        }
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

    _parseLonLats: function(s) {
        var groups,
            numbers,
            lonlats = [];

        if (!s) {
            return lonlats;
        }

        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            // lng,lat
            numbers = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            lonlats.push(L.latLng(numbers[1], numbers[0]));
        }

        return lonlats;
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

    _parseNogos: function(s) {
        var groups,
            numbers,
            nogos = [];

        if (!s) {
            return nogos;
        }
        
        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            // lng,lat,radius
            numbers = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            // TODO refactor: pass simple obj, create circle in NogoAreas; use shapeOptions of instance
            // [lat,lng],radius
            nogos.push(L.circle([numbers[1], numbers[0]], numbers[2], L.Draw.Circle.prototype.options.shapeOptions));
        }

        return nogos;
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