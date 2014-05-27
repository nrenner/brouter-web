/*
    BRouter web - web client for BRouter bike routing engine
   
    Licensed under the MIT license.
*/

(function() {

    var map,
        layersControl;

    function initMap() {
        var osmAttribution = '&copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'tiles ' + osmAttribution
        });

        var osmde = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'tiles by <a target="_blank" href="http://openstreetmap.de/karte.html">openstreetmap.de</a> ' + osmAttribution
        });

        var topo = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            minZoom: 5,
            maxZoom: 15,
            attribution: 'tiles &copy; <a href="https://opentopomap.org">OpenTopoMap</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>'
                + ', <a href="http://viewfinderpanoramas.org">SRTM</a>'
        });

        var thunderforestAttribution = 'tiles &copy; <a target="_blank" href="http://www.thunderforest.com">Thunderforest</a> '
            + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a>)';
        var cycle = L.tileLayer('http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: thunderforestAttribution
        });
        var outdoors = L.tileLayer('http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: thunderforestAttribution
        });

        var cycling = L.tileLayer('http://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.7,
          attribution: 'Cycling &copy; <a target="_blank" href="http://cycling.waymarkedtrails.org">Waymarked Trails</a> '
                  + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>)'
        });
        var hiking = L.tileLayer('http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.7,
          attribution: 'Hiking &copy; <a target="_blank" href="http://hiking.waymarkedtrails.org">Waymarked Trails</a> '
                  + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>)'
        });

        map = new L.Map('map', {
            layers: [osm], 
            center: new L.LatLng(50.99, 9.86), 
            zoom: 6
        });
        map.attributionControl.addAttribution(
                '<a href="http://brouter.de/brouter" target="_blank">BRouter</a> &copy; Arndt Brenschede, '
                + 'routing + map data &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
                + '(<a target="_blank" href="http://opendatacommons.org/licenses/odbl/">ODbL</a>)');

        layersControl = L.control.layers({
            'OpenStreetMap': osm,
            'OpenStreetMap.de': osmde,
            'OpenTopoMap': topo,
            'OpenCycleMap (Thunderf.)': cycle,
            'Outdoors (Thunderforest)': outdoors
        }, {
             'Cycling (Waymarked Trails)': cycling,
             'Hiking (Waymarked Trails)': hiking
        }).addTo(map);

        map.addControl(new BR.Search());
    }

    function initApp() {
        var router,
            routing,
            routesLayer, 
            routingOptions, 
            nogos, 
            stats,
            elevation,
            download,
            profile,
            leftPaneId = 'leftpane';

        // left sidebar as additional control position
        map._controlCorners[leftPaneId] = L.DomUtil.create('div', 'leaflet-' + leftPaneId, map._controlContainer);

        router = L.bRouter(); //brouterCgi dummyRouter

        function showError(err) {
            var ele =L.DomUtil.get('message');
            ele.innerText = err;
            L.DomUtil.removeClass(ele, 'hidden');
            L.DomUtil.addClass(ele, 'error');
        }

        function hideError() {
            var ele =L.DomUtil.get('message');
            if (!L.DomUtil.hasClass(ele, 'hidden')) {
                L.DomUtil.addClass(ele, 'hidden');
                ele.innerText = '';
            }
        }

        function updateRoute(evt) {
            router.setOptions(evt.options);
            routing.rerouteAllSegments(onUpdate);
        }

        routingOptions = new BR.RoutingOptions();
        routingOptions.on('update', updateRoute);

        nogos = new BR.NogoAreas();
        nogos.on('update', updateRoute);

        // initial option settings
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());

        stats = new BR.TrackStats();
        download = new BR.Download();
        elevation = new BR.Elevation();
        profile = new BR.Profile();
        profile.on('update', function(evt) {
            hideError();
            var profileId = routingOptions.getCustomProfile();
            router.uploadProfile(profileId, evt.profileText, function(err, profile) {
                if (!err) {
                    routingOptions.setCustomProfile(profile);
                } else {
                    showError(err);
                    if (profile) {
                        routingOptions.setCustomProfile(profile, true);
                        router.setOptions(routingOptions.getOptions());
                    }
                }
            });
        });
        profile.on('clear', function(evt) {
            hideError();
            routingOptions.setCustomProfile(null);
        });

        routing = new BR.Routing({routing: {
            router: L.bind(router.getRouteSegment, router)
        }});
        routing.on('routing:routeWaypointEnd', onUpdate);

        function onUpdate() {
            var track = routing.toPolyline(),
                latLngs = routing.getWaypoints(),
                urls = {};

            elevation.update(track);
            stats.update(track);          

            if (latLngs.length > 1) {
                urls.gpx = router.getUrl(latLngs, 'gpx');
                urls.kml = router.getUrl(latLngs, 'kml');
                urls.csv = router.getUrl(latLngs, 'csv');
            }

            download.update(urls);
        };

        map.addControl(new BR.Control({
             heading: '',
             divId: 'header'
        }));
        routingOptions.addTo(map);
        stats.addTo(map);
        download.addTo(map);
        elevation.addTo(map);
        profile.addTo(map);

        nogos.addTo(map);
        routing.addTo(map);
        
        map.addControl(new L.Control.Permalink({
            text: 'Permalink',
            position: 'bottomright',
            layers: layersControl,
            routingOptions: routingOptions,
            nogos: nogos,
            router: router,
            routing: routing
        }));
    }
    
    initMap();
    initApp();

})();
