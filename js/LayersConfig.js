BR.LayersConfig = L.Class.extend({
    defaultBaseLayers: [
        'standard',
        'osm-mapnik-german_style',
        'OpenTopoMap',
        'Stamen.Terrain',
        'Esri.WorldImagery'
    ],
    defaultOverlays: [
        'HikeBike.HillShading',
        'Waymarked_Trails-Cycling',
        'Waymarked_Trails-Hiking'
    ],

    legacyNameToIdMap: {
        'OpenStreetMap': 'standard',
        'OpenStreetMap.de': 'osm-mapnik-german_style',
        'OpenTopoMap': 'OpenTopoMap',
        'Esri World Imagery': 'Esri.WorldImagery',
        'Cycling (Waymarked Trails)': 'Waymarked_Trails-Cycling',
        'Hiking (Waymarked Trails)': 'Waymarked_Trails-Hiking'
    },

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
        var includeList = [
            'Stamen.Terrain',
            'MtbMap',
            'OpenStreetMap.CH',
            'HikeBike.HillShading',
            'Esri.WorldImagery'
        ];

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
        // add Thunderforest API key variable
        BR.layerIndex['opencylemap'].properties.url = 'https://{switch:a,b,c}.tile.thunderforest.com/cycle/{zoom}/{x}/{y}.png?apikey={keys_thunderforest}';
        BR.layerIndex['1061'].properties.url = 'http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={keys_thunderforest}';

        BR.layerIndex['HikeBike.HillShading'].properties.overlay = true;

        var propertyOverrides = {
            'standard': {
                'name': i18next.t('map.layer.osm'),
                'mapUrl': 'https://www.openstreetmap.org/#map={zoom}/{lat}/{lon}'
            },
            'osm-mapnik-german_style': {
                'name': i18next.t('map.layer.osmde'),
                'language_code': 'de',
                'mapUrl': 'https://www.openstreetmap.de/karte.html?zoom={zoom}&lat={lat}&lon={lon}&layers=B000TF'
            },
            'OpenTopoMap': {
                'name': i18next.t('map.layer.topo'),
                'mapUrl': 'https://opentopomap.org/#map={zoom}/{lat}/{lon}'
            },
            'Stamen.Terrain': {
                'name': i18next.t('map.layer.stamen-terrain'),
                'mapUrl': 'http://maps.stamen.com/#terrain/{zoom}/{lat}/{lon}'
            },
            'opencylemap': {
                'name': i18next.t('map.layer.cycle'),
                'nameShort': 'OpenCycleMap',
                'mapUrl': 'https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000'
            },
            '1061': {
                'name': i18next.t('map.layer.outdoors'),
                'nameShort': 'Outdoors',
                'mapUrl': 'https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=000B0'
            },
            'Esri.WorldImagery': {
                'name': i18next.t('map.layer.esri'),
                'nameShort': i18next.t('credits.esri-tiles'),
                'mapUrl': 'http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9'
            },
            'HikeBike.HillShading': {
                'name': i18next.t('map.layer.hikebike-hillshading'),
                'nameShort': i18next.t('map.hikebike-hillshading'),
                'mapUrl': 'http://hikebikemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layer=HikeBikeMap'
            },
            'Waymarked_Trails-Cycling': {
                'name': i18next.t('map.layer.cycling'),
                'nameShort': i18next.t('map.cycling'),
                'mapUrl': 'http://cycling.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}'
            },
            'Waymarked_Trails-Hiking': {
                'name': i18next.t('map.layer.hiking'),
                'nameShort': i18next.t('map.hiking'),
                'mapUrl': 'http://hiking.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}'
            },
            'OpenStreetMap.CH': {
                'country_code': 'CH'
            },
            'topplus-open': {
                'country_code': 'DE'
            },
            'osm-cambodia_laos_thailand_vietnam-bilingual': {
                'country_code': 'TH+'
            },
            'osmfr': {
                'language_code': 'fr'
            },
            // kosmosnimki.ru
            '1023': {
                'language_code': 'ru'
            },
            // sputnik.ru
            '1021': {
                'language_code': 'ru'
            },
            // Osmapa.pl - Mapa OpenStreetMap Polska
            '1017': {
                'language_code': 'pl'
            },
            'osmfr-basque': {
                'language_code': 'eu'
            },
            'osmfr-breton': {
                'language_code': 'br'
            },
            'osmfr-occitan': {
                'language_code': 'oc'
            }
        };

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


        var options = {
            maxZoom: this._map.getMaxZoom()
        };
        if (props.mapUrl) {
            options.mapLink = '<a target="_blank" href="' + props.mapUrl + '">' + (props.nameShort || props.name) + '</a>';
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
                minZoom: props.minZoom,
                maxNativeZoom: props.maxZoom,
            }));
            if (props.subdomains) {
                layer.subdomains = props.subdomains;
            }
        } else {
            // JOSM
            var url = convertUrlJosm(url);

            var josmOptions = L.Util.extend(options, {
                minZoom: props.min_zoom,
                maxNativeZoom: props.max_zoom,
                subdomains: getSubdomains(url),
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
