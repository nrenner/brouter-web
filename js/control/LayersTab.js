BR.LayersTab = L.Control.Layers.extend({
    addTo: function (map) {
        this._map = map;
        this.onAdd(map);
        L.DomUtil.get('layers-control-wrapper').appendChild(this._form);
        return this;
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
