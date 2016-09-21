BR.Map = {

    initMap: function() {
        var map,
            layersControl;

        L.Icon.Default.imagePath = 'dist/images';

        var osmAttribution = '&copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        var maxZoom = 19;

        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: maxZoom,
            attribution: 'tiles ' + osmAttribution
        });

        var osmde = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
            maxNativeZoom: 18,
            maxZoom: maxZoom,
            attribution: 'tiles by <a target="_blank" href="http://openstreetmap.de/karte.html">openstreetmap.de</a> ' + osmAttribution
        });

        var topo = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxNativeZoom: 17,
            maxZoom: maxZoom,
            attribution: 'tiles &copy; <a target="_blank" href="https://opentopomap.org">OpenTopoMap</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>'
                + ', <a target="_blank" href="http://viewfinderpanoramas.org">SRTM</a>'
        });

        var thunderforestAttribution = 'tiles &copy; <a target="_blank" href="http://www.thunderforest.com">Thunderforest</a> '
            + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a>)';
        var cycle = L.tileLayer('http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
            maxNativeZoom: 18,
            maxZoom: maxZoom,
            attribution: thunderforestAttribution
        });
        var outdoors = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
            maxNativeZoom: 18,
            maxZoom: maxZoom,
            attribution: thunderforestAttribution
        });

        var cycling = L.tileLayer('http://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          maxZoom: maxZoom,
          opacity: 0.7,
          attribution: 'Cycling &copy; <a target="_blank" href="http://cycling.waymarkedtrails.org">Waymarked Trails</a> '
                  + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>)'
        });
        var hiking = L.tileLayer('http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
          maxNativeZoom: 18,
          maxZoom: maxZoom,
          opacity: 0.7,
          attribution: 'Hiking &copy; <a target="_blank" href="http://hiking.waymarkedtrails.org">Waymarked Trails</a> '
                  + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>)'
        });

        // COPYING: Please get your own Bing maps key at http://www.microsoft.com/maps/default.aspx
        var bing = new BR.BingLayer();
        BR.Util.get(BR.conf.bingKeyUrl, function (err, key) {
            if (err) {
                layersControl.removeLayer(bing);
                return;
            }

            bing._key = key;
        });

        map = new L.Map('map', {
            worldCopyJump: true
        });
        if (!map.restoreView()) {
            map.setView([50.99, 9.86], 6);
        }
        map.attributionControl.addAttribution(
                '<a href="http://brouter.de/brouter" target="_blank">BRouter</a> &copy; Arndt Brenschede, '
                + 'routing + map data &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
                + '(<a target="_blank" href="http://opendatacommons.org/licenses/odbl/">ODbL</a>)');

        var baseLayers = {
            'OpenStreetMap': osm,
            'OpenStreetMap.de': osmde,
            'OpenTopoMap': topo,
            'OpenCycleMap (Thunderf.)': cycle,
            'Outdoors (Thunderforest)': outdoors,
            'Bing Aerial': bing
        };
        var overlays = {
             'Cycling (Waymarked Trails)': cycling,
             'Hiking (Waymarked Trails)': hiking
        };

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
            icon: 'glyphicon glyphicon-screenshot',
            iconLoading: 'glyphicon glyphicon-refresh',
        }).addTo(map);

        L.control.scale().addTo(map);

        // expose map instance for console debugging
        BR.debug = BR.debug || {};
        BR.debug.map = map;

        return {
            map: map,
            layersControl: layersControl
        };
    }

};