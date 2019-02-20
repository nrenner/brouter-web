BR.LayersTab = L.Control.Layers.extend({
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
                            'text' : layerIndex[layerId].properties.name
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
                'World-wide international': [
                    'standard',
                    'OpenTopoMap',
                    'stamen-terrain-background',
                    'HDM_HOT',
                    'wikimedia-map',
                    'opencylemap'
                ],
                'World-wide monolingual': [
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
        var data = toJsTree(structure);

        L.DomUtil.get('layers-control-wrapper').appendChild(this._form);
        $('#optional-layers-tree')
            .on('select_node.jstree', function (e, data) {
                //console.log('selected: ', data);
                console.log('selected: ' + data.node.text);
            })
            .on('check_node.jstree', function (e, data) {
                //console.log('selected: ', data);
                console.log('checked: ' + data.node.text);
            })
            .on('uncheck_node.jstree', function (e, data) {
                //console.log('selected: ', data);
                console.log('unchecked: ' + data.node.text);
            })
            .jstree({
                plugins: [ 'checkbox' ],
                checkbox: {
                    whole_node: false,
                    tie_selection: false 
                },
                core: {
                    'themes': {
                        'icons': false,
                        dots : false
                    },
                    'data' : data
                }
            });
        return this;
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
