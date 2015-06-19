L.BRouter = L.Class.extend({
    statics: {
        // NOTE: the routing API used here is not public!
        // /brouter?lonlats=1.1,1.2|2.1,2.2|3.1,3.2|4.1,4.2&nogos=-1.1,-1.2,1|-2.1,-2.2,2&profile=shortest&alternativeidx=1&format=kml
        URL_TEMPLATE: BR.conf.host + '/brouter?lonlats={lonlats}&nogos={nogos}&profile={profile}&alternativeidx={alternativeidx}&format={format}',
        URL_PROFILE_UPLOAD: BR.conf.host + '/brouter/profile',
        PRECISION: 6,
        NUMBER_SEPARATOR: ',',
        GROUP_SEPARATOR: '|',
        ABORTED_ERROR: 'aborted'
    },
    
    options: {
    },

    format: 'geojson',

    initialize: function (options) {
        L.setOptions(this, options);

        this.queue = async.queue(L.bind(function (task, callback) {
            this.getRoute(task.segment, callback);
        }, this), 1);

        // patch to call callbacks on kill for cleanup (loadingTrailer)
        this.queue.kill = function () {
            var aborted = this.tasks;
            this.drain = null;
            this.tasks = [];
            aborted.forEach(function(task) {
                task.callback(L.BRouter.ABORTED_ERROR);
            });
        };
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
            format: format || this.format
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
        return opts;
    },

    getUrl: function(latLngs, format) {
        var urlParams = this.getUrlParams(latLngs, format);
        var url = L.Util.template(L.BRouter.URL_TEMPLATE, urlParams);
        return url;
    },

    getRoute: function(latLngs, cb) {
        var url = this.getUrl(latLngs),
            xhr = new XMLHttpRequest();

        if (!url) {
            return cb(new Error('Error getting route URL'));
        }

        xhr.open('GET', url, true);
        xhr.onload = L.bind(this._handleRouteResponse, this, xhr, cb);
        xhr.onerror = L.bind(function(xhr, cb) {
            cb(BR.Util.getError(xhr));
        }, this, xhr, cb);
        xhr.send();
    },

    _handleRouteResponse: function(xhr, cb) {
        var layer,
            geojson;

        if (xhr.status === 200
                && xhr.responseText
                // application error when not GeoJSON format (text/plain for errors)
                && xhr.getResponseHeader('Content-Type').split(';')[0] === 'application/vnd.geo+json') {

            // leaflet.spin
            //gpxLayer.fire('data:loaded');

            geojson = JSON.parse(xhr.responseText);
            layer = L.geoJson(geojson).getLayers()[0];

            return cb(null, layer);
        } else {
            cb(BR.Util.getError(xhr));
        }
    },

    getRouteSegment: function(l1, l2, cb) {
        this.queue.push({ segment: [l1, l2] }, cb);
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
        xhr.onerror = function(evt) {
            var xhr = this;
            cb('Upload error: ' + xhr.statusText);
        };

        // send profile text only, as text/plain;charset=UTF-8
        xhr.send(profileText);
    },

    _handleProfileResponse: function(xhr, cb) {
        var response;

        if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 0) {
            response = JSON.parse(xhr.responseText);
            cb(response.error, response.profileid);
        } else {
            cb('Profile error: no or empty response from server');
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