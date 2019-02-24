BR.Map = {

    initMap: function() {
        var map,
            layersControl;

        BR.keys = BR.keys || {};

        var maxZoom = 19;

        // Layer attribution here only as short link to original site, 
        // to keep current position use placeholders: {zoom}/{lat}/{lon}
        // Copyright attribution in index.html #credits

        var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: maxZoom,
            attribution: '<a target="_blank" href="https://www.openstreetmap.org/#map={zoom}/{lat}/{lon}">OpenStreetMap</a>'
        });

        var osmde = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
            maxNativeZoom: 19,
            maxZoom: maxZoom,
            attribution: '<a target="_blank" href="https://www.openstreetmap.de/karte.html?zoom={zoom}&lat={lat}&lon={lon}&layers=B000TF">OpenStreetMap.de</a>'
        });

        var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxNativeZoom: 17,
            maxZoom: maxZoom,
            attribution: '<a target="_blank" href="https://opentopomap.org/#map={zoom}/{lat}/{lon}">OpenTopoMap</a>'
        });

        var thunderforestAuth = BR.keys.thunderforest ? '?apikey=' + BR.keys.thunderforest : '';
        var cycle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png' + thunderforestAuth, {
            maxNativeZoom: 18,
            maxZoom: maxZoom,
            attribution: '<a target="_blank" href="https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000">OpenCycleMap</a>'
        });
        var outdoors = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png' + thunderforestAuth, {
            maxNativeZoom: 18,
            maxZoom: maxZoom,
            attribution: '<a target="_blank" href="https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=000B0">Outdoors</a>'
        });

        var esri = L.tileLayer('https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxNativeZoom: 19,
            maxZoom: maxZoom,
            subdomains: ['server', 'services'],
            attribution: '<a target="_blank" href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">' + i18next.t('credits.esri-tiles') + '</a>'
        });

        var cycling = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          opacity: 0.7,
          maxZoom: maxZoom,
          attribution: '<a target="_blank" href="http://cycling.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}">' + i18next.t('map.cycling') + '</a>'
        });
        var hiking = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          opacity: 0.7,
          maxZoom: maxZoom,
          attribution: '<a target="_blank" href="http://hiking.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}">' + i18next.t('map.hiking') + '</a>'
        });

        map = new L.Map('map', {
            zoomControl: false, // add it manually so that we can translate it
            worldCopyJump: true
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

        var baseLayers = {}
        baseLayers[i18next.t('map.layer.osm')] = osm;
        baseLayers[i18next.t('map.layer.osmde')] = osmde;
        baseLayers[i18next.t('map.layer.topo')] = topo;
        baseLayers[i18next.t('map.layer.cycle')] = cycle;
        baseLayers[i18next.t('map.layer.outdoors')] = outdoors;
        baseLayers[i18next.t('map.layer.esri')] = esri;
        var overlays = {}
        overlays[i18next.t('map.layer.cycling')] = cycling;
        overlays[i18next.t('map.layer.hiking')] = hiking;

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

        layersControl = BR.layersTab(baseLayers, overlays).addTo(map);

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
