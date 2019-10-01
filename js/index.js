/*
    BRouter web - web client for BRouter bike routing engine

    Licensed under the MIT license.
*/

(function() {
    var mapContext;

    function verifyTouchStyle(mapContext) {
        // revert touch style (large icons) when touch screen detection is available and negative
        // see https://github.com/nrenner/brouter-web/issues/69
        if (L.Browser.touch && BR.Browser.touchScreenDetectable && !BR.Browser.touchScreen) {
            L.DomUtil.removeClass(mapContext.map.getContainer(), 'leaflet-touch');
        }
    }

    function initApp(mapContext) {
        var map = mapContext.map,
            layersControl = mapContext.layersControl,
            search,
            router,
            routing,
            routingOptions,
            nogos,
            stats,
            itinerary,
            elevation,
            exportRoute,
            profile,
            trackMessages,
            sidebar,
            drawButton,
            deleteRouteButton,
            drawToolbar,
            urlHash,
            reverseRoute,
            saveWarningShown = false;

        // By default bootstrap-select use glyphicons
        $('.selectpicker').selectpicker({
            iconBase: 'fa',
            tickIcon: 'fa-check',
            // don't overlap with footer
            windowPadding: [0, 0, 40, 0]
        });

        search = new BR.Search();
        map.addControl(search);

        router = L.bRouter(); //brouterCgi dummyRouter

        drawButton = L.easyButton({
            states: [
                {
                    stateName: 'deactivate-draw',
                    icon: 'fa-pencil active',
                    onClick: function(control) {
                        routing.draw(false);
                        control.state('activate-draw');
                    },
                    title: i18next.t('map.draw-route-stop')
                },
                {
                    stateName: 'activate-draw',
                    icon: 'fa-pencil',
                    onClick: function(control) {
                        routing.draw(true);
                        control.state('deactivate-draw');
                    },
                    title: i18next.t('map.draw-route-start')
                }
            ]
        });

        reverseRouteButton = L.easyButton(
            'fa-random',
            function() {
                routing.reverse();
            },
            i18next.t('map.reverse-route')
        );

        deletePointButton = L.easyButton(
            '<span><i class="fa fa-caret-left"></i><i class="fa fa-map-marker" style="margin-left: 1px; color: gray;"></i></span>',
            function() {
                routing.removeWaypoint(routing.getLast(), function(err, data) {});
            },
            i18next.t('map.delete-last-point')
        );

        deleteRouteButton = L.easyButton(
            'fa-trash-o',
            function() {
                bootbox.prompt({
                    size: 'small',
                    title: i18next.t('map.delete-route-nogos'),
                    inputType: 'checkbox',
                    inputOptions: [
                        {
                            text: i18next.t('map.delete-route'),
                            value: 'route'
                        },
                        {
                            text: i18next.t('map.delete-nogo-areas'),
                            value: 'nogo'
                        }
                    ],
                    value: ['route'],
                    callback: function(result) {
                        if (result !== null) {
                            if (result.indexOf('route') !== -1) {
                                routing.clear();
                            }
                            if (result.indexOf('nogo') !== -1) {
                                nogos.clear();
                            }
                            onUpdate();
                            urlHash.onMapMove();
                        }
                    }
                });
            },
            i18next.t('map.delete-route-nogos')
        );

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

        BR.NogoAreas.MSG_BUTTON = i18next.t('map.nogo.draw');
        BR.NogoAreas.MSG_BUTTON_CANCEL = i18next.t('map.nogo.cancel');
        BR.NogoAreas.MSG_CREATE = i18next.t('map.nogo.click-drag');
        BR.NogoAreas.MSG_DISABLED = i18next.t('map.nogo.edit');
        BR.NogoAreas.MSG_ENABLED = i18next.t('map.nogo.help');
        nogos = new BR.NogoAreas();
        nogos.on('update', updateRoute);

        // intermodal routing demo?
        if (BR.conf.transit) {
            itinerary = new BR.Itinerary();
        } else {
            stats = new BR.TrackStats();
        }
        exportRoute = new BR.Export(router);
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
                        profile.message.showWarning(i18next.t('warning.temporary-profile'));
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
        trackMessages = new BR.TrackMessages(map, {
            requestUpdate: requestUpdate
        });

        routingPathQuality = new BR.RoutingPathQuality(map, layersControl);

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
                segmentsLayer = routing._segments;

            elevation.update(track, segmentsLayer);
            routingPathQuality.update(track, segmentsLayer);
            if (BR.conf.transit) {
                itinerary.update(track, segments);
            } else {
                stats.update(track, segments);
            }
            trackMessages.update(track, segments);

            exportRoute.update(latLngs);
        }

        routing.addTo(map);
        routingPathQuality.addTo(map);
        elevation.addBelow(map);

        sidebar = BR.sidebar({
            defaultTabId: BR.conf.transit ? 'tab_itinerary' : 'tab_profile',
            listeningTabs: {
                tab_profile: profile,
                tab_data: trackMessages
            }
        }).addTo(map);
        if (BR.conf.transit) {
            sidebar.showPanel('tab_itinerary');
        }

        nogos.addTo(map);
        drawToolbar = L.easyBar([
            drawButton,
            reverseRouteButton,
            nogos.getButton(),
            deletePointButton,
            deleteRouteButton
        ]).addTo(map);
        nogos.preventRoutePointOnCreate(routing);

        if (BR.keys.strava) {
            BR.stravaSegments(map, layersControl);
        }

        BR.tracksLoader(map, layersControl, routing);

        map.addControl(
            new BR.OpacitySliderControl({
                id: 'route',
                title: i18next.t('map.opacity-slider'),
                callback: L.bind(routing.setOpacity, routing)
            })
        );

        // initial option settings (after controls are added and initialized with onAdd)
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());
        profile.update(routingOptions.getOptions());

        // restore active layers from local storage when called without hash
        // (check before hash plugin init)
        if (!location.hash) {
            layersControl.loadActiveLayers();
        }

        var onHashChangeCb = function(url) {
            var url2params = function(s) {
                s = s.replace(/;/g, '|');
                var p = {};
                var sep = '&';
                if (s.search('&amp;') !== -1) sep = '&amp;';
                var params = s.split(sep);
                for (var i = 0; i < params.length; i++) {
                    var tmp = params[i].split('=');
                    if (tmp.length !== 2) continue;
                    p[tmp[0]] = decodeURIComponent(tmp[1]);
                }
                return p;
            };
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

        // do not initialize immediately
        urlHash = new L.Hash(null, null);
        urlHash.additionalCb = function() {
            var url = router.getUrl(routing.getWaypoints(), null).substr('brouter?'.length + 1);
            url = url.replace(/\|/g, ';');
            return url.length > 0 ? '&' + url : null;
        };
        urlHash.onHashChangeCb = onHashChangeCb;
        urlHash.onInvalidHashChangeCb = onInvalidHashChangeCb;
        urlHash.init(map, {
            layersControl: layersControl
        });

        // activate configured default base layer or first if no hash,
        // only after hash init, by using the same delay
        setTimeout(function() {
            layersControl.activateDefaultBaseLayer();
        }, urlHash.changeDefer);

        routingOptions.on('update', urlHash.onMapMove, urlHash);
        nogos.on('update', urlHash.onMapMove, urlHash);
        // waypoint add, move, delete (but last)
        routing.on('routing:routeWaypointEnd', urlHash.onMapMove, urlHash);
        // delete last waypoint
        routing.on(
            'waypoint:click',
            function(evt) {
                var r = evt.marker._routing;
                if (!r.prevMarker && !r.nextMarker) {
                    urlHash.onMapMove();
                }
            },
            urlHash
        );

        $(window).resize(function() {
            elevation.addBelow(map);
        });

        $('#elevation-chart').on('show.bs.collapse', function() {
            $('#elevation-btn').addClass('active');
        });
        $('#elevation-chart').on('hidden.bs.collapse', function() {
            $('#elevation-btn').removeClass('active');
            // we must fetch tiles that are located behind elevation-chart
            map._onResize();
        });

        var onHide = function() {
            if (this.id && BR.Util.localStorageAvailable()) {
                localStorage.removeItem(this.id);
            }
        };
        var onShow = function() {
            if (this.id && BR.Util.localStorageAvailable()) {
                localStorage[this.id] = 'true';
            }
        };
        // on page load, we want to restore collapsible elements from previous usage
        $('.collapse')
            .on('hidden.bs.collapse', onHide)
            .on('shown.bs.collapse', onShow)
            .each(function() {
                if (this.id && BR.Util.localStorageAvailable() && localStorage[this.id] === 'true') {
                    $(this).collapse('show');
                }
            });
    }

    i18next
        .use(window.i18nextXHRBackend)
        .use(window.i18nextBrowserLanguageDetector)
        .init(
            {
                fallbackLng: 'en',
                backend: {
                    loadPath: 'dist/locales/{{lng}}.json'
                }
            },
            function(err, t) {
                jqueryI18next.init(i18next, $);
                $('html').localize();

                mapContext = BR.Map.initMap();
                verifyTouchStyle(mapContext);
                initApp(mapContext);
            }
        );
})();
