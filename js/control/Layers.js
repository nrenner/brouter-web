BR.Layers = L.Class.extend({
    _loadLayers: function () {
        this._customLayers = {};

        if (BR.Util.localStorageAvailable()) {
            var layers = JSON.parse(localStorage.getItem('map/customLayers'));
            for (a in layers) {
                this._addLayer(a, layers[a].layer, layers[a].isOverlay, layers[a].dataSource);
            }
        }
    },

    _loadTable: function () {
        var layersData = [];
        for (layer in this._customLayers) {
            if (this._customLayers[layer].dataSource === 'OverpassAPI') {
                layersData.push([
                    layer,
                    this._customLayers[layer].layer.options.query,
                    i18next.t('sidebar.layers.table.type_overpass_query'),
                ]);
            } else {
                var isOverlay = this._customLayers[layer].isOverlay;
                layersData.push([
                    layer,
                    this._customLayers[layer].layer._url,
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
                { title: i18next.t('sidebar.layers.table.URL') },
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

    _addFromInput: function (isOverlay, dataSource) {
        var layer_name = L.DomUtil.get('layer_name').value;
        var layer_url = L.DomUtil.get('layer_url').value;
        if (layer_name.length > 0 && layer_url.length > 0) this._addLayer(layer_name, layer_url, isOverlay, dataSource);
    },

    _addBaseLayer: function (evt) {
        this._addFromInput(false);
    },
    _addOverlay: function (evt) {
        this._addFromInput(true);
    },
    _addOverpassQuery: function (evt) {
        this._addFromInput(true, 'OverpassAPI');
    },

    _addLayer: function (layerName, layerUrl, isOverlay, dataSource) {
        if (layerName in this._layers) return;

        if (layerName in this._customLayers) return;

        try {
            var layer;

            if (dataSource === 'OverpassAPI') {
                layer = this._layersControl.layersConfig.createOverpassLayer(layerUrl);
            } else if (dataSource === 'OpenStreetMapNotesAPI') {
                layer = this._layersControl.layersConfig.createOpenStreetMapNotesLayer();
            } else {
                layer = L.tileLayer(layerUrl);
            }

            this._customLayers[layerName] = {
                layer: layer,
                isOverlay: isOverlay,
                dataSource: dataSource,
            };

            if (isOverlay) {
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
            localStorage.setItem(
                'map/customLayers',
                JSON.stringify(this._customLayers, function (k, v) {
                    if (v === undefined) {
                        return undefined;
                    }

                    if (v.dataSource === 'OverpassAPI') {
                        return {
                            dataSource: 'OverpassAPI',
                            isOverlay: true,
                            layer: v.layer.options.query,
                        };
                    }

                    // dont write Leaflet.Layer in localStorage; simply keep the URL
                    return v._url || v;
                })
            );
        }
    },
});
