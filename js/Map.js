BR.Map = {

    initMap: function() {
        var map,
            layersControl;

        BR.keys = BR.keys || {};

        var maxZoom = 19;

        map = new L.Map('map', {
            zoomControl: false, // add it manually so that we can translate it
            worldCopyJump: true,
            maxZoom: maxZoom
        });
        L.control.zoom({
            zoomInTitle: i18next.t('map.zoomInTitle'),
            zoomOutTitle: i18next.t('map.zoomOutTitle'),
        }).addTo(map);
        if (!map.restoreView()) {
            map.setView([50.99, 9.86], 6);
        }

        // two attribution lines by adding two controls, prevents ugly wrapping on
        // small screens, better separates static from layer-specific attribution
        var osmAttribution = $(map.getContainer()).outerWidth() >= 400 ? i18next.t('map.attribution-osm-long') : i18next.t('map.attribution-osm-short');
        map.attributionControl.setPrefix(
            '&copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">' + osmAttribution + '</a>' +
            ' &middot; <a href="" data-toggle="modal" data-target="#credits">' + i18next.t('map.copyright') + '</a>' +
            ' &middot; <a target="_blank" href="http://brouter.de/privacypolicy.html">' + i18next.t('map.privacy') + '</a>');

        new L.Control.PermalinkAttribution().addTo(map);
        map.attributionControl.setPrefix(false);

        var layersConfig = BR.layersConfig(map);
        var baseLayers = layersConfig.getBaseLayers();
        var overlays = layersConfig.getOverlays();

        if (BR.keys.bing) {
            baseLayers[i18next.t('map.layer.bing')] = new BR.BingLayer(BR.keys.bing);
        }

        if (BR.keys.digitalGlobe) {
            var recent = new L.tileLayer('https://{s}.tiles.mapbox.com/v4/digitalglobe.nal0g75k/{z}/{x}/{y}.png?access_token=' + BR.keys.digitalGlobe, {
                minZoom: 1,
                maxZoom: 19,
                attribution: i18next.t('credits.digitalglobe-license')
            });
            baseLayers[i18next.t('map.layer.digitalglobe')] = recent;
        }

        if (BR.conf.clearBaseLayers) {
            baseLayers = {};
        }
        for (i in BR.conf.baseLayers) {
            if (BR.conf.baseLayers.hasOwnProperty(i)) {
                baseLayers[i] = L.tileLayer(BR.conf.baseLayers[i]);
            }
        }

        for (i in BR.conf.overlays) {
            if (BR.conf.overlays.hasOwnProperty(i)) {
                overlays[i] = L.tileLayer(BR.conf.overlays[i]);
            }
        }
        // after applying custom base layer configurations, add configured base layer to map
        var defaultLayer = baseLayers[Object.keys(baseLayers)[BR.conf.defaultBaseLayerIndex || 0]];
        if (defaultLayer) {
            map.addLayer(defaultLayer);
        }

        layersControl = BR.layersTab(layersConfig, baseLayers, overlays).addTo(map);

        var secureContext = 'isSecureContext' in window ? isSecureContext : location.protocol === 'https:';
        if (secureContext) {
            L.control.locate({
                strings: {
                    title: i18next.t('map.locate-me')
                },
                icon: 'fa fa-location-arrow',
                iconLoading: 'fa fa-spinner fa-pulse',
            }).addTo(map);
        }

        L.control.scale().addTo(map);

        new BR.Layers().init(map, layersControl, baseLayers, overlays);

        // expose map instance for console debugging
        BR.debug = BR.debug || {};
        BR.debug.map = map;

        var layersAndOverlays = baseLayers;
        for (var o in overlays) {
            layersAndOverlays[o] = overlays[o];
        }
        return {
            map: map,
            layersControl: layersControl,
            layers: layersAndOverlays
        };
    }

};
