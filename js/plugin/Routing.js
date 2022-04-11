L.Routing.Draw.prototype._hideTrailer = function () {
    if (this._trailer.options.opacity !== 0.0) {
        this._trailer.setStyle({ opacity: 0.0 });
    }
};

BR.Routing = L.Routing.extend({
    options: {
        position: 'topright',
        icons: {
            start: L.VectorMarkers.icon({ icon: 'play', markerColor: BR.conf.markerColors.start }),
            normal: L.VectorMarkers.icon({ icon: 'circle', markerColor: BR.conf.markerColors.via }),
            end: L.VectorMarkers.icon({ icon: 'stop', markerColor: BR.conf.markerColors.stop }),
            draw: false,
            opacity: 1,
        },
        snapping: null,
        zIndexOffset: -2000,
        distanceMarkers: {
            // width as base number, multiplied by number of digits + one for padding
            iconSize: [6, 18],
            offset: 5000,
            textFunction: function (distance) {
                return distance / 1000;
            },
        },
        shortcut: {
            draw: {
                enable: 68, // char code for 'd'
                disable: 27, // char code for 'ESC'
                beelineMode: 66, // char code for 'b'
                // char code for 'Shift', same key as `beelineModifierName`
                beelineModifier: 16,
                // modifier key to draw straight line on click [shiftKey|null] (others don't work everywhere)
                beelineModifierName: 'shiftKey',
            },
            reverse: 82, // char code for 'r'
            deleteLastPoint: 90, // char code for 'z'
        },
    },

    initialize: function (profile, options) {
        L.Routing.prototype.initialize.call(this, options);

        this.profile = profile;
    },

    onAdd: function (map) {
        this.options.tooltips.waypoint = i18next.t('map.route-tooltip-waypoint');
        this.options.tooltips.segment = i18next.t('map.route-tooltip-segment');

        this._segmentsCasing = new L.FeatureGroup().addTo(map);
        this._loadingTrailerGroup = new L.FeatureGroup().addTo(map);
        this._loadingTrailerRenderer = L.svg(); // CSS animation based on SVG path element

        var container = L.Routing.prototype.onAdd.call(this, map);

        this._segments.on('layeradd', this._addSegmentCasing, this);
        this._segments.on('layerremove', this._removeSegmentCasing, this);

        this._waypoints.on('layeradd', this._setMarkerOpacity, this);

        // flag if (re-)routing of all segments is ongoing
        this._routingAll = false;
        this.on('routing:rerouteAllSegmentsStart routing:setWaypointsStart', function (evt) {
            this._routingAll = true;
        });
        this.on('routing:rerouteAllSegmentsEnd routing:setWaypointsEnd', function (evt) {
            this._routingAll = false;
        });

        this.on(
            'routing:routeWaypointStart routing:rerouteAllSegmentsStart routing:rerouteSegmentStart',
            function (evt) {
                if (!this._routingAll || evt.type === 'routing:rerouteAllSegmentsStart') {
                    this._removeDistanceMarkers();
                }
            }
        );

        this.on(
            'routing:routeWaypointEnd routing:setWaypointsEnd routing:rerouteAllSegmentsEnd routing:rerouteSegmentEnd',
            function (evt) {
                if (
                    !this._routingAll ||
                    evt.type === 'routing:rerouteAllSegmentsEnd' ||
                    evt.type === 'routing:setWaypointsEnd'
                ) {
                    this._updateDistanceMarkers(evt);
                }
            }
        );

        // turn line mouse marker off while over waypoint marker
        this.on(
            'waypoint:mouseover',
            function (e) {
                // L.Routing.Edit._segmentOnMouseout without firing 'segment:mouseout' (enables draw)
                if (this._dragging) {
                    return;
                }

                this._hideMouseMarker();
                this._map.off('mousemove', this._segmentOnMousemove, this);
                this._suspended = true;
            },
            this._edit
        );

        this.on(
            'waypoint:mouseout',
            function (e) {
                this._segmentOnMouseover(e);
                this._suspended = false;
            },
            this._edit
        );

        this._edit._mouseMarker.setIcon(
            L.divIcon({
                className: 'line-mouse-marker',
                iconAnchor: [8, 8], // size/2 + border/2
                iconSize: [16, 16],
            })
        );

        // Forward mousemove event to snapped feature (for Leaflet.Elevation to
        // update indicator), see also L.Routing.Edit._segmentOnMousemove
        this._edit._mouseMarker.on(
            'move',
            L.bind(function (e) {
                var latLng = e.latlng;
                if (latLng._feature) {
                    this._mouseMarker._feature = latLng._feature;
                    latLng._feature.fire('mousemove', e, true);
                }
            }, this._edit)
        );
        var mouseoutHandler = function (e) {
            if (this._mouseMarker._feature) {
                this._mouseMarker._feature.fire('mouseout', e, true);
                this._mouseMarker._feature = null;
            }
        };
        this._edit.on('segment:mouseout', mouseoutHandler, this._edit);
        this._edit._mouseMarker.on('dragstart', mouseoutHandler, this._edit);
        this.on('waypoint:mouseover', mouseoutHandler, this._edit);

        this._draw.on('enabled', function () {
            // crosshair cursor
            L.DomUtil.addClass(map.getContainer(), 'routing-draw-enabled');

            // prevent cursor marker from consuming mouse events (invisible with draw:false)
            this._marker._icon.style.pointerEvents = 'none';

            // intercept listener: only re-show draw trailer after marker hover
            // when edit is not active (i.e. wasn't also supended)
            this._parent.off('waypoint:mouseout', this._catchWaypointEvent, this);
            this.on(
                'waypoint:mouseout',
                function (e) {
                    if (!this._parent._edit._suspended) {
                        this._catchWaypointEvent(e);
                    }
                },
                this
            );
        });
        this._draw.on('disabled', function () {
            L.DomUtil.removeClass(map.getContainer(), 'routing-draw-enabled');
        });

        // hide trailer over controls and outside map
        function show() {
            if (this._hidden && this._parent._waypoints._first) {
                this._show();
            }
        }
        var hide = function () {
            if (!this._hidden && this._parent._waypoints._first) {
                this._hide();
            }
        }.bind(this._draw);
        function hideOverControl(e) {
            hide();
            // prevent showing trailer when clicking state buttons (causes event that propagates to map)
            L.DomEvent.stopPropagation(e);
        }
        this._draw.on('enabled', function () {
            this._map.on('mouseout', hide, this);
            this._map.on('mouseover', show, this);
            L.DomEvent.on(this._map._controlContainer, 'mouseout', show, this);
            L.DomEvent.on(this._map._controlContainer, 'mouseover', hideOverControl, this);
        });
        this._draw.on('disabled', function () {
            this._map.off('mouseout', hide, this);
            this._map.off('mouseover', show, this);
            L.DomEvent.off(this._map._controlContainer, 'mouseout', show, this);
            L.DomEvent.off(this._map._controlContainer, 'mouseover', hideOverControl, this);
        });

        // Call show after deleting last waypoint, but hide trailer.
        // Gets hidden in _catchWaypointEvent on waypoint mouseover, but
        // mouseout to show again never fires when deleted. Click handler
        // _onMouseClick aborts when hidden, so no waypoint can be added
        // although enabled.
        this.on(
            'waypoint:click',
            function () {
                if (this._hidden && !this._parent._waypoints._first) {
                    this._show();
                    this._hideTrailer();
                }
            },
            this._draw
        );

        // avoid accidental shift-drag zooms while drawing beeline with shift-click
        this._map.boxZoom.disable();
        this._map.addHandler('boxZoom', BR.ClickTolerantBoxZoom);
        this._draw.on('enabled', function () {
            this._map.boxZoom.tolerant = true;
        });
        this._draw.on('disabled', function () {
            this._map.boxZoom.tolerant = false;
        });

        // remove listeners registered in super.onAdd, keys not working when map container lost focus
        // (by navbar/sidebar interaction), use document instead
        L.DomEvent.removeListener(this._container, 'keydown', this._keydownListener, this);
        L.DomEvent.removeListener(this._container, 'keyup', this._keyupListener, this);

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
        L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);

        // enable drawing mode
        this.draw(true);

        return container;
    },

    _addSegmentCasing: function (e) {
        // extend layer style to inherit beeline dashArray
        const casingStyle = Object.assign({}, e.layer.options, this.options.styles.trackCasing);
        const casing = L.polyline(e.layer.getLatLngs(), Object.assign({}, casingStyle, { interactive: false }));
        this._segmentsCasing.addLayer(casing);
        e.layer._casing = casing;
        this._segments.bringToFront();
    },

    _removeSegmentCasing: function (e) {
        this._segmentsCasing.removeLayer(e.layer._casing);
    },

    setOpacity: function (opacity) {
        // Due to the second Polyline layer for casing, the combined opacity is less
        // transparent than with a single layer and the slider is non-linear. The
        // inverted formula is used to get the same result as with a single layer.
        // SVG simple alpha compositing: Ca' = 1 - (1 - Ea) * (1 - Ca)
        // https://www.w3.org/TR/SVG11/masking.html#SimpleAlphaBlending
        var sourceOpacity = 1 - Math.sqrt(1 - opacity);

        this.options.styles.track.opacity = sourceOpacity;
        this.options.styles.trackCasing.opacity = sourceOpacity;
        this.options.icons.opacity = opacity;

        this._segments.setStyle({
            opacity: sourceOpacity,
        });
        this._segmentsCasing.setStyle({
            opacity: sourceOpacity,
        });
        this._waypoints.eachLayer(function (marker) {
            marker.setOpacity(opacity);
        });

        if (this._distanceMarkers) {
            this._distanceMarkers.setOpacity(opacity);
        }
    },

    _setMarkerOpacity: function (e) {
        e.layer.setOpacity(this.options.icons.opacity);
    },

    _removeMarkerEvents: function (marker) {
        marker.off('mouseover', this._fireWaypointEvent, this);
        marker.off('mouseout', this._fireWaypointEvent, this);
        marker.off('dragstart', this._fireWaypointEvent, this);
        marker.off('dragend', this._fireWaypointEvent, this);
        marker.off('drag', this._fireWaypointEvent, this);
        marker.off('click', this._fireWaypointEvent, this);
    },

    clear: function () {
        var drawEnabled = this._draw._enabled;
        var current = this._waypoints._first;

        this.draw(false);

        if (current === null) {
            return;
        }
        this._removeMarkerEvents(current);
        while (current._routing.nextMarker) {
            var marker = current._routing.nextMarker;
            this._removeMarkerEvents(marker);
            current = marker;
        }

        this._waypoints._first = null;
        this._waypoints._last = null;
        this._waypoints.clearLayers();
        this._segments.clearLayers();
        this._removeDistanceMarkers();

        if (drawEnabled) {
            this.draw(true);
        }
    },

    setWaypoints: function (latLngs, beelineFlags, cb) {
        var i;
        var callbackCount = 0;
        var firstErr;
        var $this = this;

        var callback = function (err, data) {
            callbackCount++;
            firstErr = firstErr || err;
            if (callbackCount >= latLngs.length) {
                $this.fire('routing:setWaypointsEnd', { err: firstErr });
                if (cb) {
                    cb(firstErr);
                }
            }
        };

        this.fire('routing:setWaypointsStart');

        // Workaround to optimize performance.
        // Add markers/layers to map "at once" and avoid a repaint for every single one.
        // Therefore remove and re-add FeatureGroup from/to map, also need to unset map reference,
        // as LayerGroup.addLayer would add to map anyway.
        this._waypoints.remove();
        this._waypoints._map = null;
        this._loadingTrailerGroup.remove();
        this._loadingTrailerGroup._map = null;

        for (i = 0; latLngs && i < latLngs.length; i++) {
            const beeline = beelineFlags && i < beelineFlags.length ? beelineFlags[i] : null;
            this.addWaypoint(latLngs[i], beeline, this._waypoints._last, null, callback);
        }

        this._loadingTrailerGroup._map = this._map;
        this._loadingTrailerGroup.addTo(this._map);
        this._waypoints._map = this._map;
        this._waypoints.addTo(this._map);
    },

    // patch to fix error when line is null or error line
    // (when called while still segments to calculate, e.g. permalink or fast drawing)
    toPolyline: function () {
        var latLngs = [];

        this._eachSegment(function (m1, m2, line) {
            // omit if null (still calculating) or error
            // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
            if (line && (line.feature || m1._routing.beeline)) {
                latLngs = latLngs.concat(line.getLatLngs());
            }
        });

        return L.polyline(latLngs);
    },

    _routeSegment: function (m1, m2, cb) {
        var loadingTrailer;

        // change segment color before request to indicate recalculation (mark old)
        if (m1 && m1._routing.nextLine !== null) {
            m1._routing.nextLine.setStyle({ color: 'dimgray' });
        }

        // animate dashed trailer as loading indicator
        if (m1 && m2) {
            loadingTrailer = new L.Polyline([m1.getLatLng(), m2.getLatLng()], {
                color: this.options.styles.track.color,
                opacity: this.options.styles.trailer.opacity,
                dashArray: [10, 10],
                className: 'loading-trailer',
                renderer: this._loadingTrailerRenderer,
            });
            this._loadingTrailerGroup.addLayer(loadingTrailer);
        }

        L.Routing.prototype._routeSegment.call(
            this,
            m1,
            m2,
            L.bind(function (err, data) {
                if (loadingTrailer) {
                    this._loadingTrailerGroup.removeLayer(loadingTrailer);
                }
                cb(err, data);
            }, this)
        );
    },

    getSegments: function () {
        var segments = [];

        this._eachSegment(function (m1, m2, line) {
            // omit if null (still calculating) or error
            // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
            if (line && line.feature) {
                segments.push(line);
            }
        });

        return segments;
    },

    _keydownListener: function (e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable) {
            this._draw.disable();
        } else if (e.keyCode === this.options.shortcut.draw.enable) {
            this._draw.enable();
        } else if (e.keyCode === this.options.shortcut.reverse) {
            this.reverse();
        } else if (e.keyCode === this.options.shortcut.deleteLastPoint) {
            this.deleteLastPoint();
        } else if (e.keyCode === this.options.shortcut.draw.beelineMode) {
            this.toggleBeelineDrawing();
        } else if (e.keyCode === this.options.shortcut.draw.beelineModifier) {
            this._draw._setTrailerStyle(true);
        }
    },

    _keyupListener: function (e) {
        if (e.keyCode === this.options.shortcut.draw.beelineModifier) {
            this._draw._setTrailerStyle(false);
        }
    },

    isDrawing: function () {
        return this._draw._enabled;
    },

    reverse: function () {
        const waypoints = this.getWaypoints();
        const beelineFlags = this.getBeelineFlags();
        waypoints.reverse();
        beelineFlags.reverse();
        this.clear();
        this.setWaypoints(waypoints, beelineFlags);
    },

    deleteLastPoint: function () {
        if ((lastPoint = this.getLast())) {
            this.removeWaypoint(lastPoint, function (err, data) {});
        }
    },

    _removeDistanceMarkers: function () {
        if (this._map && this._distanceMarkers) {
            this._map.removeLayer(this._distanceMarkers);
        }
    },

    _updateDistanceMarkers: function (e) {
        this._removeDistanceMarkers();

        if (this._map) {
            var distanceMarkersOpts = this.options.distanceMarkers || {};
            this._distanceMarkers = new L.DistanceMarkers(this.toPolyline(), this._map, distanceMarkersOpts);
            this._map.addLayer(this._distanceMarkers);
        }
    },

    _distance: function (latLng1, latLng2) {
        //return Math.round(latLng1.distanceTo(latLng2));
        const [ilon1, ilat1] = btools.util.CheapRuler.toIntegerLngLat([latLng1.lng, latLng1.lat]);
        const [ilon2, ilat2] = btools.util.CheapRuler.toIntegerLngLat([latLng2.lng, latLng2.lat]);

        return btools.util.CheapRuler.calcDistance(ilon1, ilat1, ilon2, ilat2);
    },

    _computeKinematic: function (distance, deltaHeight) {
        const rc = new BR.RoutingContext(this.profile);
        const stdPath = new BR.StdPath();

        stdPath.computeKinematic(rc, distance, deltaHeight, true);
        return stdPath;
    },

    _getCostFactor: function (line) {
        let costFactor = null;
        if (line) {
            const props = line.feature.properties;
            const length = props['track-length'];
            const cost = props['cost'];
            if (length) {
                costFactor = cost / length;
            }
        }
        return costFactor;
    },

    _interpolateBeelines: function (serialBeelines, before, after) {
        let altStart = serialBeelines[0].getLatLngs()[0].alt;
        const altEnd = serialBeelines[serialBeelines.length - 1].getLatLngs()[1].alt ?? altStart;
        altStart ??= altEnd;

        let serialDelta = 0;
        if (altStart != null && altEnd != null) {
            serialDelta = altEnd - altStart;
        }
        const serialDistance = serialBeelines.reduce(
            (dist, line) => (dist += line.feature.properties['track-length']),
            0
        );

        let beforeCostFactor = this._getCostFactor(before);
        let afterCostFactor = this._getCostFactor(after);
        let costFactor;
        if (beforeCostFactor != null && afterCostFactor != null) {
            costFactor = Math.max(beforeCostFactor, afterCostFactor);
        } else {
            costFactor = beforeCostFactor ?? afterCostFactor ?? 0;
        }

        for (const beeline of serialBeelines) {
            const props = beeline.feature.properties;
            const distance = props['track-length'];
            const deltaHeight = (serialDelta * distance) / serialDistance;

            const stdPath = this._computeKinematic(distance, deltaHeight);
            props['total-energy'] = stdPath.getTotalEnergy();
            props['total-time'] = stdPath.getTotalTime();

            // match BRouter/Java rounding where `(int)` cast truncates decimals
            // https://github.com/abrensch/brouter/blob/14d5a2c4e6b101a2eab711e70151142881df95c6/brouter-core/src/main/java/btools/router/RoutingEngine.java#L1216-L1217
            if (deltaHeight > 0) {
                // no filtering for simplicity for now
                props['filtered ascend'] = Math.trunc(deltaHeight);
            }
            props['plain-ascend'] = Math.trunc(deltaHeight + 0.5);
            // do not set interpolated alt value, to explicitly show missing data, e.g. in height graph

            props['cost'] = Math.round(distance * costFactor);
        }
    },

    _updateBeelines: function () {
        L.Routing.prototype._updateBeelines.call(this);

        let serialBeelines = [];
        let before = null;

        this._eachSegment(function (m1, m2, line) {
            if (line?._routing?.beeline) {
                serialBeelines.push(line);
            } else {
                if (serialBeelines.length > 0) {
                    this._interpolateBeelines(serialBeelines, before, line);
                }
                before = line;
                serialBeelines = [];
            }
        });

        if (serialBeelines.length > 0) {
            this._interpolateBeelines(serialBeelines, before, null);
        }
    },

    createBeeline: function (latLng1, latLng2) {
        const layer = L.Routing.prototype.createBeeline.call(this, latLng1, latLng2);
        const distance = this._distance(latLng1, latLng2);
        const props = {
            cost: 0,
            'filtered ascend': 0,
            'plain-ascend': 0,
            'total-energy': 0,
            'total-time': 0,
            'track-length': distance,
            messages: [
                [
                    'Longitude',
                    'Latitude',
                    'Elevation',
                    'Distance',
                    'CostPerKm',
                    'ElevCost',
                    'TurnCost',
                    'NodeCost',
                    'InitialCost',
                    'WayTags',
                    'NodeTags',
                    'Time',
                    'Energy',
                ],
                [
                    latLng2.lng * 1000000,
                    latLng2.lat * 1000000,
                    null,
                    distance,
                    null,
                    null,
                    null,
                    null,
                    null,
                    '',
                    '',
                    null,
                    null,
                ],
            ],
        };
        layer.feature = turf.lineString(
            [
                [latLng1.lng, latLng1.lat],
                [latLng2.lng, latLng2.lat],
            ],
            props
        );

        // corresponding to BRouter._assignFeatures
        for (const latLng of layer.getLatLngs()) {
            const featureMessage = props.messages[1];
            latLng.feature = BR.TrackEdges.getFeature(featureMessage);
            latLng.message = featureMessage;
        }

        return layer;
    },
});
