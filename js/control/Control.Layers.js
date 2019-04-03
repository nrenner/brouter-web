BR.ControlLayers = L.Control.Layers.extend({

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

    activateLayer: function (layer) {
        this._map.addLayer(layer);
    },

    activateFirstLayer: function () {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (!obj.overlay) {
                this._map.addLayer(obj.layer);
                break;
            }
        }
    },

    activateBaseLayerIndex: function (index) {
        var baseLayers = this.getBaseLayers();
        var obj = baseLayers[index];

        this.activateLayer(obj.layer);
    }

});