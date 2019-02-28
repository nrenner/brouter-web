BR.LayersTab = L.Control.Layers.extend({
    previewLayer: null,

    addTo: function (map) {
        this._map = map;
        this.onAdd(map);

        var layerIndex = BR.layerIndex;

        this.addLeafletProvidersLayers();

        var toJsTree = function(layerTree) {
            var data = [];

            function walkTree(inTree, outTree) {
                if (Array.isArray(inTree)) {
                    for (var i = 0; i < inTree.length; i++) {
                        var layerId = inTree[i];
                        var childNode = { 
                            'id': layerId,
                            'text': layerIndex[layerId].properties.name
                        };
                        outTree.push(childNode);
                    }
                } else {
                    for (name in inTree) {
                        var value = inTree[name];
                        var children = [];
                        var rootNode = {
                            'text': name,
                            'state': {
                                'disabled': true
                            },
                            'children': children
                        };
                        outTree.push(rootNode);

                        walkTree(value, children);
                    }
                }
            }
            walkTree(structure, data);

            return data;
        };

        var structure = {
            'Base layers': {
                'Worldwide international': [
                    'standard',
                    'OpenTopoMap',
                    'Stamen.Terrain',
                    'HDM_HOT',
                    'wikimedia-map',
                    'opencylemap'
                ],
                'Worldwide monolingual': [
                    'osm-mapnik-german_style',
                    'osmfr'
                ],
                'Europe': [
                    'MtbMap'
                ],
                'Country': [
                    'OpenStreetMap.CH',
                    'Freemap.sk-Car',
                    'Freemap.sk-Hiking',
                    'Freemap.sk-Cyclo',
                    'OpenStreetMap-turistautak',
                    'Israel_Hiking',
                    'Israel_MTB',
                    'osmbe',
                    'osmbe-fr',
                    'osmbe-nl',
                    'osmfr-basque',
                    'osmfr-breton',
                    'osmfr-occitan',
                    'mtbmap-no',
                    'osm-cambodia_laos_thailand_vietnam-bilingual'
                ]
            },
            'Overlays': {
                'World-wide': [
                    'HikeBike.HillShading',
                    'Waymarked_Trails-Hiking',
                    'Waymarked_Trails-Cycling',
                    'Waymarked_Trails-MTB'
                ],
                'Country': [
                    'hu-hillshade'
                ]
            }
        };
        var treeData = toJsTree(structure);

        var onSelectNode = function (e, data) {
            var layerData = layerIndex[data.node.id];

            this.showLayer(this.createLayer(layerData));
        };

        var onCheckNode = function (e, data) {
            var layerData = layerIndex[data.node.id];
            var layer = this.createLayer(layerData);
            var name = layerData.properties.name;
            var overlay = layerData.properties.overlay;

            if (overlay) {
                this.addOverlay(layer, name);
            } else {
                this.addBaseLayer(layer, name);
            }
        };

        var onUncheckNode = function (e, data) {
            var obj = this._getLayerObjByName(data.node.text);
            if (!obj) return;

            if (this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
                if (!obj.overlay && this._layers.length > 0) {
                    this._map.addLayer(this._layers[0].layer);
                }
            }
            this.removeLayer(obj.layer);
        };

        L.DomUtil.get('layers-control-wrapper').appendChild(this._form);
        $('#optional-layers-tree')
            .on('select_node.jstree', L.bind(onSelectNode, this))
            .on('check_node.jstree', L.bind(onCheckNode, this))
            .on('uncheck_node.jstree', L.bind(onUncheckNode, this))
            .on('ready.jstree', function (e, data) {
                data.instance.open_all();
            })
            .jstree({
                plugins: [ 'checkbox' ],
                checkbox: {
                    whole_node: false,
                    tie_selection: false 
                },
                core: {
                    'multiple': false,
                    'themes': {
                        'icons': false,
                        dots : false
                    },
                    'data' : treeData
                }
            });
        this.jstree = $('#optional-layers-tree').jstree(true);

        return this;
    },

    addLeafletProvidersLayers: function () {
        var includeList = [
            'Stamen.Terrain',
            'MtbMap',
            'OpenStreetMap.CH',
            'HikeBike.HillShading'
        ];

        for (var i = 0; i < includeList.length; i++) {
            var id = includeList[i];
            var obj = {
                geometry: null,
                properties: {
                    id: id,
                    name: id.replace('.', ' '),
                    datasource: 'leaflet-providers'
                },
                type: "Feature"
            };
            BR.layerIndex[id] = obj;
        }

        BR.layerIndex['HikeBike.HillShading'].properties.overlay = true;
    },

    _getLayerObjByName: function (name) {
        for (var i = 0; i < this._layers.length; i++) {
			if (this._layers[i] && this._layers[i].name === name) {
				return this._layers[i];
			}
		}
    },

    createLayer: function (layerData) {
        var props = layerData.properties;
        var layer;

        // JOSM:    https://{switch:a,b,c}.tile.openstreetmap.org/{zoom}/{x}/{y}.png
        // Leaflet: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
        function convertUrlJosm(url) {
            var regex = /{switch:[^}]*}/;
            var result = url.replace(regex, '{s}');
            result = result.replace('{zoom}', '{z}');
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

        if (props.datasource === 'leaflet-providers') {
            // leaflet-providers
            layer = L.tileLayer.provider(props.id);
        } else {
            // JOSM
            var url = convertUrlJosm(props.url);

            layer = L.tileLayer(url, {
                maxNativeZoom: props.max_zoom,
                maxZoom: this._map.getMaxZoom(),
                subdomains: getSubdomains(props.url),
                zIndex: this._lastZIndex + 1
            });
        }

        return layer
    },

    removeSelectedBaseLayer: function () {
		for (i = 0; i < this._layers.length; i++) {
            obj = this._layers[i];
            if (!obj.overlay && this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
            }
		}
    },

    showLayer: function (layer) {
        this._map.addLayer(layer);
        if (this.previewLayer && this._map.hasLayer(this.previewLayer)) {
            this._map.removeLayer(this.previewLayer);
        } else {
            this.removeSelectedBaseLayer();
            this._map.once('baselayerchange', function () {
                if (this.previewLayer && this._map.hasLayer(this.previewLayer)) {
                    this._map.removeLayer(this.previewLayer);
                }
                this.jstree.deselect_all();
            }, this);
        }
        this.previewLayer = layer;
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
