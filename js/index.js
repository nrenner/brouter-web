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
            attribution: 'tiles &copy; <a target="_blank" href="https://opentopomap.org">OpenTopoMap</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>'
                + ', <a target="_blank" href="http://viewfinderpanoramas.org">SRTM</a>'
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

        // COPYING: Please get your own Bing maps key at http://www.microsoft.com/maps/default.aspx
        var bing = new BR.BingLayer();
        BR.Util.get(BR.conf.bingKeyUrl, function (err, key) {
            if (err) {
                layersControl.removeLayer(bing);
                return;
            }

            bing._key = key;
            bing.loadMetadata();
        });

        map = new L.Map('map', {
            layers: [osm], 
            center: new L.LatLng(50.99, 9.86), 
            zoom: 6,
            worldCopyJump: true
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
            'Outdoors (Thunderforest)': outdoors,
            'Bing Aerial': bing
        }, {
             'Cycling (Waymarked Trails)': cycling,
             'Hiking (Waymarked Trails)': hiking
        }).addTo(map);

        map.addControl(new BR.Search());

        // expose map instance for console debugging
        BR.debug = BR.debug || {};
        BR.debug.map = map;
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
            trackMessages,
            leftPaneId = 'leftpane',
            saveWarningShown = false;

        // left sidebar as additional control position
        map._controlCorners[leftPaneId] = L.DomUtil.create('div', 'leaflet-' + leftPaneId, map._controlContainer);

        router = L.bRouter(); //brouterCgi dummyRouter

        function updateRoute(evt) {
            router.setOptions(evt.options);

            // abort pending requests from previous rerouteAllSegments
            if (!router.queue.idle()) {
                router.queue.kill();
            }
            routing.rerouteAllSegments(onUpdate);
        }

        function requestUpdate(updatable) {
            var track = routing.toPolyline(),
                segments = routing.getSegments();
        
            updatable.update(track, segments);
        }

        routingOptions = new BR.RoutingOptions();
        routingOptions.on('update', updateRoute);
        routingOptions.on('update', function(evt) {
            profile.update(evt.options);
        });

        nogos = new BR.NogoAreas();
        nogos.on('update', updateRoute);

        stats = new BR.TrackStats();
        download = new BR.Download();
        elevation = new BR.Elevation();
        profile = new BR.Profile();
        profile.on('update', function(evt) {
            BR.message.hideError();
            var profileId = routingOptions.getCustomProfile();
            router.uploadProfile(profileId, evt.profileText, function(err, profileId) {
                if (!err) {
                    routingOptions.setCustomProfile(profileId, true);
                    updateRoute({
                        options: routingOptions.getOptions()
                    });
                    if (!saveWarningShown) {
                        profile.message.showWarning('<strong>Note:</strong> Uploaded custom profiles are only cached temporarily on the server.'
                            + '<br/>Please save your edits to your local PC.');
                        saveWarningShown = true;
                    }
                } else {
                    profile.message.showError(err);
                    if (profileId) {
                        routingOptions.setCustomProfile(profileId, true);
                        router.setOptions(routingOptions.getOptions());
                    }
                }

                if (evt.callback) {
                    evt.callback();
                }
            });
        });
        profile.on('clear', function(evt) {
            profile.message.hideError();
            routingOptions.setCustomProfile(null);
        });
        trackMessages = new BR.TrackMessages({
            requestUpdate: requestUpdate
        });

        routing = new BR.Routing({
            routing: {
                router: L.bind(router.getRouteSegment, router)
            },
            styles: {
                trailer: {
                    dashArray: [10, 10],
                    opacity: 0.4
                },
                track: {},
                nodata: {
                    color: 'darkred'
                }
            }
        });
        routing.on('routing:routeWaypointEnd routing:setWaypointsEnd', function(evt) {
            onUpdate(evt && evt.err);
        });

        function onUpdate(err) {
            if (err) {
                if (err !== L.BRouter.ABORTED_ERROR) {
                    BR.message.showError(err);
                }
                return;
            } else {
                BR.message.hideError();
            }

            var track = routing.toPolyline(),
                segments = routing.getSegments(),
                latLngs = routing.getWaypoints(),
                urls = {};

            elevation.update(track);
            stats.update(track, segments);
            trackMessages.update(track, segments);

            if (latLngs.length > 1) {
                urls.gpx = router.getUrl(latLngs, 'gpx');
                urls.kml = router.getUrl(latLngs, 'kml');
                urls.geojson = router.getUrl(latLngs, 'geojson');
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
        map.addControl(new BR.Tabs({
            tabs: {
                '#tab_profile': profile,
                '#tab_data': trackMessages
            }
        }));

        nogos.addTo(map);
        routing.addTo(map);

        // initial option settings (after controls are added and initialized with onAdd, before permalink)
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());
        profile.update(routingOptions.getOptions());

        map.addControl(new L.Control.Permalink({
            text: 'Permalink',
            position: 'bottomright',
            layers: layersControl,
            routingOptions: routingOptions,
            nogos: nogos,
            router: router,
            routing: routing,
            profile: profile
        }));
    }
    
    initMap();
    initApp();

})();
