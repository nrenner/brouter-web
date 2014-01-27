/*
    BRouter web - web client for BRouter bike routing engine
   
    Licensed under the MIT license.
*/

(function() {

    function initMap() {
        var odblAttribution = 'data &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
            + '(<a target="_blank" href="http://opendatacommons.org/licenses/odbl/">ODbL</a>)';

        var landscape = L.tileLayer('http://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: 'tiles &copy; <a target="_blank" href="http://www.thunderforest.com">Thunderforest</a> '
                + '(<a target="_blank" href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a>)' + odblAttribution
        });

        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'tiles &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        var map = new L.Map('map', {
            layers: [osm], 
            center: new L.LatLng(50.99, 9.86), 
            zoom: 6
        });
        map.attributionControl.addAttribution(
                '<a href="http://brensche.de/brouter" target="_blank">BRouter</a> &copy; Arndt Brenschede, '
                + 'routing + map data &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
                + '(<a target="_blank" href="http://opendatacommons.org/licenses/odbl/">ODbL</a>)');

        L.control.layers({
            'OpenStreetMap': osm,
            'Landscape (Thunderforest)': landscape
        }, {
            /*
             'Hiking (Waymarked Trails)': hiking
            */
        }).addTo(map);

        map.addControl(new L.Control.Permalink({text: 'Permalink', position: 'bottomright'})); //, layers: layersControl
        map.addControl(new BR.Search());
        
        return map;
    }
    
    function initApp(map) {
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

        function updateRoute(evt) {
            router.setOptions(evt.options);
            routing.routeAllSegments(onUpdate);
        }

        routingOptions = new BR.RoutingOptions();
        routingOptions.on('update', updateRoute);

        nogos = new BR.NogoAreas();
        nogos.on('update',  updateRoute);

        // initial option settings
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());

        stats = new BR.TrackStats();
        download = new BR.Download();
        elevation = new BR.Elevation();
        profile = new BR.Profile();

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
    }
    
    map = initMap();
    initApp(map);

})();
