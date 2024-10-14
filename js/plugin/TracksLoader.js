BR.tracksLoader = function (map, layersControl, routing, pois) {
    // proxy to L.geoJSON factory function, to get hold of raw GeoJSON object
    var createGeoJsonLayer = function (geojson, options) {
        BR.Track.addPoiMarkers(pois, geojson);

        return L.geoJSON(geojson, options);
    };

    TracksLoader = L.Control.FileLayerLoad.extend({
        options: {
            // `layer` allows to use a customized version of `L.geoJson` with the same signature
            layer: createGeoJsonLayer,
            layerOptions: BR.Track.getGeoJsonOptions(layersControl, true),
            addToMap: false,
            // File size limit in kb (default: 1024) ?
            fileSizeLimit: BR.conf.trackSizeLimit || 1024 * 10,
            shortcut: {
                open: 79, // char code for 'o'
            },
        },

        _initContainer() {
            var thisLoader = this.loader;

            var fileInput;
            var container = L.DomUtil.get('navbarLoadTracksContainer');

            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

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
                function () {
                    thisLoader.loadMultiple(this.files);
                    // reset so that the user can upload the same file again if they want to
                    this.value = '';
                },
                false
            );

            var link = L.DomUtil.get('navbarLoadTracks');
            L.DomEvent.disableClickPropagation(link);
            L.DomEvent.on(link, 'click', function (e) {
                fileInput.click();
                e.preventDefault();
            });
            // dummy, no own representation, triggered in loading menu
            var dummy = L.DomUtil.create('div');
            dummy.hidden = true;
            return dummy;
        },

        _keydownListener(e) {
            if (
                BR.Util.keyboardShortcutsAllowed(e) &&
                e.keyCode === this.options.shortcut.open &&
                false === e.shiftKey
            ) {
                $('#navbarLoadTracks')[0].click();
            }
        },
    });

    // make sure tracks are always shown below route by adding a custom pane below `leaflet-overlay-pane`
    map.createPane('tracks');
    map.getPane('tracks').style.zIndex = 350;

    var tracksLoaderControl = new TracksLoader();
    tracksLoaderControl.addTo(map);

    tracksLoaderControl.loader.on('data:loaded', function (event) {
        var eventLayer = event.layer,
            routingMarkers = [];
        /* disabled for now, see issue #254
        for (var layerIdx = 0; layerIdx < eventLayer.getLayers().length; layerIdx++) {
            var layer = eventLayer.getLayers()[layerIdx];
            if (layer.feature && layer.feature.properties && layer.feature.properties.type) {
                var layerType = layer.feature.properties.type;
                if (layerType === 'from' || layerType === 'via' || layerType === 'to') {
                    routingMarkers.push(layer.getLatLng());
                }
            }
        }
        if (routingMarkers.length > 0) {
            routing.setWaypoints(routingMarkers, function(event) {
                var err = event.error;
                BR.message.showError(
                    i18next.t('warning.tracks-load-error', {
                        error: err && err.message ? err.message : err
                    })
                );
            });
        }
        */
        layersControl.addOverlay(eventLayer, event.filename);
        eventLayer.addTo(map);
    });

    tracksLoaderControl.loader.on('data:error', function (event) {
        var err = event.error;
        BR.message.showError(
            i18next.t('warning.tracks-load-error', {
                error: err && err.message ? err.message : err,
            })
        );
        console.error(err);
    });

    return tracksLoaderControl;
};
