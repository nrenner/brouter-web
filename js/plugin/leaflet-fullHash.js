(function(window) {
    var HAS_HASHCHANGE = (function() {
        var doc_mode = window.documentMode;
        return 'onhashchange' in window && (doc_mode === undefined || doc_mode > 7);
    })();

    L.Hash = function(map, options) {
        this.onHashChange = L.Util.bind(this.onHashChange, this);

        if (map) {
            this.init(map, options);
        }
    };

    L.Hash.parseHash = function(hash) {
        if (hash.indexOf('#map=') === 0) {
            hash = hash.substr(5);
        }
        var args = hash.split(/\&(.+)/);
        var mapsArgs = args[0].split('/');
        if (mapsArgs.length == 4) {
            var zoom = parseInt(mapsArgs[0], 10),
                lat = parseFloat(mapsArgs[1]),
                lon = parseFloat(mapsArgs[2]),
                layers = this.parseLayers(mapsArgs[3]),
                additional = args[1];
            if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
                return false;
            } else {
                return {
                    center: new L.LatLng(lat, lon),
                    zoom: zoom,
                    layers: layers,
                    additional: additional
                };
            }
        } else {
            return false;
        }
    };

    (L.Hash.formatHash = function(map) {
        var center = map.getCenter(),
            zoom = map.getZoom(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),
            layers = this.formatLayers();

        var params = [zoom, center.lat.toFixed(precision), center.lng.toFixed(precision), layers];
        url = '#map=' + params.join('/');
        if (this.additionalCb != null) {
            var additional = this.additionalCb();
            if (additional != null) {
                return url + additional;
            }
        }
        return url;
    }),
        (L.Hash.prototype = {
            options: {
                layerSeparator: ','
            },
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

            _parseLayers: function(layersParam, layerSeparator) {
                var layers = layersParam.split(layerSeparator).map(
                    L.bind(function(layerEncoded) {
                        var obj = null;
                        var layerString = decodeURIComponent(layerEncoded);

                        if (layerString) {
                            obj = this.options.layersControl.getLayerFromString(layerString);
                        }

                        return obj;
                    }, this)
                );

                return layers;
            },

            parseLayers: function(layersParam) {
                var countFoundLayers = function(count, obj) {
                    if (obj) {
                        count++;
                    }
                    return count;
                };

                var layers = this._parseLayers(layersParam, this.options.layerSeparator);
                var found = layers.reduce(countFoundLayers, 0);

                if (found < layers.length) {
                    // legacy support for name instead of id and '-' layer separator
                    var layersLegacy = this._parseLayers(layersParam, '-');
                    var foundLegacy = layersLegacy.reduce(countFoundLayers, 0);

                    if (foundLegacy > found) {
                        layers = layersLegacy;
                    }
                }

                return layers;
            },

            activateLayers: function(layers) {
                var layersControl = this.options.layersControl;
                var added = false;

                layersControl.removeActiveLayers();

                layers.forEach(
                    L.bind(function(obj, index, array) {
                        if (obj) {
                            layersControl.activateLayer(obj);
                            if (obj && !obj.overlay) {
                                added = true;
                            }
                        }
                    }, this)
                );

                if (!added) {
                    // if we couldn't add layers (removed or invalid name), add the default one
                    layersControl.activateDefaultBaseLayer();
                }
            },

            formatLayers: function() {
                var objList = this.options.layersControl.getActiveLayers();
                // exclude vector layers (loaded tracks), but not when id set (route quality coding)
                objList = objList.filter(function(obj) {
                    return obj.layer instanceof L.GridLayer || obj.layer.id;
                });
                var layerList = objList.map(
                    L.bind(function(obj) {
                        return encodeURIComponent(this.options.layersControl.toLayerString(obj));
                    }, this)
                );

                return layerList.join(this.options.layerSeparator);
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

            onMapMove: function() {
                // bail if we're moving the map (updating from a hash),
                // or if the map is not yet loaded

                if (this.movingMap || !this.map._loaded) {
                    return false;
                }

                var hash = this.formatHash(this.map);
                if (this.lastHash != hash) {
                    location.replace(hash);
                    this.lastHash = hash;
                }
            },

            movingMap: false,
            update: function() {
                var hash = location.hash;
                if (hash === this.lastHash) {
                    return;
                }
                var parsed = this.parseHash(hash);
                if (!parsed) {
                    // migration from old hash style to new one
                    if (this.onInvalidHashChangeCb != null) {
                        var newHash = this.onInvalidHashChangeCb(hash);
                        if (newHash != null && newHash != hash) {
                            parsed = this.parseHash(newHash);
                        }
                    }
                }

                if (parsed) {
                    this.movingMap = true;

                    this.map.setView(parsed.center, parsed.zoom);

                    this.activateLayers(parsed.layers);

                    if (this.onHashChangeCb != null) {
                        this.onHashChangeCb(parsed.additional);
                    }

                    this.movingMap = false;
                } else {
                    this.onMapMove(this.map);
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
                this.map.on('moveend layeradd layerremove', this.onMapMove, this);

                if (HAS_HASHCHANGE) {
                    L.DomEvent.addListener(window, 'hashchange', this.onHashChange);
                } else {
                    clearInterval(this.hashChangeInterval);
                    this.hashChangeInterval = setInterval(this.onHashChange, 50);
                }
                this.isListening = true;
            },

            stopListening: function() {
                this.map.off('moveend layeradd layerremove', this.onMapMove, this);

                if (HAS_HASHCHANGE) {
                    L.DomEvent.removeListener(window, 'hashchange', this.onHashChange);
                } else {
                    clearInterval(this.hashChangeInterval);
                }
                this.isListening = false;
            },

            _keyByValue: function(obj, value) {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (obj[key] === value) {
                            return key;
                        } else {
                            return null;
                        }
                    }
                }
            }
        });
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
