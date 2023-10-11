BR.Layers = L.Class.extend({
    _loadLayers: function () {
        this._customLayers = {};

        if (BR.Util.localStorageAvailable()) {
            var layers = JSON.parse(localStorage.getItem('map/customLayers'));
            if (layers?.type == 'FeatureCollection') {
                for (const layerData of layers.features) {
                    this._addLayer(layerData);
                }
            }
            // convert legacy custom format to GeoJSON Feature
            else {
                for (a in layers) {
                    var layerData = {
                        geometry: null,
                        properties: {
                            name: a,
                            overlay: layers[a].isOverlay,
                            dataSource: layers[a].dataSource,
                            query: layers[a].dataSource === 'OverpassAPI' ? layers[a].layer : undefined,
                            url: layers[a].layer,
                        },
                    };
                    this._addLayer(layerData);
                }
            }
        }
    },

    _loadTable: function () {
        var layersData = [];
        for (layer in this._customLayers) {
            var layerProps = this._customLayers[layer].layerData.properties;
            if (layerProps.dataSource === 'OverpassAPI') {
                layersData.push([layer, layerProps.query, i18next.t('sidebar.layers.table.type_overpass_query')]);
            } else {
                var isOverlay = layerProps.overlay;
                layersData.push([
                    layer,
                    layerProps.url,
                    isOverlay
                        ? i18next.t('sidebar.layers.table.type_overlay')
                        : i18next.t('sidebar.layers.table.type_layer'),
                ]);
            }
        }
        if (this._layersTable != null) {
            this._layersTable.destroy();
        }
        this._layersTable = $('#custom_layers_table').DataTable({
            data: layersData,
            info: false,
            searching: false,
            bAutoWidth: false,
            paging: false,
            language: {
                emptyTable: i18next.t('sidebar.layers.table.empty'),
            },
            columns: [
                { title: i18next.t('sidebar.layers.table.name') },
                { title: i18next.t('sidebar.layers.table.URL'), className: 'custom_layers_url' },
                { title: i18next.t('sidebar.layers.table.type') },
            ],
        });
    },

    init: function (map, layersControl, baseLayers, overlays) {
        this._layersControl = layersControl;
        this._map = map;
        this._layers = {};
        for (var l in overlays) this._layers[l] = [overlays[l], true];
        for (var l in baseLayers) this._layers[l] = [baseLayers[l], false];

        L.DomUtil.get('custom_layers_add_base').onclick = L.bind(this._addBaseLayer, this);
        L.DomUtil.get('custom_layers_add_overlay').onclick = L.bind(this._addOverlay, this);
        L.DomUtil.get('custom_layers_add_overpass').onclick = L.bind(this._addOverpassQuery, this);
        L.DomUtil.get('custom_layers_remove').onclick = L.bind(this._remove, this);

        this._loadLayers();
        this._loadTable();

        var table = this._layersTable;
        $('#custom_layers_table tbody').on('click', 'tr', function () {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                table.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');
            }
        });

        L.DomUtil.get('custom_layers_button').onclick = function () {
            $('#custom_layers').modal();
        };
    },

    _remove: function (evt) {
        var row = this._layersTable.row('.selected').data();
        if (row != null) {
            var name = row[0];
            this._layersControl.removeLayer(this._customLayers[name].layer);
            this._map.removeLayer(this._customLayers[name].layer);
            delete this._customLayers[name];
            this._layersTable.row('.selected').remove().draw(false);
            this._sync();
        }
    },

    _addFromInput: function (layerProps) {
        var layer_name = L.DomUtil.get('layer_name').value;
        var layer_url = L.DomUtil.get('layer_url').value;

        var layerData = {
            geometry: null,
            properties: {
                ...layerProps,
                name: L.DomUtil.get('layer_name').value,
            },
            type: 'Feature',
        };

        if (layer_name.length > 0 && layer_url.length > 0) this._addLayer(layerData);
    },

    _addBaseLayer: function (evt) {
        var layerProps = {
            type: 'tms',
            url: L.DomUtil.get('layer_url').value,
        };
        this._addFromInput(layerProps);
    },
    _addOverlay: function (evt) {
        var layerProps = {
            type: 'tms',
            url: L.DomUtil.get('layer_url').value,
            overlay: true,
        };
        this._addFromInput(layerProps);
    },
    _addOverpassQuery: function (evt) {
        var layerProps = {
            overlay: true,
            dataSource: 'OverpassAPI',
            query: L.DomUtil.get('layer_url').value,
        };
        this._addFromInput(layerProps);
    },

    _createTmsProps: function (props) {
        var tmsProps = {
            type: 'tms',
            ...props,
        };
        return tmsProps;
    },

    _addLayer: function (layerData) {
        var props = layerData.properties;
        var layerName = props.name;

        if (layerName in this._layers) return;

        if (layerName in this._customLayers) return;

        try {
            var layer = this._layersControl.layersConfig.createLayer(layerData);

            this._customLayers[layerName] = {
                layer: layer,
                layerData: layerData,
            };

            if (props.overlay) {
                this._layersControl.addOverlay(layer, layerName);
            } else {
                this._layersControl.addBaseLayer(layer, layerName);
            }
            this._loadTable();
            this._sync();
            return layer;
        } catch (e) {
            console.warn('Oops:', e);
            return;
        }
    },

    _sync: function () {
        if (BR.Util.localStorageAvailable()) {
            var geojson = {
                type: 'FeatureCollection',
                features: Object.values(this._customLayers).map((layer) => layer.layerData),
            };
            localStorage.setItem('map/customLayers', JSON.stringify(geojson));
        }
    },
});
