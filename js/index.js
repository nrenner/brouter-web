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
            download,
            profile,
            trackMessages,
            sidebar,
            drawButton,
            deleteButton,
            drawToolbar,
            urlHash,
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
            states: [{
                stateName: 'deactivate-draw',
                icon: 'fa-pencil active',
                onClick: function (control) {
                    routing.draw(false);
                    control.state('activate-draw');
                },
                title: i18next.t('map.draw-route-stop')
            }, {
                stateName: 'activate-draw',
                icon: 'fa-pencil',
                onClick: function (control) {
                    routing.draw(true);
                    control.state('deactivate-draw');
                },
                title: i18next.t('map.draw-route-start')
            }]
        });

        deleteButton = L.easyButton(
            'fa-trash-o',
            function () {
                bootbox.prompt({
                    size: 'small',
                    title: i18next.t('map.delete-route'),
                    inputType: 'checkbox',
                    inputOptions: [
                        {
                            text: i18next.t('map.delete-nogo-areas'),
                            value: 'nogo'
                        }
                    ],
                    callback: function(result) {
                        if (result !== null) {
                            routing.clear();
                            if (result.length > 0 && result[0] === 'nogo') {
                                nogos.clear();
                            }
                            onUpdate();
                            urlHash.onMapMove();
                        }
                    }
                });
            },
            i18next.t('map.clear-route')
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

        BR.NogoAreas.MSG_BUTTON = i18next.t("map.nogo.draw");
        BR.NogoAreas.MSG_BUTTON_CANCEL = i18next.t("map.nogo.cancel");
        BR.NogoAreas.MSG_CREATE = i18next.t("map.nogo.click-drag");
        BR.NogoAreas.MSG_DISABLED = i18next.t("map.nogo.edit");
        BR.NogoAreas.MSG_ENABLED = i18next.t("map.nogo.help");
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

        routing.addTo(map);
        elevation.addBelow(map);

        sidebar = BR.sidebar({
            defaultTabId: BR.conf.transit ? 'tab_itinerary' : 'tab_profile',
            listeningTabs: {
                'tab_profile': profile,
                'tab_data': trackMessages
            }
        }).addTo(map);
        if (BR.conf.transit) {
            sidebar.showPanel('tab_itinerary');
        }

        nogos.addTo(map);
        drawToolbar = L.easyBar([drawButton, nogos.getButton(), deleteButton]).addTo(map);
        nogos.preventRoutePointOnCreate(routing);

        if (BR.keys.strava) {
            const stravaControl = L.control.stravaSegments({
                runningTitle: i18next.t('map.strava-running'),
                bikingTitle: i18next.t('map.strava-biking'),
                loadingTitle: i18next.t('map.loading'),
                stravaToken: BR.keys.strava
            })
            .addTo(map);
            layersControl.addOverlay(stravaControl.stravaLayer, i18next.t('map.layer.strava-segments'));
            stravaControl.onError = function(err) {
                BR.message.showError(i18next.t('warning.strava-error', {error: err && err.message ? err.message : err}));
            }

            // hide strava buttons when layer is inactive
            var toggleStravaControl = function () {
                var stravaBar = stravaControl.runningButton.button.parentElement;
                stravaBar.hidden = !stravaBar.hidden;
            };
            toggleStravaControl();
            stravaControl.stravaLayer.on('add remove', toggleStravaControl);
        }

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

        // do not initialize immediately
        urlHash = new L.Hash(null, null);
        urlHash.additionalCb = function() {
                var url = router.getUrl(routing.getWaypoints(), null).substr('brouter?'.length+1);
                return url.length > 0 ? '&' + url : null;
            };
        urlHash.onHashChangeCb = onHashChangeCb;
        urlHash.onInvalidHashChangeCb = onInvalidHashChangeCb;
        urlHash.init(map, {
            layersControl: layersControl
        });

        // activate configured default base layer or first if no hash,
        // only after hash init, by using the same delay
        setTimeout(function () {
            layersControl.activateDefaultBaseLayer();
        }, urlHash.changeDefer);

        routingOptions.on('update', urlHash.onMapMove, urlHash);
        nogos.on('update', urlHash.onMapMove, urlHash);
        // waypoint add, move, delete (but last)
        routing.on('routing:routeWaypointEnd', urlHash.onMapMove, urlHash);
        // delete last waypoint
        routing.on('waypoint:click', function (evt) {
            var r = evt.marker._routing;
            if (!r.prevMarker && !r.nextMarker) {
                urlHash.onMapMove();
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
        $('.collapse').on('hidden.bs.collapse', onHide)
                      .on('shown.bs.collapse', onShow)
                      .each(function() {
                            if (this.id && BR.Util.localStorageAvailable() && localStorage[this.id] === 'true') {
                                $(this).collapse('show');
                            }
                      });

        $('#submitNogos').on('click', function () {
            var geoJSONPromise;
            var nogoURL = $('#nogoURL').val();
            var nogoFile = $('#nogoFile')[0].files[0];
            if (nogoURL) {
                // TODO: Handle {{bbox}}
                geoJSONPromise = fetch(nogoURL).then(function (response) {
                    response.json();
                });
            } else if (nogoFile) {
                geoJSONPromise = new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function () {
                        resolve(reader.result);
                    }
                    reader.readAsText(nogoFile);
                }).then(function (response) { return JSON.parse(response); });
            }
            else {
                $('#nogoError').text('Error: Missing file or URL.');
                $('#nogoError').css('display', 'block');
                return false;
            }
            var nogoWeight = parseFloat($('#nogoWeight').val());
            if (isNaN(nogoWeight)) {
                $('#nogoError').text('Error: Missing default nogo weight.');
                $('#nogoError').css('display', 'block');
                return false;
            }
            var nogoRadius = parseFloat($('#nogoRadius').val());
            if (isNaN(nogoRadius) || nogoRadius < 0) {
                $('#nogoError').text('Error: Invalid default nogo radius.');
                $('#nogoError').css('display', 'block');
                return false;
            }
            var nogoBuffer = parseFloat($('#nogoBuffer').val());
            if (isNaN(nogoBuffer)) {
                $('#nogoError').text('Error: Invalid nogo buffering radius.');
                $('#nogoError').css('display', 'block');
                return false;
            }

            geoJSONPromise.then(function (response) {
                // Iterate on features in order to discard features without geometry
                var cleanedGeoJSONFeatures = []
                turf.featureEach(response, function (feature) {
                    if (turf.getGeom(feature)) {
                        var maybeBufferedFeature = feature;
                        // Eventually buffer GeoJSON
                        if (nogoBuffer != 0) {
                            maybeBufferedFeature = turf.buffer(
                                maybeBufferedFeature, nogoBuffer, { units: 'meters' }
                            );
                        }
                        cleanedGeoJSONFeatures.push(maybeBufferedFeature);
                    }
                });

                var geoJSON = L.geoJson(turf.featureCollection(cleanedGeoJSONFeatures), {
                    onEachFeature: function (feature, layer) {
                        if (!feature.properties.nogoWeight) {
                            feature.properties.nogoWeight = nogoWeight;
                        }
                    }
                });
                var nogosPoints = geoJSON.getLayers().filter(function (e) {
                    return e.feature.geometry.type === 'Point';
                });
                nogosPoints = nogosPoints.map(function (item) {
                    var radius = item.feature.properties.radius || nogoRadius;
                    if (radius > 0) {
                        return L.circle(item.getLatLng(), { radius: radius });
                    }
                    return null;
                });
                nogosPoints = nogosPoints.filter(function (e) { return e; });
                nogos.setOptions({
                    nogos: nogosPoints,
                    polygons: geoJSON.getLayers().filter(function (e) {
                        return e.feature.geometry.type === 'Polygon';
                    }),
                    polylines: geoJSON.getLayers().filter(function (e) {
                        return e.feature.geometry.type === 'LineString';
                    }),
                });
                updateRoute({
                    options: nogos.getOptions()
                });
                urlHash.onMapMove();
                $('#nogoError').text('');
                $('#nogoError').css('display', 'none');
                $('#loadNogos').modal('hide');
            });
            return false;
        });
    }

    i18next
        .use(window.i18nextXHRBackend)
        .use(window.i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'en',
            backend: {
                loadPath: 'dist/locales/{{lng}}.json',
            }
        }, function(err, t) {
            jqueryI18next.init(i18next, $);
            $('html').localize();

            mapContext = BR.Map.initMap();
            verifyTouchStyle(mapContext);
            initApp(mapContext);
        });
})();
