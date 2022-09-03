(function () {
    // import() uses path relative to calling script, script injection relative to index.html,
    // so figure out script-relative path without hard-coding it (only as fallback) for the latter
    // eslint-disable-next-line
    const baseUrl = document.currentScript?.src.split('/').slice(0, -1).join('/') || window.location.origin + '/dist';
    const getAbsoluteScriptUrl = (src) => new URL(src, baseUrl + '/').href;

    // simple custom import() polyfill that doesn't need module support and can't load modules
    // (derived from various sources)
    function importPolyfill(src) {
        return new Promise((resolve, reject) => {
            try {
                // `import` is a reserved keyword even in old browsers not supporting it,
                // so it needs to be evaluated at runtime, otherwise causes a parse error on load
                new Function('return import("' + src + '")')().then(() => resolve());
            } catch (e) {
                const url = getAbsoluteScriptUrl(src);
                var script = document.createElement('script');
                script.onload = () => {
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error(`Error importing: "${url}"`));
                    script.remove();
                };
                script.src = url;
                document.body.appendChild(script);
            }
        });
    }

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
            if (this.glLayer) {
                this._map.removeLayer(this.glLayer);
            }
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
            await importPolyfill('./maplibre-gl.js');
            await importPolyfill('./leaflet-maplibre-gl.js');

            this._addGlLayer();
        },

        _addGlLayer: function () {
            this.glLayer = L.maplibreGL(this.options);
            // see LayersConfig.createLayer
            this.glLayer.getAttribution = function () {
                return this.options.mapLink;
            };
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
})();
