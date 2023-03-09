// Appearance control is based upon code from https://github.com/Kanahiro/Leaflet.Control.Appearance
L.Control.Appearance = L.Control.extend({
    options: {
        collapsed: false,
        position: 'topright',
        label: null,
        radioCheckbox: true,
        layerName: true,
        opacity: false,
        color: false,
        remove: false,
        removeIcon: null,
    },
    initialize: function (baseLayers, uneditableOverlays, overlays, options) {
        L.Util.setOptions(this, options);
        this._layerControlInputs = [];
        this._layers = [];
        this._lastZIndex = 0;
        this._handlingClick = false;

        for (var i in baseLayers) {
            this._addLayer(baseLayers[i], i);
        }
        for (var i in uneditableOverlays) {
            this._addLayer(uneditableOverlays[i], i, true, true);
        }
        for (var i in overlays) {
            this._addLayer(overlays[i], i, true);
        }
    },
    onAdd: function (map) {
        this._initLayout();
        this._update();
        return this._container;
    },
    // @method addOverlay(layer: Layer, name: String): this
    // Adds an overlay (checkbox entry) with the given name to the control.
    addOverlay: function (layer, name, unremovable) {
        this._addLayer(layer, name, true, unremovable);
        return this._map ? this._update() : this;
    },
    addBaseLayer: function (layer, name) {
        this._addLayer(layer, name);
        return this._map ? this._update() : this;
    },
    _onLayerChange: function (e) {
        if (!this._handlingClick) {
            this._update();
        }

        var obj = this._getLayer(Util.stamp(e.target));

        // @namespace Map
        // @section Layer events
        // @event baselayerchange: LayersControlEvent
        // Fired when the base layer is changed through the [layer control](#control-layers).
        // @event overlayadd: LayersControlEvent
        // Fired when an overlay is selected through the [layer control](#control-layers).
        // @event overlayremove: LayersControlEvent
        // Fired when an overlay is deselected through the [layer control](#control-layers).
        // @namespace Control.Layers
        var type = obj.overlay
            ? e.type === 'add'
                ? 'overlayadd'
                : 'overlayremove'
            : e.type === 'add'
            ? 'baselayerchange'
            : null;

        if (type) {
            this._map.fire(type, obj);
        }
    },
    _initLayout: function () {
        var className = 'leaflet-control-layers',
            container = (this._container = L.DomUtil.create('div', className + '-list')),
            collapsed = this.options.collapsed;
        container.setAttribute('aria-haspopup', true);
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        if (this.options.label) {
            var labelP = L.DomUtil.create('p', className + '-label');
            labelP.innerHTML = this.options.label;
            container.appendChild(labelP);
        }
        var form = (this._form = L.DomUtil.create('form', className + '-list'));
        this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
        this._separator = L.DomUtil.create('div', className + '-separator', form);
        this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);
        container.appendChild(form);
    },
    _update: function () {
        if (!this._container) {
            return this;
        }
        L.DomUtil.empty(this._baseLayersList);
        L.DomUtil.empty(this._overlaysList);
        this._layerControlInputs = [];
        var baseLayersPresent,
            overlaysPresent,
            i,
            obj,
            baseLayersCount = 0;
        for (i = 0; i < this._layers.length; i++) {
            obj = this._layers[i];
            this._addItem(obj);
            overlaysPresent = overlaysPresent || obj.overlay;
            baseLayersPresent = baseLayersPresent || !obj.overlay;
            baseLayersCount += !obj.overlay ? 1 : 0;
        }
        this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
        return this;
    },
    _getLayer: function (id) {
        for (var i = 0; i < this._layers.length; i++) {
            if (this._layers[i] && L.Util.stamp(this._layers[i].layer) === id) {
                return this._layers[i];
            }
        }
    },
    _addLayer: function (layer, name, overlay, uneditable) {
        this._layers.push({
            layer: layer,
            name: name,
            overlay: overlay,
            uneditable: uneditable,
        });
    },
    _removeLayer: function (id) {
        for (var i = 0; i < this._layers.length; i++) {
            if (this._layers[i] && L.Util.stamp(this._layers[i].layer) === id) {
                this._layers.splice(i, 1);
                break;
            }
        }
    },
    _addItem: function (obj) {
        var label = document.createElement('label'),
            checked = this._map.hasLayer(obj.layer),
            layerName = obj.name;
        (opacity = obj.layer.options.opacity), (color = obj.layer.options.color), (elements = []);

        if (!color && obj.layer.options.style) {
            var s = obj.layer.options.style();
            if (s.color) {
                color = s.color;
            }
        }
        //HTML Elements for OVERLAY
        if (obj.overlay) {
            if (this.options.radioCheckbox) {
                elements.push(this._createCheckboxElement('leaflet-control-layers-selector', checked));
            }
            if (this.options.layerName) {
                elements.push(this._createNameElement('leaflet-control-layers-name', layerName));
            }
            if (this.options.opacity) {
                elements.push(this._createRangeElement('leaflet-control-layers-range', opacity));
            }
            if (this.options.color && !obj.uneditable) {
                elements.push(this._createColorElement('leaflet-control-layers-color', color));
            }
            if (this.options.remove && !obj.uneditable) {
                elements.push(this._createRemoveElement('leaflet-control-layers-remove'));
            }
        } else {
            if (this.options.radioCheckbox) {
                elements.push(this._createRadioElement('leaflet-control-layers-selector', checked));
            }
            if (this.options.layerName) {
                elements.push(this._createNameElement('leaflet-control-layers-name', layerName));
            }
        }
        var holder = document.createElement('div');
        //holder.style = "display: flex; align-items: baseline;";
        label.appendChild(holder);
        for (var i = 0; i < elements.length; i++) {
            holder.appendChild(elements[i]);
            if (i == 1) {
                continue;
            } //layer name don't need UI
            this._layerControlInputs.push(elements[i]);
            elements[i].layerId = L.Util.stamp(obj.layer);
            switch (elements[i].className) {
                case 'leaflet-control-layers-range':
                    L.DomEvent.on(elements[i], 'input', this._onRangeClick, this);
                    break;
                case 'leaflet-control-layers-selector':
                    L.DomEvent.on(elements[i], 'change', this._onRadioCheckboxClick, this);
                    break;
                case 'leaflet-control-layers-color':
                    L.DomEvent.on(elements[i], 'change', this._onColorClick, this);
                    break;
                case 'leaflet-control-layers-remove':
                    L.DomEvent.on(elements[i], 'change', this._onRemoveClick, this);
                    break;
            }
        }
        var container = obj.overlay ? this._overlaysList : this._baseLayersList;
        container.appendChild(label);
        return label;
    },
    _createRadioElement: function (name, checked) {
        var radioHtml =
            '<input type="radio" class="leaflet-control-layers-selector" name="' +
            name +
            '"' +
            (checked ? ' checked="checked"' : '') +
            '/>';
        var radioFragment = document.createElement('div');
        radioFragment.innerHTML = radioHtml;
        return radioFragment.firstChild;
    },
    _createCheckboxElement: function (name, checked) {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = name;
        input.defaultChecked = checked;
        return input;
    },
    _createNameElement: function (name, layerName) {
        var nameLabel = document.createElement('span');
        //nameLabel.style.display = "inline-block";
        nameLabel.style.width = '100px';
        nameLabel.style.margin = '0 5 0 5';
        nameLabel.style.overflow = 'hidden';
        nameLabel.style.verticalAlign = 'middle';
        nameLabel.innerHTML = ' ' + layerName;
        return nameLabel;
    },
    _createRangeElement: function (name, opacity) {
        input = document.createElement('input');
        input.type = 'range';
        input.style.width = '50px';
        input.className = name;
        input.min = 0;
        input.max = 100;
        input.value = opacity * 100;
        return input;
    },
    _createColorElement: function (name, color) {
        var colorHtml =
            '<input type="color" class="leaflet-control-layers-color" value="' +
            color +
            '"' +
            'list="data1"/ style="width:50px; margin:0 5 0 5;">';
        var colorFragment = document.createElement('div');
        colorFragment.innerHTML = colorHtml;
        return colorFragment.firstChild;
    },
    _createRemoveElement: function (name, imgUrl) {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = name;
        input.defaultChecked = true;
        imgUrl = this.options.removeIcon;
        if (imgUrl) {
            input.style =
                '-webkit-appearance:none; background:url(' +
                imgUrl +
                '); width:1rem; height:1rem; background-size: contain;';
        }
        return input;
    },
    _onRadioCheckboxClick: function () {
        var inputs = this._layerControlInputs,
            input,
            layer;
        var addedLayers = [],
            removedLayers = [];

        this._handlingClick = true;
        for (var i = 0; i < inputs.length; i++) {
            input = inputs[i];
            if (input.className != 'leaflet-control-layers-selector') {
                continue;
            }
            layer = this._getLayer(input.layerId).layer;

            if (input.checked) {
                this._map.addLayer(layer);
            } else if (!input.checked) {
                this._map.removeLayer(layer);
            }
        }

        for (i = 0; i < removedLayers.length; i++) {
            if (this._map.hasLayer(removedLayers[i])) {
                this._map.removeLayer(removedLayers[i]);
            }
        }
        for (i = 0; i < addedLayers.length; i++) {
            if (!this._map.hasLayer(addedLayers[i])) {
                this._map.addLayer(addedLayers[i]);
            }
        }

        this._handlingClick = false;

        this._refocusOnMap();
    },
    _onRangeClick: function () {
        var inputs = this._layerControlInputs,
            input,
            layer;

        this._handlingClick = true;

        for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            if (input.className != 'leaflet-control-layers-range') {
                continue;
            }
            layer = this._getLayer(input.layerId).layer;
            //undefined = overlay, not undefined = tilemap
            if (typeof layer._url === 'undefined') {
                var rangeVal = parseFloat(parseInt(input.value / 10) / 10);
                var style = { opacity: rangeVal, fillOpacity: rangeVal / 2 };
                layer.setStyle(style);
                layer.options.opacity = rangeVal;
                layer.options.fillOpacity = rangeVal / 2;
            } else {
                layer.setOpacity(input.value / 100);
            }
        }
        this._handlingClick = false;
        this._refocusOnMap();
    },
    _onColorClick: function () {
        var inputs = this._layerControlInputs,
            input,
            layer;

        this._handlingClick = true;
        for (var i = 0; i < inputs.length; i++) {
            input = inputs[i];
            if (input.className != 'leaflet-control-layers-color') {
                continue;
            }
            layer = this._getLayer(input.layerId).layer;
            //not tilemap
            if (typeof layer._url === 'undefined') {
                var style = {
                    color: input.value,
                    opacity: layer.options.opacity,
                    fillOpacity: layer.options.fillOpacity,
                };
                layer.setStyle(style);
                layer.options.color = input.value;
            }
        }
        this._handlingClick = false;
        this._update();
        this._refocusOnMap();
    },
    _onRemoveClick: function () {
        var inputs = this._layerControlInputs,
            input,
            layer;

        this._handlingClick = true;
        for (var i = 0; i < inputs.length; i++) {
            input = inputs[i];
            if (input.className != 'leaflet-control-layers-remove') {
                continue;
            }
            if (!input.checked) {
                layer = this._getLayer(input.layerId).layer;
                this._map.removeLayer(layer);
                this._removeLayer(input.layerId);
                break;
            }
        }
        this._handlingClick = false;
        this._update();
        this._refocusOnMap();
    },
});

