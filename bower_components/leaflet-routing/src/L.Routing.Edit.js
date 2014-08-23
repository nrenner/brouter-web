/*
 * L.Routing.Edit class
 *
 * Responsible handle edits
 *
 * @dependencies L, L.Routing
 *
 * @usage new L.Routing.Draw(map, options);
*/

L.Routing.Edit = L.Handler.extend({

  // INCLUDES
  includes: [L.Mixin.Events]

  // OPTIONS
  ,options: {}

  /**
   * Edit Constructor
   *
   * @access public
   *
   * @param <> parent - parent class instance
   * @param <Oject> options - routing options
   *
   * @return void
   *
   * @todo fetch last waypoint
  */
  ,initialize: function (parent, options) {
    this._parent = parent;
    this._map = parent._map;

    this._enabled = false;

    L.Util.setOptions(this, options);
  }

  /**
   * Enable drawing
   *
   * @access public
   *
   * @event map.routing:edit-start
   *
   * @return void
  */
  ,enable: function() {
    if (this._enabled) { return; }

    this._enabled = true;
    this._addHooks();
    this.fire('enabled');

    this._map.fire('routing:edit-start');
  }

  /**
   * Disable drawing
   *
   * @access public
   *
   * @event map.draw:edit-end
   *
   * @return void
  */
  ,disable: function() {
    if (!this._enabled) { return; }

    this._enabled = false;
    this._removeHooks();
    this.fire('disabled');

    this._map.fire('routing:edit-end');
  }

  /**
   * Add hooks
   *
   * This method is invoked when `enable()` is called – and sets up all
   * necessary hooks such as:
   * * text selection
   * * key listeners
   * * mouse marker
   *
   * @access private
   *
   * @return void
   *
   * @todo hide and style the trailer!
  */
  ,_addHooks: function() {
    if (!this._map) { return; }

    if (!this._mouseMarker) {
      this._mouseMarker = new L.Marker(this._map.getCenter(), {
        icon: L.divIcon({
          className: 'line-mouse-marker'
          ,iconAnchor: [5, 5]
          ,iconSize: [10, 10]
        })
        ,clickable: true
        ,draggable: true
        ,opacity: 0
        ,zIndexOffset: this.options.zIndexOffset
        ,title: this.options.tooltips.segment
      });
    }
    this._mouseMarker.addTo(this._map);

    if (!this._trailer1) {
      var ll = this._map.getCenter();
      this._trailerOpacity = this.options.styles.trailer.opacity || 0.2;
      var style = L.extend({}, this.options.styles.trailer, {opacity: 0.0,clickable: false});
      this._trailer1 = new L.Polyline([ll, ll], style);
      this._trailer2 = new L.Polyline([ll, ll], style);
    }
    this._trailer1.addTo(this._map);
    this._trailer2.addTo(this._map);

    this._parent.on('segment:mouseover' , this._segmentOnMouseover, this);

    this._mouseMarker.on('dragstart'    , this._segmentOnDragstart, this);
    this._mouseMarker.on('drag'         , this._segmentOnDrag, this);
    this._mouseMarker.on('dragend'      , this._segmentOnDragend, this);

    this._parent.on('waypoint:dragstart', this._waypointOnDragstart, this);
    this._parent.on('waypoint:drag'     , this._waypointOnDrag, this);
    this._parent.on('waypoint:dragend'  , this._waypointOnDragend, this);
  }

  /**
   * Remove hooks
   *
   * This method is invoked after the `disable()` has been called and removes
   * all the hooks set up using the `_addHooks()` method.
   *
   * @access private
   *
   * @return void
  */
  ,_removeHooks: function() {
    if (!this._map) { return; }

    // this._trailer1.addTo(this._map);
    // this._trailer2.addTo(this._map);

    this._parent.off('segment:mouseover' , this._segmentOnMouseover, this);

    this._mouseMarker.off('dragstart'    , this._segmentOnDragstart, this);
    this._mouseMarker.off('drag'         , this._segmentOnDrag, this);
    this._mouseMarker.off('dragend'      , this._segmentOnDragend, this);

    this._parent.off('waypoint:dragstart', this._waypointOnDragstart, this);
    this._parent.off('waypoint:drag'     , this._waypointOnDrag, this);
    this._parent.off('waypoint:dragend'  , this._waypointOnDragend, this);
  }

  /**
   * Fired when the mouse first enters a segment
   *
   * @access private
   *
   * @param <L.Event> e - mouse over event
   *
   * @return void
  */
  ,_segmentOnMouseover: function(e) {
    this._mouseMarker.setOpacity(1.0);
    this._map.on('mousemove', this._segmentOnMousemove, this);
  }

  /**
   * Fired when the mouse leaves a segement
   *
   * @access private
   *
   * @param <L.Event> e - mouse move event
   *
   * @return void
  */
  ,_segmentOnMouseout: function(e) {
    if (this._dragging) { return; }

    this._mouseMarker.setOpacity(0.0);
    this._map.off('mousemove', this._segmentOnMousemove, this);

    this.fire('segment:mouseout');
  }

  /**
   * Fired when the mouse is moved
   *
   * This method is fired continously when mouse is moved in edition mode.
   *
   * @access private
   *
   * @param <L.Event> e - mouse move event
   *
   * @return void
  */
  ,_segmentOnMousemove: function(e) {
    if (this._dragging) { return; }

    var latlng = L.LineUtil.snapToLayers(e.latlng, null, {
      layers: [this._parent._segments]
      ,sensitivity: 40
      ,vertexonly: false
    });

    if (latlng._feature === null) {
      this._segmentOnMouseout(e);
    } else {
      this._mouseMarker._snapping = latlng._feature._routing;
      this._mouseMarker.setLatLng(latlng);
    }
  }

  /**
   * Mouse marker dragstart
   *
   * @access private
   *
   * @param <L.Event> e - mouse dragstart event
   *
   * @return void
  */
  ,_segmentOnDragstart: function(e) {
    var latlng = e.target.getLatLng();
    var next = e.target._snapping.nextMarker;
    var prev = e.target._snapping.prevMarker;

    this._setTrailers(latlng, next, prev, true);

    this._dragging = true;
    this.fire('segment:dragstart');
  }

  /**
   * Fired when a marker is dragged
   *
   * This method is fired continously when dragging a marker and snapps the
   * marker to the snapping layer.
   *
   * @access private
   *
   * @param <L.Event> e - mouse drag event
   *
   * @return void
  */
  ,_segmentOnDrag: function(e) {
    var latlng = e.target.getLatLng();
    var next = e.target._snapping.nextMarker;
    var prev = e.target._snapping.prevMarker;

    if (this.options.snapping) {
      latlng = L.LineUtil.snapToLayers(latlng, null, this.options.snapping);
    }

    e.target.setLatLng(latlng);
    this._setTrailers(latlng, next, prev);
  }

  /**
   * Mouse marker dragend
   *
   * @access private
   *
   * @param <L.Event> e - mouse dragend event
   *
   * @return void
  */
  ,_segmentOnDragend: function(e) {
    var next = this._mouseMarker._snapping.nextMarker;
    var prev = this._mouseMarker._snapping.prevMarker;
    var latlng = this._mouseMarker.getLatLng();

    this._parent.addWaypoint(latlng, prev, next, function(err, data) {
      //console.log(err, data);
    });

    this._dragging = false;
    this._setTrailers(null, null, null, false);
    this.fire('segment:dragend');
  }

  /**
   * Fired when marker drag start
   *
   * @access private
   *
   * @param <L.Event> e - mouse dragend event
   *
   * @return void
  */
  ,_waypointOnDragstart: function(e) {
    var next = e.marker._routing.nextMarker;
    var prev = e.marker._routing.prevMarker;

    this._setTrailers(e.marker.getLatLng(), next, prev, true);
  }

  /**
   * Fired while dragging marker
   *
   * @access private
   *
   * @access private
   *
   * @param <L.Event> e - mouse drag event
   *
   * @return void
  */
  ,_waypointOnDrag: function(e) {
    var latlng = e.marker._latlng;
    var next = e.marker._routing.nextMarker;
    var prev = e.marker._routing.prevMarker;

    if (this.options.snapping) {
      latlng = L.LineUtil.snapToLayers(latlng, null, this.options.snapping);
    }

    e.marker.setLatLng(latlng);
    this._setTrailers(latlng, next, prev);
  }

  /**
   * Fired when marker drag ends
   *
   * @access private
   *
   * @param <L.Event> e - mouse dragend event
   *
   * @return void
  */
  ,_waypointOnDragend: function(e) {
    this._setTrailers(null, null, null, false);
    this._parent.routeWaypoint(e.marker, function(err, data) {
      //console.log('_waypointOnDragend.cb', err, data);
    });
  }

  /**
   * Fired when marker is clicked
   *
   * This method is fired when a marker is clicked by the user. It will then
   * procede to remove the marker and reroute any connected line segments.
   *
   * @access private
   *
   * @param <L.Event> e - mouse click event
   *
   * @return void
  */
  ,_waypointOnClick: function(e) {
    this._parent.removeWaypoint(e.layer, function(err, data) {
      //console.log('_waypointOnDragend.cb', err, data);
    });
  }

  /**
   * Set trailing guide lines
   *
  */
  ,_setTrailers: function(latlng, next, prev, show) {
    if (typeof show !== 'undefined') {
      if (show === false) {
        this._trailer1.setStyle({opacity: 0.0});
        this._trailer2.setStyle({opacity: 0.0});
        return;
      } else {
        if (next !== null) {
          this._trailer1.setStyle({opacity: this._trailerOpacity});
        }
        if (prev !== null) {
          this._trailer2.setStyle({opacity: this._trailerOpacity});
        }
      }
    }
    if (next) {
      this._trailer1.setLatLngs([latlng, next.getLatLng()]);
    }
    if (prev) {
      this._trailer2.setLatLngs([latlng, prev.getLatLng()]);
    }
  }
});

