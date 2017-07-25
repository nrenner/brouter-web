L.Routing.Draw.prototype._hideTrailer = function() {
  if (this._trailer.options.opacity !== 0.0) {
    this._trailer.setStyle({opacity: 0.0});
  }
};

BR.Routing = L.Routing.extend({
    options: {
        position: 'topright',
        icons: {
            /* not implemented yet
            start: new L.Icon.Default({iconUrl: 'bower_components/leaflet-gpx/pin-icon-start.png'}),
            end: new L.Icon.Default(),
            normal: new L.Icon.Default()
            */
            draw: false,
            opacity: 1
        },
        snapping: null,
        zIndexOffset: -2000
    },

    onAdd: function (map) {
        this._segmentsCasing = new L.FeatureGroup().addTo(map);

        var container = L.Routing.prototype.onAdd.call(this, map);

        this._segments.on('layeradd', this._addSegmentCasing, this);
        this._segments.on('layerremove', this._removeSegmentCasing, this);

        this._waypoints.on('layeradd', this._setMarkerOpacity, this);

        // turn line mouse marker off while over waypoint marker
        this.on('waypoint:mouseover', function(e) {
            // L.Routing.Edit._segmentOnMouseout without firing 'segment:mouseout' (enables draw)
            if (this._dragging) { return; }

            this._mouseMarker.setOpacity(0.0);
            this._map.off('mousemove', this._segmentOnMousemove, this);
            this._suspended = true;
        }, this._edit);

        this.on('waypoint:mouseout', function(e) {
            this._segmentOnMouseover(e);
            this._suspended = false;
        }, this._edit);

        this._edit._mouseMarker.setIcon(L.divIcon({
          className: 'line-mouse-marker'
          ,iconAnchor: [8, 8] // size/2 + border/2
          ,iconSize: [16, 16]
        }));

        // Forward mousemove event to snapped feature (for Leaflet.Elevation to
        // update indicator), see also L.Routing.Edit._segmentOnMousemove
        this._edit._mouseMarker.on('move', L.bind(function(e) {
            var latLng = e.latlng;
            if (latLng._feature) {
                this._mouseMarker._feature = latLng._feature;
                latLng._feature.fire('mousemove', e, true);
            }
        }, this._edit));
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
            this._parent.off('waypoint:mouseout' , this._catchWaypointEvent, this);
            this.on('waypoint:mouseout' , function(e) {
                if (!this._parent._edit._suspended) {
                    this._catchWaypointEvent(e);
                }
            }, this);
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
        this.on('waypoint:click', function() {
            if (this._hidden && !this._parent._waypoints._first) {
                this._show();
                this._hideTrailer();
            }
        }, this._draw);

        // keys not working when map container does not have focus, use document instead
        L.DomEvent.removeListener(this._container, 'keyup', this._keyupListener);
        L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);

        // enable drawing mode
        this.draw(true);

        return container;
    }

  ,_addSegmentCasing: function(e) {
    var casing = L.polyline(e.layer.getLatLngs(), this.options.styles.trackCasing);
    this._segmentsCasing.addLayer(casing);
    e.layer._casing = casing;
    this._segments.bringToFront();
  }

  ,_removeSegmentCasing: function(e) {
    this._segmentsCasing.removeLayer(e.layer._casing);
  }

  ,setOpacity: function(opacity) {
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
  }

  ,_setMarkerOpacity: function(e) {
    e.layer.setOpacity(this.options.icons.opacity);
  }

  ,_removeMarkerEvents: function(marker) {
      marker.off('mouseover', this._fireWaypointEvent, this);
      marker.off('mouseout' , this._fireWaypointEvent, this);
      marker.off('dragstart', this._fireWaypointEvent, this);
      marker.off('dragend'  , this._fireWaypointEvent, this);
      marker.off('drag'     , this._fireWaypointEvent, this);
      marker.off('click'    , this._fireWaypointEvent, this);
  }

  ,clear: function() {
    var drawEnabled = this._draw._enabled;
    var current = this._waypoints._first;

    this.draw(false);

    if (current === null) { return; }
    this._removeMarkerEvents(current);
    while (current._routing.nextMarker) {
      var marker = current._routing.nextMarker;
      this._removeMarkerEvents(marker);
      current = marker;
    };

    this._waypoints._first = null;
    this._waypoints._last = null;
    this._waypoints.clearLayers();
    this._segments.clearLayers();

    if (drawEnabled) {
        this.draw(true);
    }
  }

  ,setWaypoints: function(latLngs, cb) {
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
    for (i = 0; latLngs && i < latLngs.length; i++) {
      this.addWaypoint(latLngs[i], this._waypoints._last, null, callback);
    }
  }

  // patch to fix error when line is null or error line
  // (when called while still segments to calculate, e.g. permalink or fast drawing)
   ,toPolyline: function() {
    var latLngs = [];

    this._eachSegment(function(m1, m2, line) {
      // omit if null (still calculating) or error
      // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
      if (line && line.feature) {
        latLngs = latLngs.concat(line.getLatLngs());
      }
    });

    return L.polyline(latLngs);
  }

  ,_routeSegment: function(m1, m2, cb) {
    var loadingTrailer;

    // change segment color before request to indicate recalculation (mark old)
    if (m1 && m1._routing.nextLine !== null) {
        m1._routing.nextLine.setStyle({color: 'dimgray' });
    }

    // animate dashed trailer as loading indicator
    if (m1 && m2) {
        loadingTrailer = new L.Polyline([m1.getLatLng(), m2.getLatLng()], {
            color: this.options.styles.track.color,
            opacity: this.options.styles.trailer.opacity,
            dashArray: [10, 10],
            className: 'loading-trailer'
        });
        loadingTrailer.addTo(this._map);
    }

    L.Routing.prototype._routeSegment.call(this, m1, m2, L.bind(function(err, data) {
        if (loadingTrailer) {
            this._map.removeLayer(loadingTrailer);
        }
        cb(err, data);
    }, this));
  }

  ,getSegments: function() {
    var segments = [];

    this._eachSegment(function(m1, m2, line) {
      // omit if null (still calculating) or error
      // NOTE: feature check specific to BRouter GeoJSON response, workaround to detect error line
      if (line && line.feature) {
        segments.push(line);
      }
    });

    return segments;
  }

  // add 'esc' to disable drawing
  ,_keyupListener: function (e) {
    if (e.keyCode === 27) {
        this._draw.disable();
    } else {
        L.Routing.prototype._keyupListener.call(this, e);
    }
  }
});
