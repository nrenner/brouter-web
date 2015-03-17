//#include "Permalink.js

// patch to not encode URL (beside 'layer', better readable/hackable, Browser can handle)
L.Control.Permalink.include({
    _update_href: function () {
        //var params = L.Util.getParamString(this._params);
        var params = this.getParamString(this._params);

        var sep = '?';
        if (this.options.useAnchor) sep = '#';
        var url = this._url_base + sep + params.slice(1);
        if (this._href) this._href.setAttribute('href', url);
        if (this.options.useLocation)
            location.replace('#' + params.slice(1));
        return url;
    },

    getParamString: function (obj, existingUrl, uppercase) {
        var params = [];
        for (var i in obj) {
            // do encode layer (e.g. spaces)
            if (i === 'layer') {
                params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
            } else {
                params.push(uppercase ? i.toUpperCase() : i + '=' + obj[i]);
            }
        }
        return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
    }
});

// patch: no animation when setting the map view, strange effects with nogo circles
L.Control.Permalink.include({
    _set_center: function(e)
    {
      //console.info('Update center', e);
      var params = e.params;
      if (params.zoom === undefined ||
          params.lat === undefined ||
          params.lon === undefined) return;
      this._map.setView(new L.LatLng(params.lat, params.lon), params.zoom, { reset: true });
    }
});

L.Control.Permalink.include({

    initialize_routing: function () {
        this.on('update', this._set_routing, this);
        this.on('add', this._onadd_routing, this);
    },

    _onadd_routing: function (e) {
        this.options.routingOptions.on('update', this._update_routing, this);
        this.options.nogos.on('update', this._update_routing, this);
        // waypoint add, move, delete (but last)
        this.options.routing.on('routing:routeWaypointEnd', this._update_routing, this);
        // delete last waypoint
        this.options.routing.on('waypoint:click', function (evt) {
            var r = evt.marker._routing;
            if (!r.prevMarker && !r.nextMarker) {
                this._update_routing(evt);
            }
        }, this);
    },

    _update_routing: function (evt) {
        var router = this.options.router,
            routing = this.options.routing,
            routingOptions = this.options.routingOptions,
            latLngs = routing.getWaypoints(),
            params = router.getUrlParams(latLngs);

        if (evt && evt.options) {
            router.setOptions(evt.options);
        }

        // don't permalink to custom profile, as these are only stored temporarily
        if (params.profile && params.profile === routingOptions.getCustomProfile()) {
            params.profile = null;
        }

        this._update(params);
        //console.log('permalink: ' + this._href.href);
    },

    _set_routing: function (e) {
        var router = this.options.router,
            routing = this.options.routing,
            routingOptions = this.options.routingOptions,
            nogos = this.options.nogos,
            profile = this.options.profile;

        var opts = router.parseUrlParams(e.params);
        router.setOptions(opts);
        routingOptions.setOptions(opts);
        nogos.setOptions(opts);
        profile.update(opts);

        if (opts.lonlats) {
            routing.draw(false);
            routing.clear();
            routing.setWaypoints(opts.lonlats);
        }
    }
});
