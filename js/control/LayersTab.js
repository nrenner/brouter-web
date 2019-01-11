BR.LayersTab = L.Control.Layers.extend({
    addTo: function (map) {
        this._map = map;
        this.onAdd(map);
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
                    'data' : [
                        { 
                            text: 'Simple root node',
                            'state' : {
                                'disabled' : true
                            },
                            'children' : [
                                'Child 1'
                            ]   
                        },
                        {
                            'text' : 'Root node 2',
                            'state' : {
                                'opened' : true,
                                //'selected' : true
                                'disabled' : true
                            },
                            'children' : [
                                { 'text' : 'Child 1' },
                                'Child 2'
                            ]
                        }
                    ]
                }
            });
        return this;
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
