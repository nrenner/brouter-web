/*
    BRouter web - web client for BRouter bike routing engine

    Licensed under the MIT license.
*/

(function() {

    var mapContext;

    function initApp(mapContext) {
        var map = mapContext.map,
            layersControl = mapContext.layersControl,
            search,
            router,
            routing,
            routesLayer,
            routingOptions,
            nogos,
            stats,
            itinerary,
            elevation,
            download,
            tabs,
            profile,
            trackMessages,
            routingToolbar,
            permalink,
            leftPaneId = 'leftpane',
            saveWarningShown = false;

        // left sidebar as additional control position
        map._controlCorners[leftPaneId] = L.DomUtil.create('div', 'leaflet-' + leftPaneId, map._controlContainer);

        document.getElementById('about_link').onclick = function() {
            bootbox.alert({
                title: 'About',
                message: document.getElementById('about').innerHTML
            });
        };

        search = new BR.Search();
        map.addControl(search);

        router = L.bRouter(); //brouterCgi dummyRouter

        drawButton = L.easyButton({
            states: [{
                stateName: 'deactivate-draw',
                icon: 'glyphicon-ok',
                onClick: function (control) {
                    routing.draw(false);
                    control.state('activate-draw');
                },
                title: 'Stop drawing route'
            }, {
                stateName: 'activate-draw',
                icon: 'glyphicon-road',
                onClick: function (control) {
                    routing.draw(true);
                    control.state('deactivate-draw');
                },
                title: 'Draw route'
            }]
        });

        deleteButton = L.easyButton(
            'glyphicon-trash',
            function () {
                bootbox.confirm({
                    size: 'small',
                    message: "Delete route?",
                    callback: function(result) {
                        if (result) {
                            routing.clear();
                            onUpdate();
                            permalink._update_routing();
                        }
                    }
                });
            },
            'Clear route'
        );

        drawToolbar = L.easyBar([drawButton, deleteButton]).addTo(map);

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

        // intermodal routing demo?
        if (BR.conf.transit) {
            itinerary = new BR.Itinerary();
        } else {
            stats = new BR.TrackStats();
        }
        download = new BR.Download();
        elevation = new BR.Elevation();
        profile = new BR.Profile();
        profile.on('update', function(evt) {
            BR.message.hide();
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
            profile.message.hide();
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
                    opacity: 0.6,
                    color: 'magenta'
                },
                track: {
                    color: 'magenta',
                    opacity: BR.conf.defaultOpacity
                },
                trackCasing: {
                    weight: 8,
                    color: 'white',
                    // assumed to be same as track, see setOpacity
                    opacity: BR.conf.defaultOpacity
                },
                nodata: {
                    color: 'darkred'
                }
            }
        });

        routing.on('routing:routeWaypointEnd routing:setWaypointsEnd', function(evt) {
            search.clear();
            onUpdate(evt && evt.err);
        });
        map.on('routing:draw-start', function() {
            drawButton.state('deactivate-draw');
        });
        map.on('routing:draw-end', function() {
            drawButton.state('activate-draw');
        });

        function onUpdate(err) {
            if (err) {
                if (err !== L.BRouter.ABORTED_ERROR) {
                    BR.message.showError(err);
                }
                return;
            } else {
                BR.message.hide();
            }

            var track = routing.toPolyline(),
                segments = routing.getSegments(),
                latLngs = routing.getWaypoints(),
                segmentsLayer = routing._segments,
                urls = {};

            elevation.update(track, segmentsLayer);
            if (BR.conf.transit) {
                itinerary.update(track, segments);
            } else {
                stats.update(track, segments);
            }
            trackMessages.update(track, segments);

            if (latLngs.length > 1) {
                urls.gpx = router.getUrl(latLngs, 'gpx');
                urls.kml = router.getUrl(latLngs, 'kml');
                urls.geojson = router.getUrl(latLngs, 'geojson');
                urls.csv = router.getUrl(latLngs, 'csv');
            }

            download.update(urls);
        };

        if (!BR.conf.transit) {
            map.addControl(new BR.Control({
                 heading: '',
                 divId: 'header'
            }));
        }
        routingOptions.addTo(map);
        if (!BR.conf.transit) {
            stats.addTo(map);
        }
        download.addTo(map);
        elevation.addTo(map);

        tabs = new BR.Tabs({
            tabs: {
                '#tab_itinerary': itinerary,
                '#tab_profile': profile,
                '#tab_data': trackMessages
            }
        });
        if (!BR.conf.transit) {
            delete tabs.options.tabs['#tab_itinerary'];
        }
        map.addControl(tabs);

        nogos.addTo(map);
        routing.addTo(map);
        map.addControl(new BR.OpacitySlider({
            callback: L.bind(routing.setOpacity, routing)
        }));

        // initial option settings (after controls are added and initialized with onAdd, before permalink)
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());
        profile.update(routingOptions.getOptions());

        permalink = new L.Control.Permalink({
            text: 'Permalink',
            position: 'bottomright',
            layers: layersControl,
            routingOptions: routingOptions,
            nogos: nogos,
            router: router,
            routing: routing,
            profile: profile
        }).addTo(map);
    }

    mapContext = BR.Map.initMap();
    initApp(mapContext);

})();
