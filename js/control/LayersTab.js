BR.LayersTab = L.Control.Layers.extend({
    previewLayer: null,
    saveLayers: [],

    addTo: function (map) {
        this._map = map;
        this.onAdd(map);

        var layerIndex = BR.layerIndex;

        this.addLeafletProvidersLayers();

        var structure = {
            'Base layers': {
                'Worldwide international': [
                    'standard',
                    'OpenTopoMap',
                    'Stamen.Terrain',
                    'HDM_HOT',
                    'wikimedia-map',
                    'opencylemap',
                    "1061", // Thunderforest Outdoors
                    "1065", // Hike & Bike Map
                    "1016", // 4UMaps,
                    "openmapsurfer"
                ],
                'Worldwide monolingual': [
                    'osm-mapnik-german_style',
                    'osmfr',
                    "1023", // Osmapa.pl - Mapa OpenStreetMap Polska
                    "1021", // kosmosnimki.ru
                    "1017", // sputnik.ru
                    "1010" // OpenStreetMap.se (Hydda.Full)
                ],
                'Europe': [
                    'MtbMap',
                    "1069",  // MRI (maps.refuges.info)
                ],
                'Country': [
                    'topplus-open',
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
                    'Waymarked_Trails-MTB',
                    'mapillary-coverage-raster'
                ],
                'Country': [
                    'historic-place-contours',
                    'hu-hillshade', 
                    {
                        'PL - Poland': [
                            'mapaszlakow-cycle',
                            'mapaszlakow-bike',
                            'mapaszlakow-hike',
                            'mapaszlakow-mtb',
                            'mapaszlakow-incline',
                        ]
                    }
                ]
            }
        };
        var treeData = this.toJsTree(structure);
        var oldSelected = null;

        var onSelectNode = function (e, data) {
            var layerData = layerIndex[data.node.id];
            var selected = data.selected[0];

            if (selected !== oldSelected) {
                this.showPreview(this.createLayer(layerData));
                oldSelected = selected;
            } else {
                data.instance.deselect_node(data.node);
            }
        };

        var onDeselectNode = function (e, data) {
            this.hidePreview();
            oldSelected = null;
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
                if (!obj.overlay) {
                    this.addFirstLayer();
                }
            }
            this.removeLayer(obj.layer);
        };

        L.DomUtil.get('layers-control-wrapper').appendChild(this._form);
        $('#optional-layers-tree')
            .on('select_node.jstree', L.bind(onSelectNode, this))
            .on('deselect_node.jstree', L.bind(onDeselectNode, this))
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

    toJsTree: function (layerTree) {
        var data = [];
        var self = this;

        function walkTree(inTree, outTree) {
            function walkObject(obj) {
                for (name in obj) {
                    var value = obj[name];
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

            if (Array.isArray(inTree)) {
                for (var i = 0; i < inTree.length; i++) {
                    var entry = inTree[i];
                    if (typeof entry === 'object') {
                        walkObject(entry);
                    } else {
                        var layer = BR.layerIndex[entry];

                        if (layer) {
                            var props = layer.properties;
                            var url = props.url;
                            var keyName = self.getKeyName(url);

                            // when key required only add if configured
                            if (!keyName || keyName && BR.keys[keyName]) {
                                var childNode = { 
                                    'id': entry,
                                    'text': props.name
                                };
                                outTree.push(childNode);
                            }
                        } else {
                            console.error('Layer "' + entry + '" not found');
                        }
                    }
                }
            } else {
                walkObject(inTree);
            }
        }
        walkTree(layerTree, data);

        return data;
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
                    dataSource: 'leaflet-providers'
                },
                type: "Feature"
            };
            BR.layerIndex[id] = obj;
        }

        BR.layerIndex['HikeBike.HillShading'].properties.overlay = true;
    },

    // own convention: key placeholder prefixed with 'key_'
    // e.g. ?api_key={keys_openrouteservice}
    getKeyName: function (url) {
        var name = null;
        var regex = /{keys_([^}]*)}/;
        var found;

        if (!url) return name;
        
        found = url.match(regex);
        if (found) {
            name = found[1];
        }

        return name;
    },

    addFirstLayer() {
        if (this._layers.length > 0) {
            this._map.addLayer(this._layers[0].layer);
        }
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
            zIndex: this._lastZIndex + 1
        };

        var keyName = this.getKeyName(url);
        if (keyName && BR.keys[keyName]) {
            options['keys_' + keyName] = BR.keys[keyName];
        }

        if (props.dataSource === 'leaflet-providers') {
            layer = L.tileLayer.provider(props.id);
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

        return layer
    },

    removeSelectedLayers: function () {
		for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
                this.saveLayers.push(obj);
            }
		}
    },

    restoreSelectedLayers: function (overlaysOnly) {
		for (var i = 0; i < this.saveLayers.length; i++) {
            var obj = this.saveLayers[i];

            if (!overlaysOnly || (overlaysOnly && obj.overlay)) {
                var hasLayer = !!this._getLayer(L.Util.stamp(obj.layer));
                if (hasLayer) {
                    if (!this._map.hasLayer(obj.layer)) {
                        this._map.addLayer(obj.layer);
                    }
                } else if (!obj.overlay) {
                    // saved base layer has been removed during preview, select first
                    this.addFirstLayer();
                }
            }
        }
        this.saveLayers = [];
    },

    removePreviewLayer: function () {
        if (this.previewLayer && this._map.hasLayer(this.previewLayer)) {
            this._map.removeLayer(this.previewLayer);
            this.previewLayer = null;
            return true;
        }
        return false;
    },

    deselectNode: function () {
        var selected = this.jstree.get_selected();
        if (selected.length > 0) {
            this.jstree.deselect_node(selected[0]);
        }
    },

    onBaselayerchange: function () {
        // execute after current input click handler, 
        // otherwise added overlay checkbox state doesn't update
        setTimeout(L.Util.bind(function () {
            this.removePreviewLayer();
            this.restoreSelectedLayers(true);
            this.deselectNode();
        }, this), 0);
    },

    showPreview: function (layer) {
        this._map.addLayer(layer);
        if (!this.removePreviewLayer()) {
            this.removeSelectedLayers();
            this._map.once('baselayerchange', this.onBaselayerchange, this);
        }
        this.previewLayer = layer;
    },

    hidePreview: function (layer) {
        this._map.off('baselayerchange', this.onBaselayerchange, this);
        this.removePreviewLayer();
        this.restoreSelectedLayers();
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
