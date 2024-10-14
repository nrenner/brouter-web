BR.ControlLayers = L.Control.Layers.extend({
    getActiveLayers() {
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

    getActiveBaseLayer() {
        var activeLayers = this.getActiveLayers();
        for (var i = 0; i < activeLayers.length; i++) {
            var obj = activeLayers[i];
            if (!obj.overlay) {
                return obj;
            }
        }

        return null;
    },

    removeActiveLayers() {
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

    getLayer(name) {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (obj.name === name) {
                return obj;
            }
        }

        return null;
    },

    getBaseLayers() {
        return this._layers.filter(function (obj) {
            return !obj.overlay;
        });
    },

    activateLayer(obj) {
        if (!this._map.hasLayer(obj.layer)) {
            this._map.addLayer(obj.layer);
        }
    },

    activateFirstLayer() {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (!obj.overlay) {
                this.activateLayer(obj);
                break;
            }
        }
    },

    activateBaseLayerIndex(index) {
        var baseLayers = this.getBaseLayers();
        var obj = baseLayers[index];

        this.activateLayer(obj);
    },

    _addLayer(layer, name, overlay) {
        L.Control.Layers.prototype._addLayer.call(this, layer, name, overlay);

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
