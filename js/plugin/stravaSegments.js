BR.stravaSegments = function(map, layersControl) {
    var stravaControl = L.control
        .stravaSegments({
            runningTitle: i18next.t('map.strava-running'),
            bikingTitle: i18next.t('map.strava-biking'),
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

    // hide strava buttons when layer is inactive
    var toggleStravaControl = function() {
        var stravaBar = stravaControl.runningButton.button.parentElement;
        stravaBar.hidden = !stravaBar.hidden;
    };
    toggleStravaControl();
    stravaControl.stravaLayer.on('add remove', toggleStravaControl);

    return stravaControl;
};
