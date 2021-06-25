L.BRouter = L.Class.extend({
    statics: {
        // NOTE: the routing API used here is not public!
        // /brouter?lonlats=1.1,1.2|2.1,2.2|3.1,3.2|4.1,4.2&nogos=-1.1,-1.2,1|-2.1,-2.2,2&profile=shortest&alternativeidx=1&format=kml
        URL_TEMPLATE:
            '/brouter?lonlats={lonlats}&profile={profile}&alternativeidx={alternativeidx}&format={format}&nogos={nogos}&polylines={polylines}&polygons={polygons}',
        URL_PROFILE_UPLOAD: BR.conf.host + '/brouter/profile',
        PRECISION: 6,
        NUMBER_SEPARATOR: ',',
        GROUP_SEPARATOR: '|',
        ABORTED_ERROR: 'aborted',
        CUSTOM_PREFIX: 'custom_',
        isCustomProfile: function (profileName) {
            return profileName && profileName.substring(0, 7) === L.BRouter.CUSTOM_PREFIX;
        },
    },

    options: {},

    initialize: function (options) {
        L.setOptions(this, options);

        this.queue = async.queue(
            L.bind(function (task, callback) {
                this.getRoute(task.segment, callback);
            }, this),
            1
        );

        // patch to call callbacks on kill for cleanup (loadingTrailer)
        this.queue.kill = function () {
            var aborted = this.tasks;
            this.drain = null;
            this.tasks = [];
            aborted.forEach(function (task) {
                task.callback(L.BRouter.ABORTED_ERROR);
            });
        };
    },

    setOptions: function (options) {
        L.setOptions(this, options);
    },

    getUrlParams: function (latLngs, beelineFlags, pois, circlego, format) {
        params = {};
        if (this._getLonLatsString(latLngs) != null) params.lonlats = this._getLonLatsString(latLngs);

        if (beelineFlags && beelineFlags.length > 0) {
            const beelineString = this._getBeelineString(beelineFlags);
            if (beelineString.length > 0) params.straight = beelineString;
        }

        if (this.options.nogos && this._getNogosString(this.options.nogos).length > 0)
            params.nogos = this._getNogosString(this.options.nogos);

        if (this.options.polylines && this._getNogosPolylinesString(this.options.polylines).length > 0)
            params.polylines = this._getNogosPolylinesString(this.options.polylines);

        if (this.options.polygons && this._getNogosPolygonsString(this.options.polygons).length > 0)
            params.polygons = this._getNogosPolygonsString(this.options.polygons);

        if (this.options.profile != null) params.profile = this.options.profile;

        if (pois && this._getLonLatsNameString(pois) != null) params.pois = this._getLonLatsNameString(pois);

        if (circlego) params.circlego = circlego;

        params.alternativeidx = this.options.alternative;

        if (format != null) {
            params.format = format;
        } else {
            // do not put values in URL if this is the default value (format===null)
            if (params.profile === BR.conf.profiles[0]) delete params.profile;
            if (params.alternativeidx == 0) delete params.alternativeidx;

            // don't add custom profile, as these are only stored temporarily
            if (params.profile && L.BRouter.isCustomProfile(params.profile)) {
                delete params.profile;
            }
        }

        return params;
    },

    parseUrlParams: function (params) {
        var opts = {};
        if (params.lonlats) {
            opts.lonlats = this._parseLonLats(params.lonlats);
        }
        if (params.straight) {
            opts.beelineFlags = this._parseBeelines(params.straight, opts.lonlats);
        }
        if (params.nogos) {
            opts.nogos = this._parseNogos(params.nogos);
        }
        if (params.polylines) {
            opts.polylines = this._parseNogosPolylines(params.polylines);
        }
        if (params.polygons) {
            opts.polygons = this._parseNogosPolygons(params.polygons);
        }
        if (params.alternativeidx) {
            opts.alternative = params.alternativeidx;
        }
        if (params.profile) {
            opts.profile = params.profile;
        }
        if (params.pois) {
            opts.pois = this._parseLonLatNames(params.pois);
        }
        if (params.ringgo || params.circlego) {
            var paramRinggo = params.ringgo || params.circlego;
            var circlego = paramRinggo.split(',');
            if (circlego.length == 3) {
                circlego = [
                    Number.parseFloat(circlego[0]),
                    Number.parseFloat(circlego[1]),
                    Number.parseInt(circlego[2]),
                ];
                opts.circlego = circlego;
            }
        }
        return opts;
    },

    getUrl: function (latLngs, beelineFlags, pois, circlego, format, trackname, exportWaypoints) {
        var urlParams = this.getUrlParams(latLngs, beelineFlags, pois, circlego, format);
        var args = [];
        if (urlParams.lonlats != null && urlParams.lonlats.length > 0)
            args.push(L.Util.template('lonlats={lonlats}', urlParams));
        if (urlParams.straight != null) args.push(L.Util.template('straight={straight}', urlParams));
        if (urlParams.pois != null && urlParams.pois.length > 0) args.push(L.Util.template('pois={pois}', urlParams));
        if (urlParams.circlego != null) args.push(L.Util.template('ringgo={circlego}', urlParams));
        if (urlParams.nogos != null) args.push(L.Util.template('nogos={nogos}', urlParams));
        if (urlParams.polylines != null) args.push(L.Util.template('polylines={polylines}', urlParams));
        if (urlParams.polygons != null) args.push(L.Util.template('polygons={polygons}', urlParams));
        if (urlParams.profile != null) args.push(L.Util.template('profile={profile}', urlParams));
        if (urlParams.alternativeidx != null) args.push(L.Util.template('alternativeidx={alternativeidx}', urlParams));
        if (urlParams.format != null) args.push(L.Util.template('format={format}', urlParams));
        if (trackname)
            args.push(
                L.Util.template('trackname={trackname}', {
                    trackname: trackname,
                })
            );
        if (exportWaypoints) args.push('exportWaypoints=1');

        var prepend_host = format != null;

        return (prepend_host ? BR.conf.host : '') + '/brouter?' + args.join('&');
    },

    getRoute: function (latLngs, cb) {
        var url = this.getUrl(latLngs, null, null, null, 'geojson'),
            xhr = new XMLHttpRequest();

        if (!url) {
            return cb(new Error(i18next.t('warning.cannot-get-route')));
        }

        xhr.open('GET', url, true);
        xhr.onload = L.bind(this._handleRouteResponse, this, xhr, cb);
        xhr.onerror = L.bind(
            function (xhr, cb) {
                cb(BR.Util.getError(xhr));
            },
            this,
            xhr,
            cb
        );
        xhr.send();
    },

    _handleRouteResponse: function (xhr, cb) {
        var layer, geojson;

        if (
            xhr.status === 200 &&
            xhr.responseText &&
            // application error when not GeoJSON format (text/plain for errors)
            xhr.getResponseHeader('Content-Type').split(';')[0] === 'application/vnd.geo+json'
        ) {
            // leaflet.spin
            //gpxLayer.fire('data:loaded');

            try {
                geojson = JSON.parse(xhr.responseText);
                layer = this._assignFeatures(L.geoJSON(geojson).getLayers()[0]);

                return cb(null, layer);
            } catch (e) {
                console.error(e, xhr.responseText);
                return cb(e);
            }
        } else {
            cb(BR.Util.getError(xhr));
        }
    },

    getRouteSegment: function (l1, l2, cb) {
        this.queue.push({ segment: [l1, l2] }, cb);
    },

    uploadProfile: function (profileId, profileText, cb) {
        var url = L.BRouter.URL_PROFILE_UPLOAD;
        xhr = new XMLHttpRequest();

        // reuse existing profile file
        if (profileId) {
            url += '/' + profileId;
        }

        xhr.open('POST', url, true);
        xhr.onload = L.bind(this._handleProfileResponse, this, xhr, cb);
        xhr.onerror = function (evt) {
            var xhr = this;
            cb(i18next.t('warning.upload-error', { error: xhr.statusText }));
        };

        // send profile text only, as text/plain;charset=UTF-8
        xhr.send(profileText);
    },

    _assignFeatures: function (segment) {
        if (segment.feature.properties.messages) {
            var featureMessages = segment.feature.properties.messages,
                segmentLatLngs = segment.getLatLngs(),
                segmentLength = segmentLatLngs.length;
            var featureSegmentIndex = 0;

            for (var mi = 1; mi < featureMessages.length; mi++) {
                var featureLatLng = this._getFeatureLatLng(featureMessages[mi]);

                for (var fi = featureSegmentIndex; fi < segmentLength; fi++) {
                    var segmentLatLng = segmentLatLngs[fi],
                        featureMessage = featureMessages[mi];

                    segmentLatLng.feature = BR.TrackEdges.getFeature(featureMessage);
                    segmentLatLng.message = featureMessage;

                    if (featureLatLng.equals(segmentLatLngs[fi])) {
                        featureSegmentIndex = fi + 1;
                        break;
                    }
                }
            }
        }
        return segment;
    },

    _getFeatureLatLng: function (message) {
        var lon = message[0] / 1000000,
            lat = message[1] / 1000000;

        return L.latLng(lat, lon);
    },

    _handleProfileResponse: function (xhr, cb) {
        var response;

        if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 0) {
            response = JSON.parse(xhr.responseText);
            cb(response.error, response.profileid);
        } else {
            cb(i18next.t('warning.profile-error'));
        }
    },

    _getLonLatsString: function (latLngs) {
        var s = '';
        for (var i = 0; i < latLngs.length; i++) {
            s += this._formatLatLng(latLngs[i]);
            if (i < latLngs.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseLonLats: function (s) {
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

    _getBeelineString: function (beelineFlags) {
        var indexes = [];
        for (var i = 0; i < beelineFlags.length; i++) {
            if (beelineFlags[i]) {
                indexes.push(i);
            }
        }
        return indexes.join(',');
    },

    _parseBeelines: function (s, lonlats) {
        if (!lonlats || lonlats.length < 2) return [];

        const beelineFlags = new Array(lonlats.length - 1);
        beelineFlags.fill(false);
        for (const i of s.split(',')) {
            beelineFlags[i] = true;
        }
        return beelineFlags;
    },

    _getLonLatsNameString: function (latLngNames) {
        var s = '';
        for (var i = 0; i < latLngNames.length; i++) {
            s += this._formatLatLng(latLngNames[i].latlng);
            s += L.BRouter.NUMBER_SEPARATOR;
            s += encodeURIComponent(latLngNames[i].name);

            if (i < latLngNames.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseLonLatNames: function (s) {
        var groups,
            part,
            lonlatnames = [];

        if (!s) {
            return lonlatnames;
        }

        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            // lng,lat,name
            part = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            lonlatnames.push({ latlng: L.latLng(part[1], part[0]), name: decodeURIComponent(part[2]) });
        }

        return lonlatnames;
    },

    _getNogosString: function (nogos) {
        var s = '';
        for (var i = 0, circle; i < nogos.length; i++) {
            circle = nogos[i];
            s += this._formatLatLng(circle.getLatLng());
            s += L.BRouter.NUMBER_SEPARATOR;
            s += Math.round(circle.getRadius());
            // -1 is default nogo exclusion, it should not be passed as a URL parameter.
            if (
                circle.options.nogoWeight !== undefined &&
                circle.options.nogoWeight !== null &&
                circle.options.nogoWeight !== -1
            ) {
                s += L.BRouter.NUMBER_SEPARATOR;
                s += circle.options.nogoWeight;
            }
            if (i < nogos.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseNogos: function (s) {
        var groups,
            numbers,
            nogos = [];

        if (!s) {
            return nogos;
        }

        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            // lng,lat,radius(,weight)
            numbers = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            // TODO refactor: pass simple obj, create circle in NogoAreas; use shapeOptions of instance
            // [lat,lng],radius
            // Parse as a nogo circle
            var nogoOptions = { radius: numbers[2] };
            if (numbers.length > 3) {
                nogoOptions.nogoWeight = numbers[3];
            }
            nogos.push(L.circle([numbers[1], numbers[0]], nogoOptions));
        }

        return nogos;
    },

    _getNogosPolylinesString: function (nogos) {
        var s = '';
        for (var i = 0, polyline, vertices; i < nogos.length; i++) {
            polyline = nogos[i];
            vertices = polyline.getLatLngs();
            for (var j = 0; j < vertices.length; j++) {
                if (j > 0) {
                    s += L.BRouter.NUMBER_SEPARATOR;
                }
                s += this._formatLatLng(vertices[j]);
            }
            // -1 is default nogo exclusion, it should not be passed as a URL parameter.
            if (
                polyline.options.nogoWeight !== undefined &&
                polyline.options.nogoWeight !== null &&
                polyline.options.nogoWeight !== -1
            ) {
                s += L.BRouter.NUMBER_SEPARATOR;
                s += polyline.options.nogoWeight;
            }
            if (i < nogos.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseNogosPolylines: function (s) {
        var groups,
            numbers,
            latlngs,
            nogos = [];

        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            numbers = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            if (numbers.length > 1) {
                latlngs = [];
                for (var j = 0; j < numbers.length - 1; ) {
                    var lng = Number.parseFloat(numbers[j++]);
                    var lat = Number.parseFloat(numbers[j++]);
                    latlngs.push([lat, lng]);
                }
                var nogoWeight;
                if (j < numbers.length) {
                    nogoWeight = Number.parseFloat(numbers[j++]);
                }
                var options = L.extend(BR.NogoAreas.prototype.polylineOptions, { nogoWeight: nogoWeight });
                nogos.push(L.polyline(latlngs, options));
            }
        }
        return nogos;
    },

    _getNogosPolygonsString: function (nogos) {
        var s = '';
        for (var i = 0, polygon, vertices; i < nogos.length; i++) {
            polygon = nogos[i];
            vertices = polygon.getLatLngs()[0];
            for (var j = 0; j < vertices.length; j++) {
                if (j > 0) {
                    s += L.BRouter.NUMBER_SEPARATOR;
                }
                s += this._formatLatLng(vertices[j]);
            }
            // -1 is default nogo exclusion, it should not be passed as a URL parameter.
            if (
                polygon.options.nogoWeight !== undefined &&
                polygon.options.nogoWeight !== null &&
                polygon.options.nogoWeight !== -1
            ) {
                s += L.BRouter.NUMBER_SEPARATOR;
                s += polygon.options.nogoWeight;
            }
            if (i < nogos.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseNogosPolygons: function (s) {
        var groups,
            numbers,
            latlngs,
            nogos = [];

        groups = s.split(L.BRouter.GROUP_SEPARATOR);
        for (var i = 0; i < groups.length; i++) {
            numbers = groups[i].split(L.BRouter.NUMBER_SEPARATOR);
            if (numbers.length > 1) {
                latlngs = [];
                for (var j = 0; j < numbers.length - 1; ) {
                    var lng = Number.parseFloat(numbers[j++]);
                    var lat = Number.parseFloat(numbers[j++]);
                    latlngs.push([lat, lng]);
                }
                var nogoWeight;
                if (j < numbers.length) {
                    nogoWeight = Number.parseFloat(numbers[j++]);
                }
                nogos.push(L.polygon(latlngs, { nogoWeight: nogoWeight }));
            }
        }
        return nogos;
    },

    // formats L.LatLng object as lng,lat string
    _formatLatLng: function (latLng) {
        var s = '';
        s += L.Util.formatNum(latLng.lng || latLng[1], L.BRouter.PRECISION);
        s += L.BRouter.NUMBER_SEPARATOR;
        s += L.Util.formatNum(latLng.lat || latLng[0], L.BRouter.PRECISION);
        return s;
    },
});

L.bRouter = function (options) {
    return new L.BRouter(options);
};
