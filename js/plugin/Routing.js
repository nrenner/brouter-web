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
        snapping: null
    },

    onAdd: function (map) {
        var container = L.Routing.prototype.onAdd.call(this, map);

        this._draw.on('enabled', function() {
            L.DomUtil.addClass(map.getContainer(), 'routing-draw-enabled');
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

  ,setWaypoints: function(latLngs) {
    var $this = this;
    var index = 0;

    var add = function() {
      if (!latLngs || index >= latLngs.length) { return; }

      var prev = $this._waypoints._last;

      $this.addWaypoint(latLngs[index], prev, null, function(err, m) {
        add(++index);
      });
    };

    add();
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
        segments.push(line);
    });

    return segments;
  }
});
