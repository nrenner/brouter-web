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
        SUPPORTED_BROUTER_VERSIONS: '< 1.7.0 || >=1.7.2',
        // compatibility string should be in npm package versioning format
        isCustomProfile(profileName) {
            return profileName && profileName.substring(0, 7) === L.BRouter.CUSTOM_PREFIX;
        },
    },

    options: {},

    initialize(options) {
        L.setOptions(this, options);

        this.queue = async.queue(
            L.bind(function (task, callback) {
                this.getRoute(task.segment, callback);
            }, this),
            1
        );
    },

    setOptions(options) {
        L.setOptions(this, options);
    },

    getUrlParams(latLngs, beelineFlags, pois, circlego, format) {
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

    parseUrlParams(params) {
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
            opts.profile = this._parseProfile(params.profile);
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

    getUrl(latLngs, beelineFlags, pois, circlego, format, trackname, exportWaypoints) {
        var urlParams = this.getUrlParams(latLngs, beelineFlags, pois, circlego, format);

        let query = new URLSearchParams();
        if (urlParams.lonlats != null && urlParams.lonlats.length > 0) {
            query.append('lonlats', urlParams.lonlats);
        }
        if (urlParams.straight != null) {
            query.append('straight', urlParams.straight);
        }
        if (urlParams.pois != null && urlParams.pois.length > 0) {
            query.append('pois', urlParams.pois);
        }
        if (urlParams.circlego != null) {
            query.append('ringgo', urlParams.circlego);
        }
        if (urlParams.nogos != null) {
            query.append('nogos', urlParams.nogos);
        }
        if (urlParams.polylines != null) {
            query.append('polylines', urlParams.polylines);
        }
        if (urlParams.polygons != null) {
            query.append('polygons', urlParams.polygons);
        }
        if (urlParams.profile != null) {
            query.append('profile', urlParams.profile);
        }
        if (urlParams.alternativeidx != null) {
            query.append('alternativeidx', urlParams.alternativeidx);
        }
        if (urlParams.format != null) {
            query.append('format', urlParams.format);
        }
        if (trackname) {
            query.append('trackname', trackname);
        }
        if (exportWaypoints) {
            query.append('exportWaypoints', '1');
        }

        const prepend_host = format != null;
        return `${prepend_host ? BR.conf.host : ''}/brouter?${query.toString()}`;
    },

    getRoute(latLngs, cb) {
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

    _handleRouteResponse(xhr, cb) {
        var layer, geojson;

        if (
            xhr.status === 200 &&
            xhr.responseText &&
            // application error when not GeoJSON format (text/plain for errors)
            (xhr.getResponseHeader('Content-Type').split(';')[0] === 'application/geo+json' ||
                xhr.getResponseHeader('Content-Type').split(';')[0] === 'application/vnd.geo+json')
        ) {
            // leaflet.spin
            //gpxLayer.fire('data:loaded');

            try {
                geojson = JSON.parse(xhr.responseText);
                layer = this._assignFeatures(L.geoJSON(geojson).getLayers()[0]);
                this.checkBRouterVersion(layer.feature.properties.creator);

                return cb(null, layer);
            } catch (e) {
                console.error(e, xhr.responseText);
                return cb(e);
            }
        } else {
            cb(BR.Util.getError(xhr));
        }
    },

    versionCheckDone: false,
    checkBRouterVersion(creator) {
        if (this.versionCheckDone) {
            return;
        }
        this.versionCheckDone = true;

        try {
            const actualBRouterVersion = creator.replace(/^BRouter-/, '');
            if (!compareVersions.satisfies(actualBRouterVersion, L.BRouter.SUPPORTED_BROUTER_VERSIONS)) {
                console.warn(
                    'BRouter-Web ' +
                        BR.version +
                        ' requires BRouter versions ' +
                        L.BRouter.SUPPORTED_BROUTER_VERSIONS +
                        ', but only ' +
                        creator +
                        ' was found.'
                );
            }
        } catch (e) {
            console.error(e);
        }
    },

    getRouteSegment(l1, l2, cb) {
        this.queue.push({ segment: [l1, l2] }, cb);
    },

    uploadProfile(profileId, profileText, cb) {
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

    _assignFeatures(segment) {
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

    _getFeatureLatLng(message) {
        var lon = message[0] / 1000000,
            lat = message[1] / 1000000;

        return L.latLng(lat, lon);
    },

    _handleProfileResponse(xhr, cb) {
        var response;

        if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 0) {
            response = JSON.parse(xhr.responseText);
            cb(response.error, response.profileid);
        } else {
            cb(i18next.t('warning.profile-error'));
        }
    },

    _getLonLatsString(latLngs) {
        var s = '';
        for (var i = 0; i < latLngs.length; i++) {
            s += this._formatLatLng(latLngs[i]);
            if (i < latLngs.length - 1) {
                s += L.BRouter.GROUP_SEPARATOR;
            }
        }
        return s;
    },

    _parseLonLats(s) {
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

    _getBeelineString(beelineFlags) {
        var indexes = [];
        for (var i = 0; i < beelineFlags.length; i++) {
            if (beelineFlags[i]) {
                indexes.push(i);
            }
        }
        return indexes.join(',');
    },

    _parseBeelines(s, lonlats) {
        if (!lonlats || lonlats.length < 2) return [];

        const beelineFlags = new Array(lonlats.length - 1);
        beelineFlags.fill(false);
        for (const i of s.split(',')) {
            beelineFlags[i] = true;
        }
        return beelineFlags;
    },

    _getLonLatsNameString(latLngNames) {
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

    _parseLonLatNames(s) {
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

    _getNogosString(nogos) {
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

    _parseNogos(s) {
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

    _getNogosPolylinesString(nogos) {
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

    _parseNogosPolylines(s) {
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
                var options = L.extend(BR.NogoAreas.prototype.polylineOptions, { nogoWeight });
                nogos.push(L.polyline(latlngs, options));
            }
        }
        return nogos;
    },

    _getNogosPolygonsString(nogos) {
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

    _parseNogosPolygons(s) {
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
                nogos.push(L.polygon(latlngs, { nogoWeight }));
            }
        }
        return nogos;
    },

    _parseProfile(profile) {
        if (BR.conf.profilesRename?.[profile]) {
            return BR.conf.profilesRename[profile];
        }

        return profile;
    },

    // formats L.LatLng object as lng,lat string
    _formatLatLng(latLng) {
        var s = '';
        s += L.Util.formatNum(latLng.lng ?? latLng[1], L.BRouter.PRECISION);
        s += L.BRouter.NUMBER_SEPARATOR;
        s += L.Util.formatNum(latLng.lat ?? latLng[0], L.BRouter.PRECISION);
        return s;
    },
});

L.bRouter = function (options) {
    return new L.BRouter(options);
};
