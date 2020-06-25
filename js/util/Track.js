/**
 * Track loading commons
 */
BR.Track = {
    /**
     * Returns common options for styling and appearance of tracks
     *
     * @param {BR.ControlLayers} layersControl Layers control instance
     *
     * @returns {Object} to pass as `options` parameter to `L.geoJson`
     */
    getGeoJsonOptions: function(layersControl) {
        return {
            style: function(geoJsonFeature) {
                var currentLayerId = layersControl.getActiveBaseLayer().layer.id;
                return {
                    color: currentLayerId === 'cyclosm' ? 'yellow' : 'blue',
                    weight: 4
                };
            },
            interactive: false,
            filter: function(geoJsonFeature) {
                // remove POIs, added separately
                return !BR.Track.isPoiPoint(geoJsonFeature);
            },
            pointToLayer: function(geoJsonPoint, latlng) {
                // route waypoint (type=from/via/to)
                return L.marker(latlng, {
                    interactive: false,
                    opacity: 0.7,
                    // prevent being on top of route markers
                    zIndexOffset: -1000
                });
            }
        };
    },

    /**
     * Add Points in the passed `geoJson` as POI markers, except route waypoints (type=from|via|to)
     *
     * @param {BR.PoiMarkers} pois POI control instance
     * @param {Object} geoJson GeoJSON object
     */
    addPoiMarkers: function(pois, geoJson) {
        turf.featureEach(geoJson, function(feature, idx) {
            if (BR.Track.isPoiPoint(feature)) {
                var coord = turf.getCoord(feature);
                var latlng = L.GeoJSON.coordsToLatLng(coord);
                var name = '';
                if (feature.properties && feature.properties.name) name = feature.properties.name;
                pois.addMarker(latlng, name);
            }
        });
    },

    /**
     * Checks if the passed GeoJSON Point feature is a route waypoint.
     *
     * Route points are exported e.g. as GPX `wpt` with a `type=from|via|to` property
     * if the "waypoints" option is checked in the Export dialog.
     *
     * @param {Object} geoJsonPointFeature GeoJSON Point feature
     */
    isRouteWaypoint: function(geoJsonPointFeature) {
        var props = geoJsonPointFeature.properties;
        if (props && props.type) {
            var wptType = props.type;
            if (wptType === 'from' || wptType === 'via' || wptType === 'to') {
                return true;
            }
        }
        return false;
    },

    /**
     * Checks if the passed GeoJSON feature should be added as a POI
     *
     * @param {Object} geoJsonFeature GeoJSON feature
     */
    isPoiPoint: function(geoJsonFeature) {
        return turf.getType(geoJsonFeature) === 'Point' && !BR.Track.isRouteWaypoint(geoJsonFeature);
    }
};
