BR.Map = {

    initMap: function() {
        var map,
            layersControl;

        BR.keys = BR.keys || {};

        var maxZoom = 19;

        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: maxZoom
        });

        var osmde = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
            maxNativeZoom: 18,
            maxZoom: maxZoom
        });

        var topo = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxNativeZoom: 17,
            maxZoom: maxZoom
        });

        var thunderforestAttribution = 'tiles &copy; <a target="_blank" href="http://www.thunderforest.com">Thunderforest</a> '
            + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a>)';
        var thunderforestAuth = BR.keys.thunderforest ? '?apikey=' + BR.keys.thunderforest : '';
        var cycle = L.tileLayer('http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png' + thunderforestAuth, {
            maxNativeZoom: 18,
            maxZoom: maxZoom
        });
        var outdoors = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png' + thunderforestAuth, {
            maxNativeZoom: 18,
            maxZoom: maxZoom
        });

        var esri = L.tileLayer('https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxNativeZoom: 19,
            maxZoom: maxZoom,
            subdomains: ['server', 'services'],
            attribution: '<a target="_blank" href="http://goto.arcgisonline.com/maps/World_Imagery">World Imagery</a> '
                + '&copy; <a target="_blank" href="http://www.esri.com/">Esri</a>, sources: '
                + 'Esri, DigitalGlobe, Earthstar Geographics, CNES/Airbus DS, GeoEye, USDA FSA, USGS, Getmapping, Aerogrid, IGN, IGP, and the GIS User Community'
        });   

        var cycling = L.tileLayer('http://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          opacity: 0.7,
          maxZoom: maxZoom
        });
        var hiking = L.tileLayer('http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          opacity: 0.7,
          maxZoom: maxZoom
        });

        map = new L.Map('map', {
            worldCopyJump: true
        });
        if (!map.restoreView()) {
            map.setView([50.99, 9.86], 6);
        }
        map.attributionControl.setPrefix(false);
        map.attributionControl.addAttribution('<a href="" data-toggle="modal" data-target="#credits">Copyright & credits</a>')


        var baseLayers = {
            'OpenStreetMap': osm,
            'OpenStreetMap.de': osmde,
            'OpenTopoMap': topo,
            'OpenCycleMap (Thunderf.)': cycle,
            'Outdoors (Thunderforest)': outdoors,
            'Esri World Imagery': esri
        };
        var overlays = {
             'Cycling (Waymarked Trails)': cycling,
             'Hiking (Waymarked Trails)': hiking
        };

        if (BR.keys.bing) {
            baseLayers['Bing Aerial'] = new BR.BingLayer(BR.keys.bing);
        }

        if (BR.keys.digitalGlobe) {
            var recent = new L.tileLayer('https://{s}.tiles.mapbox.com/v4/digitalglobe.nal0g75k/{z}/{x}/{y}.png?access_token=' + BR.keys.digitalGlobe, {
                minZoom: 1,
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.digitalglobe.com/platforms/mapsapi">DigitalGlobe</a> ('
                           + '<a href="http://bit.ly/mapsapiview">Terms of Use</a>)'
            });
            baseLayers['DigitalGlobe Recent Imagery'] = recent;
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
        // after applying custom base layer configurations, add first base layer to map
        var firstLayer = baseLayers[Object.keys(baseLayers)[0]];
        if (firstLayer) {
            map.addLayer(firstLayer);
        }

        layersControl = L.control.layers(baseLayers, overlays).addTo(map);

        L.control.locate({
            icon: 'fa fa-location-arrow',
            iconLoading: 'fa fa-spinner fa-pulse',
        }).addTo(map);

        L.control.scale().addTo(map);

        new BR.Layers().init(map, layersControl, baseLayers, overlays);

        // expose map instance for console debugging
        BR.debug = BR.debug || {};
        BR.debug.map = map;

        return {
            map: map,
            layersControl: layersControl
        };
    }

};