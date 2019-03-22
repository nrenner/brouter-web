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

    initialize: function (map) {
        this._map = map;

        this._addLeafletProvidersLayers();

        this._customizeLayers();
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


        function setProperty(layerId, key, value) {
            var layer = BR.layerIndex[layerId];
            if (layer) {
                layer.properties[key] = value;
            } else {
                console.error('Layer not found: ' + layerId);
            }
        }
        function setMapUrl(layerId, url) {
            setProperty(layerId, 'mapUrl', url);
        }
        function setName(layerId, url) {
            setProperty(layerId, 'name', url);
        }

        // Layer attribution here only as short link to original site,
        // to keep current position use placeholders: {zoom}/{lat}/{lon}
        // Copyright attribution in index.html #credits
        setMapUrl('standard', '<a target="_blank" href="https://www.openstreetmap.org/#map={zoom}/{lat}/{lon}">OpenStreetMap</a>');
        setMapUrl('osm-mapnik-german_style', '<a target="_blank" href="https://www.openstreetmap.de/karte.html?zoom={zoom}&lat={lat}&lon={lon}&layers=B000TF">OpenStreetMap.de</a>');
        setMapUrl('OpenTopoMap', '<a target="_blank" href="https://opentopomap.org/#map={zoom}/{lat}/{lon}">OpenTopoMap</a>');
        setMapUrl('Stamen.Terrain', '<a target="_blank" href="http://maps.stamen.com/#terrain/{zoom}/{lat}/{lon}">' + i18next.t('map.layer.stamen-terrain') + '</a>');
        setMapUrl('opencylemap', '<a target="_blank" href="https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000">OpenCycleMap</a>');
        setMapUrl('1061', '<a target="_blank" href="https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=000B0">Outdoors</a>');
        setMapUrl('Esri.WorldImagery', '<a target="_blank" href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">' + i18next.t('credits.esri-tiles') + '</a>');
        setMapUrl('HikeBike.HillShading', '<a target="_blank" href="http://hikebikemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layer=HikeBikeMap">' + i18next.t('map.hikebike-hillshading') + '</a>');
        setMapUrl('Waymarked_Trails-Cycling', '<a target="_blank" href="http://cycling.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}">' + i18next.t('map.cycling') + '</a>');
        setMapUrl('Waymarked_Trails-Hiking', '<a target="_blank" href="http://hiking.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}">' + i18next.t('map.hiking') + '</a>');

        setName('standard', i18next.t('map.layer.osm'));
        setName('osm-mapnik-german_style', i18next.t('map.layer.osmde'));
        setName('OpenTopoMap', i18next.t('map.layer.topo'));
        setName('Stamen.Terrain', i18next.t('map.layer.stamen-terrain'));
        setName('opencylemap', i18next.t('map.layer.cycle'));
        setName('1061', i18next.t('map.layer.outdoors'));
        setName('Esri.WorldImagery', i18next.t('map.layer.esri'));
        setName('HikeBike.HillShading', i18next.t('map.layer.hikebike-hillshading'));
        setName('Waymarked_Trails-Cycling', i18next.t('map.layer.cycling'));
        setName('Waymarked_Trails-Hiking', i18next.t('map.layer.hiking'));
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
            maxZoom: this._map.getMaxZoom(),
            mapUrl: props.mapUrl
        };

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

        var getAttribution = function () {
            return this.options.mapUrl;
        }
        layer.getAttribution = getAttribution;

        return layer;
    }
});

BR.layersConfig = function (map) {
	return new BR.LayersConfig(map);
};