BR.ControlLayers = L.Control.Appearance.extend({
    getActiveLayers: function () {
        var result = [];
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (this._map.hasLayer(obj.layer)) {
                if (obj.overlay) {
                    result.push(obj);
                } else {
                    result.unshift(obj);
                }
            }
        }
        return result;
    },

    getActiveBaseLayer: function () {
        var activeLayers = this.getActiveLayers();
        for (var i = 0; i < activeLayers.length; i++) {
            var obj = activeLayers[i];
            if (!obj.overlay) {
                return obj;
            }
        }

        return null;
    },

    removeActiveLayers: function () {
        var removed = [];

        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
                removed.push(obj);
            }
        }

        return removed;
    },

    getLayer: function (name) {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (obj.name === name) {
                return obj;
            }
        }

        return null;
    },

    getBaseLayers: function () {
        return this._layers.filter(function (obj) {
            return !obj.overlay;
        });
    },

    activateLayer: function (obj) {
        if (!this._map.hasLayer(obj.layer)) {
            this._map.addLayer(obj.layer);
            this._update();
        }
    },

    activateFirstLayer: function () {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (!obj.overlay) {
                this.activateLayer(obj);
                break;
            }
        }
    },

    activateBaseLayerIndex: function (index) {
        var baseLayers = this.getBaseLayers();
        var obj = baseLayers[index];

        this.activateLayer(obj);
    },

    _addLayer: function (layer, name, overlay, uneditable) {
        L.Control.Appearance.prototype._addLayer.call(this, layer, name, overlay, uneditable);

        // override z-index assignment to fix that base layers added later
        // are on top of overlays; set all base layers to 0
        if (this.options.autoZIndex && layer.setZIndex) {
            if (!overlay) {
                // undo increase in super method
                this._lastZIndex--;

                layer.setZIndex(0);
            }
        }
    },
});
