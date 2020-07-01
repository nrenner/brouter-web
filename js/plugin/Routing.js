L.Routing.Draw.prototype._hideTrailer = function() {
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
            opacity: 1
        },
        snapping: null,
        zIndexOffset: -2000,
        distanceMarkers: {
            // width as base number, multiplied by number of digits + one for padding
            iconSize: [6, 18],
            offset: 5000,
            textFunction: function(distance) {
                return distance / 1000;
            }
        },
        shortcut: {
            draw: {
                enable: 68, // char code for 'd'
                disable: 27 // char code for 'ESC'
            },
            reverse: 82, // char code for 'r'
            deleteLastPoint: 90 // char code for 'z'
        }
    },

    onAdd: function(map) {
        this._segmentsCasing = new L.FeatureGroup().addTo(map);
        this._loadingTrailerGroup = new L.FeatureGroup().addTo(map);

        var container = L.Routing.prototype.onAdd.call(this, map);

        this._segments.on('layeradd', this._addSegmentCasing, this);
        this._segments.on('layerremove', this._removeSegmentCasing, this);

        this._waypoints.on('layeradd', this._setMarkerOpacity, this);

        this.on('routing:routeWaypointStart routing:rerouteAllSegmentsStart', function(evt) {
            this._removeDistanceMarkers();
        });

        this.on('routing:routeWaypointEnd routing:setWaypointsEnd routing:rerouteAllSegmentsEnd', function(evt) {
            this._updateDistanceMarkers(evt);
        });

        // turn line mouse marker off while over waypoint marker
        this.on(
            'waypoint:mouseover',
            function(e) {
                // L.Routing.Edit._segmentOnMouseout without firing 'segment:mouseout' (enables draw)
                if (this._dragging) {
                    return;
                }

                this._mouseMarker.setOpacity(0.0);
                this._map.off('mousemove', this._segmentOnMousemove, this);
                this._suspended = true;
            },
            this._edit
        );

        this.on(
            'waypoint:mouseout',
            function(e) {
                this._segmentOnMouseover(e);
                this._suspended = false;
            },
            this._edit
        );

        this._edit._mouseMarker.setIcon(
            L.divIcon({
                className: 'line-mouse-marker',
                iconAnchor: [8, 8], // size/2 + border/2
                iconSize: [16, 16]
            })
        );

        // Forward mousemove event to snapped feature (for Leaflet.Elevation to
        // update indicator), see also L.Routing.Edit._segmentOnMousemove
        this._edit._mouseMarker.on(
            'move',
            L.bind(function(e) {
                var latLng = e.latlng;
                if (latLng._feature) {
                    this._mouseMarker._feature = latLng._feature;
                    latLng._feature.fire('mousemove', e, true);
                }
            }, this._edit)
        );
        var mouseoutHandler = function(e) {
            if (this._mouseMarker._feature) {
                this._mouseMarker._feature.fire('mouseout', e, true);
                this._mouseMarker._feature = null;
            }
        };
        this._edit.on('segment:mouseout', mouseoutHandler, this._edit);
        this._edit._mouseMarker.on('dragstart', mouseoutHandler, this._edit);
        this.on('waypoint:mouseover', mouseoutHandler, this._edit);

        this._draw.on('enabled', function() {
            // crosshair cursor
            L.DomUtil.addClass(map.getContainer(), 'routing-draw-enabled');

            // prevent cursor marker from consuming mouse events (invisible with draw:false)
            this._marker._icon.style.pointerEvents = 'none';

            // intercept listener: only re-show draw trailer after marker hover
            // when edit is not active (i.e. wasn't also supended)
            this._parent.off('waypoint:mouseout', this._catchWaypointEvent, this);
            this.on(
                'waypoint:mouseout',
                function(e) {
                    if (!this._parent._edit._suspended) {
                        this._catchWaypointEvent(e);
                    }
                },
                this
            );
        });
        this._draw.on('disabled', function() {
            L.DomUtil.removeClass(map.getContainer(), 'routing-draw-enabled');
        });

        // hide trailer over controls and outside map
        function show() {
            if (this._hidden && this._parent._waypoints._first) {
                this._show();
            }
        }
        function hide() {
            if (!this._hidden && this._parent._waypoints._first) {
                this._hide();
            }
        }
        this._draw.on('enabled', function() {
            this._map.on('mouseout', hide, this);
            this._map.on('mouseover', show, this);
            L.DomEvent.on(this._map._controlContainer, 'mouseout', show, this);
            L.DomEvent.on(this._map._controlContainer, 'mouseover', hide, this);
        });
        this._draw.on('disabled', function() {
            this._map.off('mouseout', hide, this);
            this._map.off('mouseover', show, this);
            L.DomEvent.off(this._map._controlContainer, 'mouseout', show, this);
            L.DomEvent.off(this._map._controlContainer, 'mouseover', hide, this);
        });

        // Call show after deleting last waypoint, but hide trailer.
        // Gets hidden in _catchWaypointEvent on waypoint mouseover, but
        // mouseout to show again never fires when deleted. Click handler
        // _onMouseClick aborts when hidden, so no waypoint can be added
        // although enabled.
        this.on(
            'waypoint:click',
            function() {
                if (this._hidden && !this._parent._waypoints._first) {
                    this._show();
                    this._hideTrailer();
                }
            },
            this._draw
        );

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
        L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);

        // enable drawing mode
        this.draw(true);

        return container;
    },

    _addSegmentCasing: function(e) {
        var casing = L.polyline(e.layer.getLatLngs(), this.options.styles.trackCasing);
        this._segmentsCasing.addLayer(casing);
        e.layer._casing = casing;
        this._segments.bringToFront();
    },

    _removeSegmentCasing: function(e) {
        this._segmentsCasing.removeLayer(e.layer._casing);
    },

    setOpacity: function(opacity) {
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
            opacity: sourceOpacity
        });
        this._segmentsCasing.setStyle({
            opacity: sourceOpacity
        });
        this._waypoints.eachLayer(function(marker) {
            marker.setOpacity(opacity);
        });

        if (this._distanceMarkers) {
            this._distanceMarkers.setOpacity(opacity);
        }
    },

    _setMarkerOpacity: function(e) {
        e.layer.setOpacity(this.options.icons.opacity);
    },

    _removeMarkerEvents: function(marker) {
        marker.off('mouseover', this._fireWaypointEvent, this);
        marker.off('mouseout', this._fireWaypointEvent, this);
        marker.off('dragstart', this._fireWaypointEvent, this);
        marker.off('dragend', this._fireWaypointEvent, this);
        marker.off('drag', this._fireWaypointEvent, this);
        marker.off('click', this._fireWaypointEvent, this);
    },

    clear: function() {
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

    setWaypoints: function(latLngs, cb) {
        var i;
        var callbackCount = 0;
        var firstErr;
        var $this = this;

        var callback = function(err, data) {
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
            this.addWaypoint(latLngs[i], this._waypoints._last, null, callback);
        }

        this._loadingTrailerGroup._map = this._map;
        this._loadingTrailerGroup.addTo(this._map);
        this._waypoints._map = this._map;
        this._waypoints.addTo(this._map);
    },

    // patch to fix error when line is null or error line
    // (when called while still segments to calculate, e.g. permalink or fast drawing)
    toPolyline: function() {
        var latLngs = [];

        this._eachSegment(function(m1, m2, line) {
            // omit if null (still calculating) or error
            // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
            if (line && line.feature) {
                latLngs = latLngs.concat(line.getLatLngs());
            }
        });

        return L.polyline(latLngs);
    },

    _routeSegment: function(m1, m2, cb) {
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
                className: 'loading-trailer'
            });
            this._loadingTrailerGroup.addLayer(loadingTrailer);
        }

        L.Routing.prototype._routeSegment.call(
            this,
            m1,
            m2,
            L.bind(function(err, data) {
                if (loadingTrailer) {
                    this._loadingTrailerGroup.removeLayer(loadingTrailer);
                }
                cb(err, data);
            }, this)
        );
    },

    getSegments: function() {
        var segments = [];

        this._eachSegment(function(m1, m2, line) {
            // omit if null (still calculating) or error
            // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
            if (line && line.feature) {
                segments.push(line);
            }
        });

        return segments;
    },

    _keydownListener: function(e) {
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
        }
    },

    _keyupListener: function(e) {
        // Prevent Leaflet from triggering drawing a second time on keyup,
        // since this is already done in _keydownListener
        if (e.keyCode === this.options.shortcut.draw.enable) {
            return;
        }
    },

    isDrawing: function() {
        return this._draw._enabled;
    },

    reverse: function() {
        var waypoints = this.getWaypoints();
        waypoints.reverse();
        this.clear();
        this.setWaypoints(waypoints);
    },

    deleteLastPoint: function() {
        if ((lastPoint = this.getLast())) {
            this.removeWaypoint(lastPoint, function(err, data) {});
        }
    },

    _removeDistanceMarkers: function() {
        if (this._map && this._distanceMarkers) {
            this._map.removeLayer(this._distanceMarkers);
        }
    },

    _updateDistanceMarkers: function(e) {
        this._removeDistanceMarkers();

        if (this._map) {
            var distanceMarkersOpts = this.options.distanceMarkers || {};
            this._distanceMarkers = new L.DistanceMarkers(this.toPolyline(), this._map, distanceMarkersOpts);
            this._map.addLayer(this._distanceMarkers);
        }
    }
});
