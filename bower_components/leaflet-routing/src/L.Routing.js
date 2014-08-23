/*
 * L.Routing main class
 *
 * Main clase for the Leaflet routing module
 *
 * @dependencies L
 *
 * @usage new L.Routing(options);
 *
 * @todo use L.Class.extend instead?
*/

L.Routing = L.Control.extend({

  // INCLUDES
  includes: [L.Mixin.Events]

  // CONSTANTS
  ,statics: {
    VERSION: '0.1.1-dev'
  }

  // OPTIONS
  ,options: {
    position: 'topleft'
    ,tooltips: {
      waypoint: 'Waypoint. Drag to move; Click to remove.',
      segment: 'Drag to create a new waypoint'
    }
    ,icons: {
      start: new L.Icon.Default()
      ,end: new L.Icon.Default()
      ,normal: new L.Icon.Default()
      ,draw: new L.Icon.Default()
    }
    ,styles: {
      trailer: {}
      ,track: {}
      ,nodata: {}
    }
    ,zIndexOffset: 2000
    ,routing: {
      router: null       // function (<L.Latlng> l1, <L.Latlng> l2, <Function> cb)
    }
    ,snapping: {
      layers: []         // layers to snap to
      ,sensitivity: 10   // snapping sensitivity
      ,vertexonly: false // vertex only snapping
    }
    ,shortcut: {
      draw: {
        enable: 68,      // char code for 'd'
        disable: 81      // char code for 'q'
      }
    }
  }

  /**
   * Routing Constructor
   *
   * @access public
   *
   * @param <Object> options - non-default options
   *
   * @todo render display of segments and waypoints
  */
  ,initialize: function (options) {
    this._editing = false;
    this._drawing = false;

    L.Util.setOptions(this, options);
  }

  /**
   * Called when controller is added to map
   *
   * @access public
   *
   * @param <L.Map> map - map instance
   *
   * @return <HTMLElement> container
  */
  ,onAdd: function (map) {
    this._map         = map;
    this._container   = this._map._container;
    this._overlayPane = this._map._panes.overlayPane;
    this._popupPane   = this._map._panes.popupPane;

    this._router      = this.options.routing.router;
    this._segments    = new L.FeatureGroup().addTo(map);
    this._waypoints   = new L.FeatureGroup().addTo(map);
    this._waypoints._first = null;
    this._waypoints._last = null;

    //L.DomUtil.disableTextSelection();
    //this._tooltip = new L.Tooltip(this._map);
    //this._tooltip.updateContent({ text: L.drawLocal.draw.marker.tooltip.start });

    if (this.options.shortcut) {
      L.DomEvent.addListener(this._container, 'keyup', this._keyupListener, this);
    }

    this._draw = new L.Routing.Draw(this, this.options);
    this._edit = new L.Routing.Edit(this, this.options);
    this._edit.enable();

    this.on('waypoint:click', this._waypointClickHandler, this)
    this._segments.on('mouseover'    , this._fireSegmentEvent, this);
    this._edit.on('segment:mouseout' , this._fireSegmentEvent, this);
    this._edit.on('segment:dragstart', this._fireSegmentEvent, this);
    this._edit.on('segment:dragend'  , this._fireSegmentEvent, this);

    var container = L.DomUtil.create('div', 'leaflet-routing');

    return container;
  }

  /**
   * Called when controller is removed from map
   *
   * @access public
   *
   * @param <L.Map> map - map instance
  */
  ,onRemove: function(map) {
    //L.DomUtil.create('div', 'leaflet-routing'); <= delete this

    this.off('waypoint:click', this._waypointClickHandler, this)
    this._segments.off('mouseover'    , this._fireSegmentEvent, this);
    this._edit.off('segment:mouseout' , this._fireSegmentEvent, this);
    this._edit.off('segment:dragstart', this._fireSegmentEvent, this);
    this._edit.off('segment:dragend'  , this._fireSegmentEvent, this);

    this._edit.disable();
    this._draw.disable();

    L.DomUtil.enableTextSelection();
    // this._tooltip.dispose();
    // this._tooltip = null;
    L.DomEvent.removeListener(this._container, 'keyup', this._keyupListener);

    delete this._draw;
    delete this._edit;
    delete this._map;
    delete this._router;
    delete this._segments;
    delete this._waypoints;
    delete this.options;
  }

  /**
   * Called whenever a waypoint is clicked
   *
   * @access private
   *
   * @param <L.Event> e - click event
  */
  ,_waypointClickHandler: function(e) {
    this.removeWaypoint(e.marker, function() {
      // console.log(arguments);
    });
  }

  /**
   * Add new waypoint to path
   *
   * @access public
   *
   * @param <L.Marker> marker - new waypoint marker (can be ll)
   * @param <L.Marker> prev - previous waypoint marker
   * @param <L.Marker> next - next waypoint marker
   * @param <Function> cb - callback method (err, marker)
   *
   * @return void
  */
  ,addWaypoint: function(marker, prev, next, cb) {
    if (marker instanceof L.LatLng) {
      marker = new L.Marker(marker, { title: this.options.tooltips.waypoint });
    }

    marker._routing = {
      prevMarker  : prev
      ,nextMarker : next
      ,prevLine   : null
      ,nextLine   : null
      ,timeoutID  : null
    };

    if (this._waypoints._first === null && this._waypoints._last === null) {
      this._waypoints._first = marker;
      this._waypoints._last = marker;
    } else if (next === null) {
      this._waypoints._last = marker;
    } else if (prev === null) {
      this._waypoints._first = marker;
    }

    if (marker._routing.prevMarker !== null) {
      marker._routing.prevMarker._routing.nextMarker = marker;
      marker._routing.prevLine = marker._routing.prevMarker._routing.nextLine;
      if (marker._routing.prevLine !== null) {
        marker._routing.prevLine._routing.nextMarker = marker;
      }
    }

    if (marker._routing.nextMarker !== null) {
      marker._routing.nextMarker._routing.prevMarker = marker;
      marker.nextLine = marker._routing.nextMarker._routing.prevLine;
      if (marker._routing.nextLine !== null) {
        marker._routing.nextLine._routing.prevMarker = marker;
      }
    }

    marker.on('mouseover', this._fireWaypointEvent, this);
    marker.on('mouseout' , this._fireWaypointEvent, this);
    marker.on('dragstart', this._fireWaypointEvent, this);
    marker.on('dragend'  , this._fireWaypointEvent, this);
    marker.on('drag'     , this._fireWaypointEvent, this);
    marker.on('click'    , this._fireWaypointEvent, this);

    this.routeWaypoint(marker, cb);
    this._waypoints.addLayer(marker);
    marker.dragging.enable();
  }

  /**
   * Remove a waypoint from path
   *
   * @access public
   *
   * @param <L.Marker> marker - new waypoint marker (can be ll)
   * @param <Function> cb - callback method
   *
   * @return void
  */
  ,removeWaypoint: function(marker, cb) {
    marker.off('mouseover', this._fireWaypointEvent, this);
    marker.off('mouseout' , this._fireWaypointEvent, this);
    marker.off('dragstart', this._fireWaypointEvent, this);
    marker.off('dragend'  , this._fireWaypointEvent, this);
    marker.off('drag'     , this._fireWaypointEvent, this);
    marker.off('click'    , this._fireWaypointEvent, this);

    var prev = marker._routing.prevMarker;
    var next = marker._routing.nextMarker;

    if (this._waypoints._first && marker._leaflet_id === this._waypoints._first._leaflet_id) {
      this._waypoints._first = next;
    }

    if (this._waypoints._last && marker._leaflet_id === this._waypoints._last._leaflet_id) {
      this._waypoints._last = prev;
    }

    if (prev !== null) {
      prev._routing.nextMarker = next;
      prev._routing.nextLine = null;
    }

    if (next !== null) {
      next._routing.prevMarker = prev;
      next._routing.prevLine = null;
    }

    if (marker._routing.nextLine !== null) {
      this._segments.removeLayer(marker._routing.nextLine);
    }

    if (marker._routing.prevLine !== null) {
      this._segments.removeLayer(marker._routing.prevLine);
    }

    this._waypoints.removeLayer(marker);

    if (prev !== null) {
      this.routeWaypoint(prev, cb);
    } else if (next !== null) {
      this.routeWaypoint(next, cb);
    } else {
      this._draw.enable();
      cb(null, null);
    }

  }

  /**
   * Route with respect to waypoint
   *
   * @access public
   *
   * @param <L.Marker> marker - marker to route on
   * @param <Function> cb - callback function
   *
   * @return void
   *
   * @todo add propper error checking for callback
  */
  ,routeWaypoint: function(marker, cb) {
    var i = 0;
    var firstErr;
    var $this = this;
    var callback = function(err, data) {
      i++;
      firstErr = firstErr || err;
      if (i === 2) {
        $this.fire('routing:routeWaypointEnd', { err: firstErr });
        cb(firstErr, marker);
      }
    }

    this.fire('routing:routeWaypointStart');

    this._routeSegment(marker._routing.prevMarker, marker, callback);
    this._routeSegment(marker, marker._routing.nextMarker, callback);
  }

  /**
   * Recalculate the complete route by routing each segment
   *
   * @access public
   *
   * @param <Function> cb - callback function
   *
   * @return void
   *
   * @todo add propper error checking for callback
  */
  ,rerouteAllSegments: function(cb) {
    var numSegments = this.getWaypoints().length - 1;
    var callbackCount = 0;
    var firstErr;
    var $this = this;

    var callback = function(err, data) {
      callbackCount++;
      firstErr = firstErr || err;
      if (callbackCount >= numSegments) {
        $this.fire('routing:rerouteAllSegmentsEnd', { err: firstErr });
        if (cb) {
          cb(firstErr);
        }
      }
    };

    $this.fire('routing:rerouteAllSegmentsStart');

    if (numSegments < 1) {
      return callback(null, true);
    }

    this._eachSegment(function(m1, m2) {
      this._routeSegment(m1, m2, callback);
    });
  }

  /**
   * Route segment between two markers
   *
   * @access private
   *
   * @param <L.Marker> m1 - first waypoint marker
   * @param <L.Marker> m2 - second waypoint marker
   * @param <Function> cb - callback function (<Error> err, <String> data)
   *
   * @return void
   *
   * @todo logic if router fails
  */
  ,_routeSegment: function(m1, m2, cb) {
    var $this = this;

    if (m1 === null || m2 === null) {
      return cb(null, true);
    }

    this._router(m1.getLatLng(), m2.getLatLng(), function(err, layer) {
      if (typeof layer === 'undefined') {
        var layer = new L.Polyline([m1.getLatLng(), m2.getLatLng()], $this.options.styles.nodata);
      } else {
        layer.setStyle($this.options.styles.track);
      }

      layer._routing = {
        prevMarker: m1
        ,nextMarker: m2
      };

      if (m1._routing.nextLine !== null) {
        $this._segments.removeLayer(m1._routing.nextLine);
      }
      $this._segments.addLayer(layer);

      m1._routing.nextLine = layer;
      m2._routing.prevLine = layer;

      return cb(err, layer);
    });
  }

  /**
   * Iterate over all segments and execute callback for each segment
   *
   * @access private
   *
   * @param <function> callback - function to call for each segment
   * @param <object> context - callback execution context (this). Optional, default: this
   *
   * @return void
  */
  ,_eachSegment: function(callback, context) {
    var thisArg = context || this;
    var marker = this.getFirst();

    if (marker === null) { return; }

    while (marker._routing.nextMarker !== null) {
      var m1 = marker;
      var m2 = marker._routing.nextMarker;
      var line = marker._routing.nextLine;

      callback.call(thisArg, m1, m2, line);

      marker = marker._routing.nextMarker;
    }
  }

  /**
   * Fire events
   *
   * @access private
   *
   * @param <L.Event> e - mouse event
   *
   * @return void
  */
  ,_fireWaypointEvent: function(e) {
    this.fire('waypoint:' + e.type, {marker:e.target});
  }

  /**
   *
  */
  ,_fireSegmentEvent: function(e) {
    if (e.type.split(':').length === 2) {
      this.fire(e.type);
    } else {
      this.fire('segment:' + e.type);
    }
  }

  /**
   * Get first waypoint
   *
   * @access public
   *
   * @return L.Marker
  */
  ,getFirst: function() {
    return this._waypoints._first;
  }

  /**
   * Get last waypoint
   *
   * @access public
   *
   * @return L.Marker
  */
  ,getLast: function() {
    return this._waypoints._last;
  }

  /**
   * Get all waypoints
   *
   * @access public
   *
   * @return <L.LatLng[]> all waypoints or empty array if none
  */
  ,getWaypoints: function() {
    var latLngs = [];

    this._eachSegment(function(m1) {
      latLngs.push(m1.getLatLng());
    });

    if (this.getLast()) {
      latLngs.push(this.getLast().getLatLng());
    }

    return latLngs;
  }

  /**
   * Concatenates all route segments to a single polyline
   *
   * @access public
   *
   * @return <L.Polyline> polyline, with empty _latlngs when no route segments
   */
  ,toPolyline: function() {
    var latLngs = [];

    this._eachSegment(function(m1, m2, line) {
      latLngs = latLngs.concat(line.getLatLngs());
    });

    return L.polyline(latLngs);
  }

  /**
   * Export route to GeoJSON
   *
   * @access public
   *
   * @param <boolean> enforce2d - enforce 2DGeoJSON
   *
   * @return <object> GeoJSON object
   *
  */
  ,toGeoJSON: function(enforce2d) {
    var geojson = {type: "LineString", properties: {waypoints: []}, coordinates: []};
    var current = this._waypoints._first;

    if (current === null) { return geojson; }

    // First waypoint marker
    geojson.properties.waypoints.push({
      coordinates: [current.getLatLng().lng, current.getLatLng().lat],
      _index: 0
    });

    while (current._routing.nextMarker) {
      var next = current._routing.nextMarker;

      // Line segment
      var tmp = current._routing.nextLine.getLatLngs();
      for (var i = 0; i < tmp.length; i++) {
        if (tmp[i].alt && (typeof enforce2d === 'undefined' || enforce2d === false)) {
          geojson.coordinates.push([tmp[i].lng, tmp[i].lat, tmp[i].alt]);
        } else {
          geojson.coordinates.push([tmp[i].lng, tmp[i].lat]);
        }
      }

      // Waypoint marker
      geojson.properties.waypoints.push({
        coordinates: [next.getLatLng().lng, next.getLatLng().lat],
        _index: geojson.coordinates.length-1
      });

      // Next waypoint marker
      current = current._routing.nextMarker;
    }

    return geojson
  }

  /**
   * Import route from GeoJSON
   *
   * @access public
   *
   * @param <object> geojson - GeoJSON object with waypoints
   * @param <object> opts - parsing options
   * @param <function> cb - callback method (err)
   *
   * @return undefined
   *
  */
  ,loadGeoJSON: function(geojson, opts, cb) {
    var $this, oldRouter, index, waypoints;

    $this = this;

    // Check for optional options parameter
    if (typeof opts === 'function' || typeof opts === 'undefined') {
      cb = opts;
      opts = {}
    }

    // Set default options
    opts.waypointDistance = opts.waypointDistance || 50;
    opts.fitBounds = opts.fitBounds || true;

    // Check for waypoints before processing geojson
    if (!geojson.properties || !geojson.properties.waypoints) {
      if (!geojson.properties) { geojson.properties = {} };
      geojson.properties.waypoints = [];

      for (var i = 0; i < geojson.coordinates.length; i = i + opts.waypointDistance) {
        geojson.properties.waypoints.push({
          _index: i,
          coordinates: geojson.coordinates[i].slice(0, 2)
        });
      }

      if (i > geojson.coordinates.length-1) {
        geojson.properties.waypoints.push({
          _index: geojson.coordinates.length-1,
          coordinates: geojson.coordinates[geojson.coordinates.length-1].slice(0, 2)
        });
      }
    }

    index = 0;
    oldRouter = $this._router;
    waypoints = geojson.properties.waypoints;

    // This is a fake router.
    //
    // It is currently not possible to add a waypoint with a known line segment
    // manually. We are hijacking the router so that we can intercept the
    // request and return the correct linesegment.
    //
    // It you want to fix this; please make a patch and submit a pull request on
    // GitHub.
    $this._router = function(m1, m2, cb) { var start =
      waypoints[index-1]._index; var end = waypoints[index]._index+1;

      return cb(null, L.GeoJSON.geometryToLayer({
        type: 'LineString',
        coordinates: geojson.coordinates.slice(start, end)
      }));
    };

    // Clean up
    end = function() {
      $this._router = oldRouter; // Restore router
      // Set map bounds based on loaded geometry
      setTimeout(function() {
        if (opts.fitBounds) {
          $this._map.fitBounds(L.polyline(L.GeoJSON.coordsToLatLngs(geojson.coordinates)).getBounds());
        }

        if (typeof cb === 'function') { cb(null); }
      }, 0);
    }

    // Add waypoints
    add = function() {
      if (!waypoints[index]) { return end() }

      var coords = waypoints[index].coordinates;
      var prev = $this._waypoints._last;

      $this.addWaypoint(L.latLng(coords[1], coords[0]), prev, null, function(err, m) {
        add(++index);
      });
    }

    add();
  }

  /**
   * Start (or continue) drawing
   *
   * Call this method in order to start or continue drawing. The drawing handler
   * will be activate and the user can draw on the map.
   *
   * @access public
   *
   * @return void
   *
   * @todo check enable
  */
  ,draw: function (enable) {
    if (typeof enable === 'undefined') {
      var enable = true;
    }

    if (enable) {
      this._draw.enable();
    } else {
      this._draw.disable();
    }
  }

  /**
   * Enable or disable routing
   *
   * @access public
   *
   * @return void
   *
   * @todo check enable
  */
  ,routing: function (enable) {
    throw new Error('Not implemented');
  }

  /**
   * Enable or disable snapping
   *
   * @access public
   *
   * @return void
   *
   * @todo check enable
  */
  ,snapping: function (enable) {
    throw new Error('Not implemented');
  }

    /**
   * Key up listener
   *
   * * `ESC` to cancel drawing
   * * `M` to enable drawing
   *
   * @access private
   *
   * @return void
  */
  ,_keyupListener: function (e) {
    if (e.keyCode === this.options.shortcut.draw.disable) {
      this._draw.disable();
    } else if (e.keyCode === this.options.shortcut.draw.enable) {
      this._draw.enable();
    }
  }

});
