BR.LayersTab = L.Control.Layers.extend({
    previewLayer: null,

    addTo: function (map) {
        this._map = map;
        this.onAdd(map);

        var layerIndex = BR.layerIndex;

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
                    'stamen-terrain-background',
                    'HDM_HOT',
                    'wikimedia-map',
                    'opencylemap'
                ],
                'Worldwide monolingual': [
                    'osm-mapnik-german_style',
                    'osmfr'
                ],
                'Europe': [
                ],
                'Country': [
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

        var onSelectNode = L.bind(function (e, data) {
            //console.log('selected: ', data);
            console.log('selected: ' + data.node.text);
            var layerData = layerIndex[data.node.id];
            this.showLayer(this.createLayer(layerData));
        }, this);

        L.DomUtil.get('layers-control-wrapper').appendChild(this._form);
        $('#optional-layers-tree')
            .on('select_node.jstree', onSelectNode)
            .on('check_node.jstree', function (e, data) {
                //console.log('selected: ', data);
                console.log('checked: ' + data.node.text);
            })
            .on('uncheck_node.jstree', function (e, data) {
                //console.log('selected: ', data);
                console.log('unchecked: ' + data.node.text);
            })
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

    createLayer: function (layerData) {
        var props = layerData.properties;

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

        var url = convertUrlJosm(props.url);

        var layer = L.tileLayer(url, {
            maxNativeZoom: props.max_zoom,
            maxZoom: this._map.getMaxZoom(),
            subdomains: getSubdomains(props.url),
            zIndex: this._lastZIndex + 1
        });

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
