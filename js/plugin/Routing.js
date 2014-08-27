BR.Routing = L.Routing.extend({
    options: {
        icons: {
            /* not implemented yet
            start: new L.Icon.Default({iconUrl: 'bower_components/leaflet-gpx/pin-icon-start.png'}),
            end: new L.Icon.Default(),
            normal: new L.Icon.Default()
            */
            draw: false
        },
        snapping: null,
        zIndexOffset: -2000
    },

    onAdd: function (map) {
        var container = L.Routing.prototype.onAdd.call(this, map);

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

        // enable drawing mode
        this.draw(true);
        
        return container;
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
    var current = this._waypoints._first;
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
        m1._routing.nextLine.options.color = 'dimgray';
        m1._routing.nextLine._updateStyle();
    }

    // animate dashed trailer as loading indicator
    if (m1 && m2) {
        loadingTrailer = new L.Polyline([m1.getLatLng(), m2.getLatLng()], {
            opacity: 0.6,
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
