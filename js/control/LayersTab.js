BR.LayersTab = BR.ControlLayers.extend({
    previewLayer: null,
    previewBounds: null,
    saveLayers: [],

    initialize: function (layersConfig, baseLayers, overlays, options) {
        L.Control.Layers.prototype.initialize.call(this, baseLayers, overlays, options);

        this.layersConfig = layersConfig;
    },

    addTo: function (map) {
        this._map = map;
        this.onAdd(map);

        L.DomUtil.get('layers-control-wrapper').appendChild(this._section);

        this.initOpacitySlider(map);
        this.initButtons();
        this.initJsTree();

        return this;
    },

    onAdd: function (map) {
        BR.ControlLayers.prototype.onAdd.call(this, map);

        map.on('baselayerchange overlayadd overlayremove', this.storeActiveLayers, this);
        map.on('overlayadd overlayremove', this.updateOpacityLabel, this);
    },

    onRemove: function (map) {
        BR.ControlLayers.prototype.onRemove.call(this, map);

        map.off('baselayerchange overlayadd overlayremove', this.storeActiveLayers, this);
        map.off('overlayadd overlayremove', this.updateOpacityLabel, this);
    },

    initOpacitySlider: function (map) {
        var self = this;
        var overlayOpacitySlider = new BR.OpacitySlider({
            id: 'overlay',
            reversed: false,
            orientation: 'horizontal',
            defaultValue: 1,
            title: i18next.t('layers.opacity-slider'),
            callback: function (opacity) {
                for (var i = 0; i < self._layers.length; i++) {
                    if (!self._layers[i].overlay || !map.hasLayer(self._layers[i].layer)) {
                        continue;
                    }
                    if (self._layers[i].layer.setOpacity) {
                        self._layers[i].layer.setOpacity(opacity);
                    } else {
                        self._layers[i].layer.setStyle({ opacity: opacity });
                    }
                }
            },
        });
        L.DomUtil.get('leaflet-control-layers-overlays-opacity-slider').appendChild(overlayOpacitySlider.getElement());
    },

    initButtons: function () {
        var expandTree = function (e) {
            this.jstree.open_all();
        };
        var collapseTree = function (e) {
            this.jstree.close_all();
        };

        var toggleOptionalLayers = function (e) {
            var button = L.DomUtil.get('optional_layers_button');
            var treeButtons = L.DomUtil.get('tree-button-group');
            var div = L.DomUtil.get('optional-layers');

            div.hidden = !div.hidden;
            treeButtons.hidden = !treeButtons.hidden;
            button.classList.toggle('active');

            if (div.hidden) {
                this.deselectNode();
            }
        };

        L.DomUtil.get('expand_tree_button').onclick = L.bind(expandTree, this);
        L.DomUtil.get('collapse_tree_button').onclick = L.bind(collapseTree, this);

        L.DomUtil.get('optional_layers_button').onclick = L.bind(toggleOptionalLayers, this);
    },

    initJsTree: function () {
        var layerIndex = BR.layerIndex;
        var treeData = this.toJsTree(BR.confLayers.tree);
        var oldSelected = null;

        var onSelectNode = function (e, data) {
            var layerData = layerIndex[data.node.id];
            var selected = data.selected[0];

            if (selected !== oldSelected) {
                this.showPreview(layerData);
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

            this.storeDefaultLayers();

            var ele = document.getElementById(data.node.a_attr.id);
            ele.classList.add('added');
            setTimeout(function () {
                ele.classList.remove('added');
            }, 1000);
        };

        var onUncheckNode = function (e, data) {
            var obj = this.getLayerById(data.node.id);
            if (!obj) return;

            this.removeLayer(obj.layer);

            if (this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
                if (!obj.overlay) {
                    this.activateFirstLayer();
                }
            }

            this.storeDefaultLayers();

            var ele = document.getElementById(data.node.a_attr.id);
            ele.classList.add('removed');
            setTimeout(function () {
                ele.classList.remove('removed');
            }, 1000);
        };

        $('#optional-layers-tree')
            .on('select_node.jstree', L.bind(onSelectNode, this))
            .on('deselect_node.jstree', L.bind(onDeselectNode, this))
            .on('check_node.jstree', L.bind(onCheckNode, this))
            .on('uncheck_node.jstree', L.bind(onUncheckNode, this))
            .on('ready.jstree', function (e, data) {
                data.instance.open_all();
            })
            .jstree({
                plugins: ['checkbox'],
                checkbox: {
                    whole_node: false,
                    tie_selection: false,
                },
                core: {
                    multiple: false,
                    themes: {
                        icons: true,
                        dots: false,
                    },
                    data: treeData,
                },
            });
        this.jstree = $('#optional-layers-tree').jstree(true);
    },

    toJsTree: function (layerTree) {
        var data = {
            children: [],
        };
        var self = this;

        function createRootNode(name) {
            var rootNode = {
                text: i18next.t('sidebar.layers.category.' + name, name),
                icon: false,
                state: {
                    disabled: true,
                },
                children: [],
            };
            return rootNode;
        }

        function getText(props, parent) {
            var text = '<span class="tree-text">';
            var code = props.country_code || props.language_code;
            if (code && parent.text !== code) {
                text += '<span class="tree-code">' + code + '</span>';
            }
            text += props.name;

            return text + '</span>';
        }

        function createNode(id, layerData, parent) {
            var props = layerData.properties;
            var url = props.url;
            var keyObj = self.layersConfig.getKeyName(url);
            var childNode = null;

            // when key required only add if configured
            if (!keyObj || (keyObj && BR.keys[keyObj.name])) {
                childNode = {
                    id: id,
                    text: getText(props, parent),
                    icon: self.layersConfig.getOverpassIconUrl(props.icon) || false,
                    state: {
                        checked: self.layersConfig.isDefaultLayer(id, props.overlay),
                    },
                };
            }
            return childNode;
        }

        function walkTree(inTree, outTree) {
            function walkObject(obj) {
                for (name in obj) {
                    var value = obj[name];
                    var rootNode = createRootNode(name);

                    outTree.children.push(rootNode);
                    walkTree(value, rootNode);
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
                            var childNode = createNode(entry, layer, outTree);
                            if (childNode) {
                                outTree.children.push(childNode);
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

        return data.children;
    },

    storeDefaultLayers: function () {
        var baseLayers = [];
        var overlays = [];

        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            // id set in LayersConfig.createLayer
            var id = obj.layer.id;

            // ignore built-in layers
            if (id && this.layersConfig.builtInLayers.indexOf(id) === -1) {
                if (obj.overlay) {
                    overlays.push(id);
                } else {
                    baseLayers.push(id);
                }
            }
        }

        this.layersConfig.storeDefaultLayers(baseLayers, overlays);
    },

    createLayer: function (layerData) {
        var layer = this.layersConfig.createLayer(layerData);
        var overlay = layerData.properties.overlay;

        // preview z-index, like in BR.ControlLayers._addLayer
        layer.options.zIndex = overlay ? this._lastZIndex + 1 : 0;

        return layer;
    },

    getLayerById: function (id) {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (obj.layer.id === id) {
                return obj;
            }
        }

        return null;
    },

    getLayerByLegacyName: function (legacyName) {
        var obj = null;
        var id = this.layersConfig.legacyNameToIdMap[legacyName];

        if (id) {
            obj = this.getLayerById(id);
        }

        return obj;
    },

    activateDefaultBaseLayer: function () {
        var index = BR.conf.defaultBaseLayerIndex || 0;
        var activeBaseLayer = this.getActiveBaseLayer();
        if (!activeBaseLayer) {
            this.activateBaseLayerIndex(index);
        }
    },

    saveRemoveActiveLayers: function () {
        this.saveLayers = this.removeActiveLayers();
    },

    restoreActiveLayers: function (overlaysOnly) {
        for (var i = 0; i < this.saveLayers.length; i++) {
            var obj = this.saveLayers[i];

            if (!overlaysOnly || (overlaysOnly && obj.overlay)) {
                var hasLayer = !!this._getLayer(L.Util.stamp(obj.layer));
                if (hasLayer) {
                    this.activateLayer(obj);
                } else if (!obj.overlay) {
                    // saved base layer has been removed during preview, select first
                    this.activateFirstLayer();
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

    showPreviewBounds: function (layerData) {
        if (layerData.geometry) {
            this.previewBounds = L.geoJson(layerData.geometry, {
                // fill/mask outside of bounds polygon with Leaflet.snogylop
                invert: true,
                // reduce unmasked areas appearing due to clipping while panning and zooming out
                renderer: L.svg({ padding: 1 }),
                color: '#333',
                fillOpacity: 0.4,
                weight: 2,
            }).addTo(this._map);
        }
    },

    removePreviewBounds: function () {
        if (this.previewBounds && this._map.hasLayer(this.previewBounds)) {
            this._map.removeLayer(this.previewBounds);
            this.previewBounds = null;
        }
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
        setTimeout(
            L.Util.bind(function () {
                this.removePreviewBounds();
                this.removePreviewLayer();
                this.restoreActiveLayers(true);
                this.deselectNode();
            }, this),
            0
        );
    },

    showPreview: function (layerData) {
        var layer = this.createLayer(layerData);
        this._map.addLayer(layer);
        this.removePreviewBounds();
        if (!this.removePreviewLayer()) {
            this.saveRemoveActiveLayers();
            this._map.once('baselayerchange', this.onBaselayerchange, this);
        }
        this.previewLayer = layer;

        this.showPreviewBounds(layerData);

        L.DomUtil.get('preview').hidden = false;
    },

    hidePreview: function (layer) {
        this._map.off('baselayerchange', this.onBaselayerchange, this);
        this.removePreviewBounds();
        this.removePreviewLayer();
        this.restoreActiveLayers();

        L.DomUtil.get('preview').hidden = true;
    },

    toLayerString: function (obj) {
        return obj.layer.id ? obj.layer.id : obj.name;
    },

    getLayerFromString: function (layerString) {
        var obj = this.getLayerById(layerString);

        if (!obj) {
            // fallback to name for custom and config layers
            obj = this.getLayer(layerString);

            if (!obj) {
                // legacy layer name support
                obj = this.getLayerByLegacyName(layerString);
            }
        }

        return obj;
    },

    storeActiveLayers: function () {
        if (BR.Util.localStorageAvailable()) {
            var objList = this.getActiveLayers();
            var idList = objList.map(
                L.bind(function (obj) {
                    return this.toLayerString(obj);
                }, this)
            );
            var str = JSON.stringify(idList);

            localStorage.setItem('map/activeLayers', str);
        }
    },

    loadActiveLayers: function () {
        if (BR.Util.localStorageAvailable()) {
            var item = localStorage.getItem('map/activeLayers');

            if (item) {
                var idList = JSON.parse(item);

                for (var i = 0; i < idList.length; i++) {
                    var id = idList[i];
                    var obj = this.getLayerFromString(id);

                    if (obj) {
                        this.activateLayer(obj);
                    }
                }
            }
        }
    },

    updateOpacityLabel: function () {
        var slider = $('#leaflet-control-layers-overlays-opacity-slider');
        var overlaysCount = this.getActiveLayers().length - 1;
        if (overlaysCount === 0) {
            slider.hide();
        } else {
            slider.show();
            slider.children()[1].innerText = i18next.t('sidebar.layers.overlay-opacity', { count: overlaysCount });
        }
    },
});

BR.layersTab = function (baseLayers, overlays, options) {
    return new BR.LayersTab(baseLayers, overlays, options);
};
