(function(window) {
    var HAS_HASHCHANGE = (function() {
        var doc_mode = window.documentMode;
        return ('onhashchange' in window) &&
            (doc_mode === undefined || doc_mode > 7);
    })();

    L.Hash = function(map, layers, additionalCb, onHashChangeCb) {
        this.onHashChange = L.Util.bind(this.onHashChange, this);
        this.additionalCb = additionalCb;
        this.onHashChangeCb = onHashChangeCb;
        if (map) {
            this.init(map, layers);
        }
    };

    L.Hash.parseHash = function(hash) {
        if(hash.indexOf('#map=') === 0) {
            hash = hash.substr(5);
        }
        var args = hash.split("/");
        if (args.length >= 4) {
            var zoom = parseInt(args[0], 10),
            lat = parseFloat(args[1]),
            lon = parseFloat(args[2]),
            layer = args[3];
            additional = args[4];
            if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
                return false;
            } else {
                return {
                    center: new L.LatLng(lat, lon),
                    zoom: zoom,
                    layer: layer,
                    additional: additional
                };
            }
        } else {
            return false;
        }
    };

    L.Hash.formatHash = function(map) {
        var center = map.getCenter(),
            zoom = map.getZoom(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),
            layer = null;

        var options = this.options;
        //Check active layer
        for(var key in options) {
            if (options.hasOwnProperty(key)) {
                if (map.hasLayer(options[key])) {
                    layer = key;
                    break;
                };
            };
        };
        var params = [
            zoom,
            center.lat.toFixed(precision),
            center.lng.toFixed(precision),
            layer
        ];
        url = "#map=" + params.join("/");
        if (this.additionalCb != null) {
            var additional = this.additionalCb();
            if (additional != null) {
                return url + additional;
            }
        }
        return url;
    },

    L.Hash.prototype = {
        map: null,
        lastHash: null,

        parseHash: L.Hash.parseHash,
        formatHash: L.Hash.formatHash,

        init: function(map, options) {
            this.map = map;
            L.Util.setOptions(this, options);

            // reset the hash
            this.lastHash = null;
            this.onHashChange();

            if (!this.isListening) {
                this.startListening();
            }
        },

        removeFrom: function(map) {
            if (this.changeTimeout) {
                clearTimeout(this.changeTimeout);
            }

            if (this.isListening) {
                this.stopListening();
            }

            this.map = null;
        },

        updateHash: function() {
            // bail if we're moving the map (updating from a hash),
            // or if the map is not yet loaded

            if (this.isUpdatingHash || !this.map._loaded) {
                return false;
            }

            var hash = this.formatHash(this.map);
            if (this.lastHash != hash) {
                location.replace(hash);
                this.lastHash = hash;
            }
        },

        isUpdatingHash: false,
        update: function() {
            var hash = location.hash;
            if (hash === this.lastHash) {
                return;
            }
            var parsed = this.parseHash(hash);
            if (parsed) {
                this.isUpdatingHash = true;

                this.map.setView(parsed.center, parsed.zoom);

                if (this.onHashChangeCb != null) {
                    this.onHashChangeCb(parsed.additional);
                }

                var options = this.options,
                    layer = parsed.layer in options ? parsed.layer : Object.keys(options)[0],
                    that = this;

                //FIXME: removing/readding layers breaks Routing plugin
                //Add/remove layer
                // this.map.eachLayer(function(layer) {
                //     that.map.removeLayer(layer);
                // });
                // that.map.addLayer(options[layer]);

                this.isUpdatingHash = false;
            } else {
                this.updateHash(this.map);
            }
        },

        // defer hash change updates every 100ms
        changeDefer: 100,
        changeTimeout: null,
        onHashChange: function() {
            // throttle calls to update() so that they only happen every
            // `changeDefer` ms
            if (!this.changeTimeout) {
                var that = this;
                this.changeTimeout = setTimeout(function() {
                    that.update();
                    that.changeTimeout = null;
                }, this.changeDefer);
            }
        },

        isListening: false,
        hashChangeInterval: null,
        startListening: function() {
            this.map.on("moveend layeradd layerremove", this.updateHash, this);

            if (HAS_HASHCHANGE) {
                L.DomEvent.addListener(window, "hashchange", this.onHashChange);
            } else {
                clearInterval(this.hashChangeInterval);
                this.hashChangeInterval = setInterval(this.onHashChange, 50);
            }
            this.isListening = true;
        },

        stopListening: function() {
            this.map.off("moveend layeradd layerremove", this.updateHash, this);

            if (HAS_HASHCHANGE) {
                L.DomEvent.removeListener(window, "hashchange", this.onHashChange);
            } else {
                clearInterval(this.hashChangeInterval);
            }
            this.isListening = false;
        },

        _keyByValue: function(obj, value) {
            for(var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (obj[key] === value) {
                        return key;
                    } else { return null; };
                };
            };
        }
    };
    L.hash = function(map, options) {
        return new L.Hash(map, options);
    };
    L.Map.prototype.addHash = function() {
        this._hash = L.hash(this, this.options);
    };
    L.Map.prototype.removeHash = function() {
        this._hash.removeFrom();
    };
})(window);
