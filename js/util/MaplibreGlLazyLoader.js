/**
 * Only load Maplibre bundles when layer is actually added, using dynamic imports
 */
BR.MaplibreGlLazyLoader = L.Layer.extend({
    initialize: function (options) {
        this.options = options;
    },

    onAdd: function (map) {
        if (!('maplibreGL' in L)) {
            this._load();
        } else {
            this._addGlLayer();
        }
        return this;
    },

    onRemove: function (map) {
        this._map.removeLayer(this.glLayer);
        this.glLayer = null;
        return this;
    },

    // needed when overlay, also requires `position: absolute` (see css)
    setZIndex: function (zIndex) {
        this.options.zIndex = zIndex;
        return this;
    },

    setOpacity: function (opacity) {
        if (this.glLayer) {
            const glMap = this.glLayer.getMaplibreMap();
            if (glMap.getLayer('hillshading')) {
                glMap.setPaintProperty('hillshading', 'hillshade-exaggeration', opacity);
            } else {
                glMap.getCanvas().style.opacity = opacity;
            }
        }
    },

    _load: async function () {
        await import('./maplibre-gl.js');
        await import('./leaflet-maplibre-gl.js');

        this._addGlLayer();
    },

    _addGlLayer: function () {
        this.glLayer = L.maplibreGL(this.options);
        this._map.addLayer(this.glLayer);

        this._updateZIndex();
    },

    _updateZIndex: function () {
        if (this.glLayer && this.glLayer.getContainer() && this.options.zIndex != null) {
            this.glLayer.getContainer().style.zIndex = this.options.zIndex;
        }
    },
});

BR.maplibreGlLazyLoader = function (options) {
    return new BR.MaplibreGlLazyLoader(options);
};
