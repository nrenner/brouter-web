BR.LayersConfig = L.Class.extend({
    defaultBaseLayers: BR.confLayers.defaultBaseLayers,
    defaultOverlays: BR.confLayers.defaultOverlays,
    legacyNameToIdMap: BR.confLayers.legacyNameToIdMap,

    initialize: function (map) {
        this._map = map;

        this._addLeafletProvidersLayers();
        this._customizeLayers();
        this.loadDefaultLayers();
    },

    loadDefaultLayers: function() {
        if (BR.Util.localStorageAvailable()) {
            var item = localStorage.getItem("map/defaultLayers");
            if (item) {
                var defaultLayers = JSON.parse(item);
                this.defaultBaseLayers = defaultLayers.baseLayers;
                this.defaultOverlays = defaultLayers.overlays;
            }
        }
    },

    storeDefaultLayers: function (baseLayers, overlays) {
        if (BR.Util.localStorageAvailable()) {
            var defaultLayers = {
                baseLayers: baseLayers,
                overlays: overlays
            };
            localStorage.setItem("map/defaultLayers", JSON.stringify(defaultLayers));
        }
    },

    _addLeafletProvidersLayers: function () {
        var includeList = BR.confLayers.leafletProvidersIncludeList;

        for (var i = 0; i < includeList.length; i++) {
            var id = includeList[i];
            var obj = {
                geometry: null,
                properties: {
                    id: id,
                    name: id.replace('.', ' '),
                    dataSource: 'leaflet-providers'
                },
                type: "Feature"
            };
            BR.layerIndex[id] = obj;
        }
    },

    _customizeLayers: function () {
        var propertyOverrides = BR.confLayers.getPropertyOverrides();

        for (id in propertyOverrides) {
            var layer = BR.layerIndex[id];

            if (layer) {
                var properties = propertyOverrides[id];

                for (key in properties) {
                    var value = properties[key];
                    layer.properties[key] = value;
                }
            } else {
                console.error('Layer not found: ' + id);
            }
        }

        BR.layerIndex['MtbMap'].geometry =  BR.confLayers.europeGeofabrik;
        BR.layerIndex['1069'].geometry =  BR.confLayers.europeGeofabrik;

        BR.layerIndex['OpenStreetMap.CH'].geometry = BR.confLayers.switzerlandPadded;
    },

    isDefaultLayer: function(id, overlay) {
        var result = false;
        if (overlay) {
            result = this.defaultOverlays.indexOf(id) > -1;
        } else {
            result = this.defaultBaseLayers.indexOf(id) > -1;
        }
        return result;
    },

    getBaseLayers: function() {
        return this._getLayers(this.defaultBaseLayers);
    },

    getOverlays: function() {
        return this._getLayers(this.defaultOverlays);
    },

    _getLayers: function(ids) {
        var layers = {};

        for (var i = 0; i < ids.length; i++) {
            var layerId = ids[i];
            var layerData = BR.layerIndex[layerId];

            if (layerData) {
                layers[layerData.properties.name] = this.createLayer(layerData);
            } else {
                console.error('Layer not found: ' + layerId);
            }
        }

        return layers;
    },

    // own convention: key placeholder with prefix
    // e.g. ?api_key={keys_openrouteservice}
    getKeyName: function (url) {
        var result = null;
        // L.Util.template only matches [\w_-]
        var prefix = 'keys_';
        var regex = new RegExp('{' + prefix + '([^}]*)}');
        var found, name;

        if (!url) return result;

        found = url.match(regex);
        if (found) {
            name = found[1];
            result = {
                name: name,
                urlVar: prefix + name
            };
        }

        return result;
    },

    createLayer: function (layerData) {
        var props = layerData.properties;
        var url = props.url;
        var layer;

        // JOSM:    https://{switch:a,b,c}.tile.openstreetmap.org/{zoom}/{x}/{y}.png
        // Leaflet: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
        function convertUrlJosm(url) {
            var rxSwitch = /{switch:[^}]*}/;
            var rxZoom = /{zoom}/g;
            var result = url.replace(rxSwitch, '{s}');
            result = result.replace(rxZoom, '{z}');
            return result;
        }

        // JOSM:    https://{switch:a,b,c}.tile.openstreetmap.org/{zoom}/{x}/{y}.png
        // Leaflet: ['a','b','c']
        function getSubdomains(url) {
            var result = 'abc';
            var regex = /{switch:([^}]*)}/;
            var found = url.match(regex);
            if (found) {
                result = found[1].split(',');
            }
            return result;
        }

        function convertAttributionJosm(props) {
            var result = '';
            var attr = props.attribution;

            if (attr) {
                if (attr.html) {
                    result = attr.html;
                } else if (attr.url && attr.text) {
                    result = '<a href="' + attr.url + '" target="_blank" rel="noopener">' + attr.text + '</a>';
                } else if (attr.text) {
                    result = attr.text;
                }
            }
            if (!result) {
                console.warn('No attribution: ' + props.id);
            }

            return result;
        }


        var options = {
            maxZoom: this._map.getMaxZoom(),
            bounds: layerData.geometry && !props.worldTiles ? L.geoJson(layerData.geometry).getBounds() : null
        };
        if (props.mapUrl) {
            options.mapLink = '<a target="_blank" href="' + props.mapUrl + '">' + (props.nameShort || props.name) + '</a>';
        }
        if (props.attribution) {
            options.attribution = props.attribution;
        }

        var keyObj = this.getKeyName(url);
        if (keyObj && BR.keys[keyObj.name]) {
            options[keyObj.urlVar] = BR.keys[keyObj.name];
        }

        if (props.dataSource === 'leaflet-providers') {
            layer = L.tileLayer.provider(props.id);

            var layerOptions = L.Util.extend(options, {
                maxNativeZoom: layer.options.maxZoom,
            });
            L.setOptions(layer, layerOptions);

        } else if (props.dataSource === 'LayersCollection') {
            layer = L.tileLayer(url, L.Util.extend(options, {
                minZoom: props.minZoom || 0,
                maxNativeZoom: props.maxZoom
            }));
            if (props.subdomains) {
                layer.subdomains = props.subdomains;
            }
        } else {
            // JOSM
            var josmUrl = url;
            var url = convertUrlJosm(josmUrl);

            var josmOptions = L.Util.extend(options, {
                minZoom: props.min_zoom || 0,
                maxNativeZoom: props.max_zoom,
                subdomains: getSubdomains(josmUrl),
                attribution: convertAttributionJosm(props)
            });

            if (props.type && props.type === 'wms') {
                layer = L.tileLayer.wms(url, L.Util.extend(josmOptions, {
                    layers: props.layers,
                    format: props.format
                }));
            } else {
                layer = L.tileLayer(url, josmOptions);
            }
        }

        // Layer attribution here only as short link to original site,
        // to keep current position use placeholders: {zoom}/{lat}/{lon}
        // Copyright attribution in index.html #credits
        var getAttribution = function () {
            return this.options.mapLink;
        }
        layer.getAttribution = getAttribution;

        layer.id = props.id;

        return layer;
    }
});

BR.layersConfig = function (map) {
	return new BR.LayersConfig(map);
};
