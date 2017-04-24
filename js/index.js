/*
    BRouter web - web client for BRouter bike routing engine

    Licensed under the MIT license.
*/

(function() {

    var mapContext;

    function initApp(mapContext) {
        var map = mapContext.map,
            layersControl = mapContext.layersControl,
            mapLayers = mapContext.layers,
            search,
            router,
            routing,
            routingOptions,
            nogos,
            stats,
            itinerary,
            elevation,
            download,
            tabs,
            profile,
            trackMessages,
            drawButton,
            deleteButton,
            drawToolbar,
            urlHash,
            saveWarningShown = false;

        // By default bootstrap-select use glyphicons
        $('.selectpicker').selectpicker({
            iconBase: 'fa',
            tickIcon: 'fa-check'
        });

        search = new BR.Search();
        map.addControl(search);

        router = L.bRouter(); //brouterCgi dummyRouter

        drawButton = L.easyButton({
            states: [{
                stateName: 'deactivate-draw',
                icon: 'fa-pencil active',
                onClick: function (control) {
                    routing.draw(false);
                    control.state('activate-draw');
                },
                title: 'Stop drawing route (ESC key)'
            }, {
                stateName: 'activate-draw',
                icon: 'fa-pencil',
                onClick: function (control) {
                    routing.draw(true);
                    control.state('deactivate-draw');
                },
                title: 'Draw route (D key)'
            }]
        });

        deleteButton = L.easyButton(
            'fa-trash-o',
            function () {
                bootbox.confirm({
                    size: 'small',
                    message: "Delete route?",
                    callback: function(result) {
                        if (result) {
                            routing.clear();
                            onUpdate();
                            urlHash.updateHash();
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
            styles: BR.conf.routingStyles
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

        routingOptions.addTo(map);

        routing.addTo(map);
        elevation.addBelow(map);

        tabs = new BR.Tabs({
            tabs: {
                '#tab_itinerary': itinerary,
                '#tab_data': trackMessages
            }
        });
        if (!BR.conf.transit) {
            delete tabs.options.tabs['#tab_itinerary'];
        }
        map.addControl(tabs);

        var sidebar = L.control.sidebar('sidebar', {
            position: 'left'
        });
        map.addControl(sidebar);

        nogos.addTo(map);
        map.addControl(new BR.OpacitySlider({
            callback: L.bind(routing.setOpacity, routing)
        }));

        // initial option settings (after controls are added and initialized with onAdd)
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());
        profile.update(routingOptions.getOptions());

        var onHashChangeCb = function(url) {
            var url2params = function (s) {
                var p = {};
                var sep = '&';
                if (s.search('&amp;') !== -1)
                    sep = '&amp;';
                var params = s.split(sep);
                for (var i = 0; i < params.length; i++) {
                    var tmp = params[i].split('=');
                    if (tmp.length !== 2) continue;
                    p[tmp[0]] = decodeURIComponent(tmp[1]);
                }
                return p;
            }
            if (url == null) return;
            var opts = router.parseUrlParams(url2params(url));
            router.setOptions(opts);
            routingOptions.setOptions(opts);
            nogos.setOptions(opts);
            profile.update(opts);

            if (opts.lonlats) {
                routing.draw(false);
                routing.clear();
                routing.setWaypoints(opts.lonlats);
            }
        };

        var onInvalidHashChangeCb = function(params) {
            params = params.replace('zoom=', 'map=');
            params = params.replace('&lat=', '/');
            params = params.replace('&lon=', '/');
            params = params.replace('&layer=', '/');
            return params;
        };

        urlHash = new L.Hash(map, mapLayers, function() {
            var url = router.getUrl(routing.getWaypoints(), null);
            return url.substr('brouter?'.length);
        }, onHashChangeCb, onInvalidHashChangeCb);
        routingOptions.on('update', urlHash.updateHash, urlHash);
        nogos.on('update', urlHash.updateHash, urlHash);
        // waypoint add, move, delete (but last)
        routing.on('routing:routeWaypointEnd', urlHash.updateHash, urlHash);
        // delete last waypoint
        routing.on('waypoint:click', function (evt) {
            var r = evt.marker._routing;
            if (!r.prevMarker && !r.nextMarker) {
                urlHash.updateHash();
            }
        }, urlHash);

        $(window).resize(function () {
            elevation.addBelow(map);
        });

        $('#elevation-chart').on('show.bs.collapse', function () {
            $('#elevation-btn').addClass('active');
        });
        $('#elevation-chart').on('hidden.bs.collapse', function () {
            $('#elevation-btn').removeClass('active');
            // we must fetch tiles that are located behind elevation-chart
            map._onResize();
        });

        $('#sidebar-btn').on('click', function (event) {
            sidebar.toggle();
            $('#sidebar-btn').toggleClass('active');
        });
    }

    mapContext = BR.Map.initMap();
    initApp(mapContext);

})();
