BR.stravaSegments = function(map, layersControl) {
    var stravaControl = L.control
        .stravaSegments({
            runningTitle: i18next.t('map.strava-shortcut', { action: '$t(map.strava-running)', key: 'S' }),
            bikingTitle: i18next.t('map.strava-shortcut', { action: '$t(map.strava-biking)', key: 'S' }),
            loadingTitle: i18next.t('map.loading'),
            stravaToken: BR.keys.strava
        })
        .addTo(map);
    layersControl.addOverlay(stravaControl.stravaLayer, i18next.t('map.layer.strava-segments'));
    stravaControl.onError = function(err) {
        BR.message.showError(
            i18next.t('warning.strava-error', {
                error: err && err.message ? err.message : err
            })
        );
    };

    L.setOptions(this, {
        shortcut: {
            toggleLayer: 83 // char code for 's'
        }
    });

    // hide strava buttons when layer is inactive
    var toggleStravaControl = function() {
        var stravaBar = stravaControl.runningButton.button.parentElement;
        stravaBar.hidden = !stravaBar.hidden;
    };
    toggleStravaControl();
    stravaControl.stravaLayer.on('add remove', toggleStravaControl);

    L.DomEvent.addListener(
        document,
        'keydown',
        function(e) {
            if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.toggleLayer) {
                if (map.hasLayer(stravaControl.stravaLayer)) {
                    map.removeLayer(stravaControl.stravaLayer);
                } else {
                    map.addLayer(stravaControl.stravaLayer);
                }
            }
        },
        this
    );

    return stravaControl;
};
