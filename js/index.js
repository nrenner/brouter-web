/*
    BRouter web - web client for BRouter bike routing engine

    Licensed under the MIT license.
*/

(function () {
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
            trackAnalysis,
            waypoints,
            sidebar,
            drawButton,
            deleteRouteButton,
            pois,
            circlego,
            urlHash;
        // By default bootstrap-select use glyphicons
        $('.selectpicker').selectpicker({
            iconBase: 'fa',
            tickIcon: 'fa-check',
            // don't overlap with footer
            windowPadding: [0, 0, 40, 0],
        });

        search = new BR.Search();
        map.addControl(search);
        $('#map .leaflet-control-geocoder > button')[0].title = i18next.t('keyboard.generic-shortcut', {
            action: '$t(map.geocoder)',
            key: 'F',
        });

        router = L.bRouter(); //brouterCgi dummyRouter

        drawButton = L.easyButton({
            states: [
                {
                    stateName: 'deactivate-draw',
                    icon: 'fa-pencil active',
                    onClick: function (control) {
                        routing.draw(false);
                        control.state('activate-draw');
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: '$t(map.draw-route-stop)',
                        key: '$t(keyboard.escape)',
                    }),
                },
                {
                    stateName: 'activate-draw',
                    icon: 'fa-pencil',
                    onClick: function (control) {
                        routing.draw(true);
                        control.state('deactivate-draw');
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: '$t(map.draw-route-start)',
                        key: 'D',
                    }),
                },
            ],
        });

        // https://github.com/Templarian/MaterialDesign/blob/d0b28330af6648ca4c50c14d55043d71f813b3ae/svg/vector-line.svg
        // Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0), https://github.com/Templarian/MaterialDesign/blob/master/LICENSE
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
                id="mdi-vector-line" width="24" height="24" viewBox="0 0 24 24" class="mdi active">
                <path d="M15,3V7.59L7.59,15H3V21H9V16.42L16.42,9H21V3M17,5H19V7H17M5,17H7V19H5" />
            </svg>`;
        const beelineClickHandler = function (control) {
            const enabled = routing.toggleBeelineDrawing();
            control.state(enabled ? 'deactivate-beeline' : 'activate-beeline');
        };
        const title = i18next.t('keyboard.generic-shortcut', {
            action: '$t(map.toggle-beeline)',
            key: 'B',
        });
        const beelineButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-beeline',
                    icon: svg.replace(' active', ''),
                    onClick: beelineClickHandler,
                    title: title,
                },
                {
                    stateName: 'deactivate-beeline',
                    icon: svg,
                    onClick: beelineClickHandler,
                    title: title,
                },
            ],
        });
        map.on('routing:beeline-start', () => beelineButton.state('deactivate-beeline'));
        map.on('routing:beeline-end', () => beelineButton.state('activate-beeline'));

        var reverseRouteButton = L.easyButton(
            'fa-random',
            function () {
                routing.reverse();
            },
            i18next.t('keyboard.generic-shortcut', {
                action: '$t(map.reverse-route)',
                key: 'R',
            })
        );

        var deletePointButton = L.easyButton(
            '<span><i class="fa fa-caret-left"></i><i class="fa fa-map-marker" style="margin-left: 1px; color: gray;"></i></span>',
            function () {
                routing.deleteLastPoint();
            },
            i18next.t('keyboard.generic-shortcut', {
                action: '$t(map.delete-last-point)',
                key: 'Z',
            })
        );

        deleteRouteButton = L.easyButton(
            'fa-trash-o',
            function () {
                clearRoute();
            },
            i18next.t('keyboard.generic-shortcut', {
                action: '$t(map.clear-route)',
                key: '$t(keyboard.backspace)',
            })
        );

        L.DomEvent.addListener(
            document,
            'keydown',
            function (e) {
                if (BR.Util.keyboardShortcutsAllowed(e) && !$('.modal.show').length) {
                    if (e.keyCode === 8) {
                        // char code for 'backspace'
                        clearRoute();
                    } else if (e.keyCode === 72) {
                        // char code for 'h'
                        $('#about').modal('show');
                    } else if (e.key === '?') {
                        $('#help').modal('show');
                    }
                }
            },
            this
        );

        function clearRoute() {
            bootbox.prompt({
                size: 'small',
                title: i18next.t('map.clear-route'),
                inputType: 'checkbox',
                inputOptions: [
                    {
                        text: i18next.t('map.delete-route'),
                        value: 'route',
                    },
                    {
                        text: i18next.t('map.delete-nogo-areas'),
                        value: 'nogo',
                    },
                    {
                        text: i18next.t('map.delete-pois'),
                        value: 'pois',
                    },
                ],
                value: ['route'],
                onShown: function () {
                    $('button.bootbox-accept', $(this)).focus();
                },
                callback: function (result) {
                    if (result !== null) {
                        if (result.indexOf('route') !== -1) {
                            routing.clear();
                        }
                        if (result.indexOf('nogo') !== -1) {
                            nogos.clear();
                        }
                        if (result.indexOf('pois') !== -1) {
                            pois.clear();
                        }
                        onUpdate();
                        urlHash.onMapMove();
                    }
                },
            });
        }

        function updateRoute(evt) {
            router.setOptions(evt.options);

            // abort pending requests from previous rerouteAllSegments
            if (!router.queue.idle()) {
                router.queue.remove((task) => {
                    task.callback(L.BRouter.ABORTED_ERROR);
                    return true;
                });
            }
            routing.rerouteAllSegments(onUpdate);
        }

        function requestUpdate(updatable) {
            var track = routing.toPolyline(),
                segments = routing.getSegments(),
                segmentsLayer = routing._segments,
                latLngs = routing.getWaypoints();

            updatable.update(track, segments, segmentsLayer, latLngs);
        }

        routingOptions = new BR.RoutingOptions();
        routingOptions.on('update', function (evt) {
            if (urlHash.movingMap) return;

            profile.update(evt.options, () => {
                updateRoute(evt);
            });
        });

        BR.NogoAreas.MSG_BUTTON = i18next.t('keyboard.generic-shortcut', {
            action: '$t(map.nogo.draw)',
            key: 'N',
        });
        BR.NogoAreas.MSG_BUTTON_CANCEL = i18next.t('keyboard.generic-shortcut', {
            action: '$t(map.nogo.cancel)',
            key: '$t(keyboard.escape)',
        });
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

        elevation = new BR.Heightgraph();

        profile = new BR.Profile();
        profile.on('update', function (evt) {
            BR.message.hide();
            var profileId = routingOptions.getCustomProfile();
            router.uploadProfile(profileId, evt.profileText, function (err, profileId) {
                if (!err) {
                    routingOptions.setCustomProfile(profileId, true);
                    updateRoute({
                        options: routingOptions.getOptions(),
                    });
                } else {
                    profile.message.showError(err);
                    if (profileId) {
                        routingOptions.setCustomProfile(profileId, true);
                        router.setOptions(routingOptions.getOptions());
                    }
                }

                if (evt.callback) {
                    evt.callback(err, profileId, evt.profileText);
                }
            });
        });
        profile.on('clear', function (evt) {
            profile.message.hide();
            routingOptions.setCustomProfile(null);
        });
        trackMessages = new BR.TrackMessages(map, {
            requestUpdate: requestUpdate,
        });
        trackAnalysis = new BR.TrackAnalysis(map, {
            requestUpdate: requestUpdate,
        });

        routingPathQuality = new BR.RoutingPathQuality(map, layersControl);

        routing = new BR.Routing(profile, {
            routing: {
                router: L.bind(router.getRouteSegment, router),
            },
            styles: BR.conf.routingStyles,
        });

        waypoints = new BR.Waypoints(map, routing, {
            requestUpdate: requestUpdate,
        });

        pois = new BR.PoiMarkers(routing);

        exportRoute = new BR.Export(router, pois, profile);
        new BR.ShareRoute();

        routing.on('routing:routeWaypointEnd routing:setWaypointsEnd routing:rerouteSegmentEnd', function (evt) {
            search.clear();
            onUpdate(evt && evt.err);
        });

        // Open export dialog immediately when the `export` query parameter is set;
        // this is used for the QR code export:
        var searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has('export') && searchParams.get('export') === 'dialog') {
            // event won't get called without lonlats
            if (new URLSearchParams(window.location.hash).has('lonlats')) {
                routing.once('routing:setWaypointsEnd', (evt) => {
                    if (!evt.err && routing.getWaypoints().length > 1) {
                        $('#exportButton').trigger('click');
                    }
                });
            }
        }

        map.on('routing:draw-start', function () {
            drawButton.state('deactivate-draw');
            beelineButton.enable();
        });
        map.on('routing:draw-end', function () {
            drawButton.state('activate-draw');
            beelineButton.disable();
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
            trackMessages.update(track, segments, segmentsLayer);
            trackAnalysis.update(track, segments);
            waypoints.update(track, segments, segmentsLayer, latLngs);

            exportRoute.update(latLngs, segments);
        }

        routing.addTo(map);

        elevation.addBelow(map);

        sidebar = BR.sidebar({
            defaultTabId: BR.conf.transit ? 'tab_itinerary' : 'tab_profile',
            listeningTabs: {
                tab_profile: profile,
                tab_data: trackMessages,
                tab_analysis: trackAnalysis,
                tab_waypoints: waypoints,
            },
        }).addTo(map);
        if (BR.conf.transit) {
            sidebar.showPanel('tab_itinerary');
        }

        nogos.addTo(map);

        // disabled for now, to be removed later
        // circlego = BR.circleGoArea(routing, nogos, pois);
        if (circlego != null) {
            pois.circlego = circlego;
            circlego.addTo(map);
        }

        var buttons = [drawButton, beelineButton, reverseRouteButton, nogos.getButton()];
        if (circlego) buttons.push(circlego.getButton());
        buttons.push(deletePointButton, deleteRouteButton);

        L.easyBar(buttons).addTo(map);
        nogos.preventRoutePointOnCreate(routing);

        if (BR.keys.strava) {
            BR.stravaSegments(map, layersControl);
        }

        BR.tracksLoader(map, layersControl, routing, pois);

        BR.routeLoader(map, layersControl, routing, pois);

        pois.addTo(map);
        routingPathQuality.addTo(map);

        map.addControl(
            new BR.OpacitySliderControl({
                id: 'route',
                title: i18next.t('map.opacity-slider-shortcut', {
                    action: '$t(map.opacity-slider)',
                    key: 'M',
                }),
                muteKeyCode: 77, // m
                callback: L.bind(routing.setOpacity, routing),
            })
        );

        // initial option settings (after controls are added and initialized with onAdd)
        router.setOptions(nogos.getOptions());
        router.setOptions(routingOptions.getOptions());

        // (check before hash plugin init)
        if (!location.hash) {
            profile.update(routingOptions.getOptions());

            // restore active layers from local storage when called without hash
            layersControl.loadActiveLayers();
        }

        var onHashChangeCb = function (url) {
            var url2params = function (s = '') {
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

            var opts = router.parseUrlParams(url2params(url));
            router.setOptions(opts);
            routingOptions.setOptions(opts);
            nogos.setOptions(opts);

            const optsOrDefault = Object.assign({}, routingOptions.getOptions(), opts);
            profile.update(optsOrDefault, () => {
                if (opts.lonlats) {
                    routing.draw(false);
                    routing.clear();
                    routing.setWaypoints(opts.lonlats, opts.beelineFlags);
                }
            });

            if (opts.pois) {
                pois.setMarkers(opts.pois);
            }
            if (circlego && opts.circlego) {
                circlego.setOptions(opts);
            }
        };

        var onInvalidHashChangeCb = function (params) {
            params = params.replace('zoom=', 'map=');
            params = params.replace('&lat=', '/');
            params = params.replace('&lon=', '/');
            params = params.replace('&layer=', '/');
            return params;
        };

        // do not initialize immediately
        urlHash = new L.Hash(null, null);
        // this callback is used to append anything in URL after L.Hash wrote #map=zoom/lat/lng/layer
        urlHash.additionalCb = function () {
            var url = router
                .getUrl(
                    routing.getWaypoints(),
                    routing.getBeelineFlags(),
                    pois.getMarkers(),
                    circlego ? circlego.getCircle() : null,
                    null
                )
                .substr('brouter?'.length + 1);

            // by default brouter use | as separator. To make URL more human-readable, we remplace them with ; for users
            url = url.replace(/\|/g, ';');

            return url.length > 0 ? '&' + url : null;
        };
        urlHash.onHashChangeCb = onHashChangeCb;
        urlHash.onInvalidHashChangeCb = onInvalidHashChangeCb;
        urlHash.init(map, {
            layersControl: layersControl,
        });

        // activate configured default base layer or first if no hash,
        // only after hash init, by using the same delay
        setTimeout(function () {
            layersControl.activateDefaultBaseLayer();
        }, urlHash.changeDefer);

        routingOptions.on('update', urlHash.onMapMove, urlHash);
        nogos.on('update', urlHash.onMapMove, urlHash);
        pois.on('update', urlHash.onMapMove, urlHash);
        // waypoint add, move, delete (but last)
        routing.on('routing:routeWaypointEnd', urlHash.onMapMove, urlHash);
        // delete last waypoint
        routing.on(
            'waypoint:click',
            function (evt) {
                var r = evt.marker._routing;
                if (!r.prevMarker && !r.nextMarker) {
                    urlHash.onMapMove();
                }
            },
            urlHash
        );

        BR.WhatsNew.init();

        $('.modal').on('shown.bs.modal', function (e) {
            $('input:visible:enabled:first', e.target).focus();
        });
    }

    i18next.on('languageChanged', function (detectedLanguage) {
        // detected + fallbacks, e.g. ["de-DE", "de", "en"]
        for (i = 0; i < i18next.languages.length; i++) {
            var language = i18next.languages[i];

            // set first (fallback) language, for which a bundle was found
            if (i18next.hasResourceBundle(language, 'translation')) {
                var htmlElem = document.documentElement;
                if (htmlElem.getAttribute('lang') !== language) {
                    htmlElem.setAttribute('lang', language);
                }
                break;
            }
        }
    });

    i18next
        .use(window.i18nextXHRBackend)
        .use(window.i18nextBrowserLanguageDetector)
        .init(
            {
                fallbackLng: 'en',
                backend: {
                    loadPath: 'dist/locales/{{lng}}.json',
                },
            },
            function (err, t) {
                jqueryI18next.init(i18next, $, { useOptionsAttr: true });
                $('html').localize();
                $('#aboutLinks').localize({
                    privacyPolicyUrl: BR.conf.privacyPolicyUrl || 'https://brouter.de/privacypolicy.html',
                });

                mapContext = BR.Map.initMap();
                verifyTouchStyle(mapContext);
                initApp(mapContext);
            }
        );
})();
