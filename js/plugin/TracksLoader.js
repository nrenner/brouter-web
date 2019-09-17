BR.tracksLoader = function(map, layersControl) {
    TracksLoader = L.Control.FileLayerLoad.extend({
        options: {
            layer: L.geoJson,
            layerOptions: { style: { color: 'blue' } },
            addToMap: false,
            // File size limit in kb (default: 1024) ?
            fileSizeLimit: 1024
        },

        _initContainer: function() {
            var thisLoader = this.loader;

            var fileInput;
            var container = L.DomUtil.get('navbarLoadTracksContainer');

            // Create an invisible file input
            fileInput = L.DomUtil.create('input', 'hidden', container);
            fileInput.type = 'file';
            fileInput.multiple = 'multiple';
            if (!this.options.formats) {
                fileInput.accept = '.gpx,.kml,.json,.geojson';
            } else {
                fileInput.accept = this.options.formats.join(',');
            }
            fileInput.style.display = 'none';
            // Load on file change
            fileInput.addEventListener(
                'change',
                function() {
                    thisLoader.loadMultiple(this.files);
                    // reset so that the user can upload the same file again if they want to
                    this.value = '';
                },
                false
            );

            var link = L.DomUtil.get('navbarLoadTracks');
            L.DomEvent.disableClickPropagation(link);
            L.DomEvent.on(link, 'click', function(e) {
                fileInput.click();
                e.preventDefault();
            });
            // dummy, no own representation, triggered in loading menu
            return L.DomUtil.create('div');
        }
    });
    var tracksLoaderControl = new TracksLoader();
    tracksLoaderControl.addTo(map);

    tracksLoaderControl.loader.on('data:loaded', function(event) {
        var layer = event.layer;
        layersControl.addOverlay(layer, event.filename);
        layer.addTo(map);
    });

    tracksLoaderControl.loader.on('data:error', function(event) {
        var err = event.error;
        BR.message.showError(
            i18next.t('warning.tracks-load-error', {
                error: err && err.message ? err.message : err
            })
        );
    });

    return tracksLoaderControl;
};
