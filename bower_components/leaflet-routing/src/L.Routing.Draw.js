/*
 * L.Routing.Draw class
 *
 * Responsible for drawing and contine drawing
 *
 * @dependencies L, L.Routing
 *
 * @usage new L.Routing.Draw(map, options);
*/

L.Routing.Draw = L.Handler.extend({

  // INCLUDES
  includes: [L.Mixin.Events]

  // OPTIONS
  ,options: {}

  /**
   * Draw Constructor
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
   * @event map.routing:draw-start
   * @event map.routing:draw-new
   * @event map.routing:draw-continue
   *
   * @return void
  */
  ,enable: function() {
    if (this._enabled) { return; }

    this._enabled  = true;
    this._hidden   = false;
    this._dragging = false;
    this._addHooks();
    this.fire('enabled');

    this._map.fire('routing:draw-start');
    if (this._parent._segments._layers.length === 0) {
      this._map.fire('routing:draw-new');
    } else {
      this._map.fire('routing:draw-continue');
    }
  }

  /**
   * Disable drawing
   *
   * @access public
   *
   * @event map.routing:draw-end
   *
   * @return void
  */
  ,disable: function() {
    if (!this._enabled) { return; }

    this._enabled = false;
    this._removeHooks();
    this.fire('disabled');

    this._map.fire('routing:draw-end');
  }

  /**
   * Add hooks
   *
   * @access private
   *
   * @return void
  */
  ,_addHooks: function() {
    if (!this._map) { return; }

    // Visible Marker
    if (!this._marker) {
      this._marker = new L.Marker(this._map.getCenter(), {
        icon: (this.options.icons.draw ? this.options.icons.draw : new L.Icon.Default())
        ,opacity: (this.options.icons.draw ? 1.0 : 0.0)
        ,zIndexOffset: this.options.zIndexOffset
        ,clickable: false
      });
    }

    // Trailing line
    if (!this._trailer) {
      var ll = this._map.getCenter();
      this._trailerOpacity = this.options.styles.trailer.opacity || 0.2;
      var style = L.extend({}, this.options.styles.trailer, {
        opacity: 0.0
        ,clickable: false
      });
      this._trailer = new L.Polyline([ll, ll], style);
    }

    this._parent.on('waypoint:mouseover', this._catchWaypointEvent, this);
    this._parent.on('waypoint:mouseout' , this._catchWaypointEvent, this);
    this._parent.on('waypoint:dragstart', this._catchWaypointEvent, this);
    this._parent.on('waypoint:dragend'  , this._catchWaypointEvent, this);

    this._parent.on('segment:mouseover' , this._catchWaypointEvent, this);
    this._parent.on('segment:mouseout'  , this._catchWaypointEvent, this);
    this._parent.on('segment:dragstart' , this._catchWaypointEvent, this);
    this._parent.on('segment:dragend'   , this._catchWaypointEvent, this);

    this._map.on('mousemove', this._onMouseMove, this);
    this._map.on('click', this._onMouseClick, this);

    this._marker.addTo(this._map);
    this._trailer.addTo(this._map);
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

    this._parent.off('waypoint:mouseover', this._catchWaypointEvent, this);
    this._parent.off('waypoint:mouseout' , this._catchWaypointEvent, this);
    this._parent.off('waypoint:dragstart', this._catchWaypointEvent, this);
    this._parent.off('waypoint:dragend'  , this._catchWaypointEvent, this);

    this._parent.off('segment:mouseover' , this._catchWaypointEvent, this);
    this._parent.off('segment:mouseout'  , this._catchWaypointEvent, this);
    this._parent.off('segment:dragstart' , this._catchWaypointEvent, this);
    this._parent.off('segment:dragend'   , this._catchWaypointEvent, this);

    this._map.off('click', this._onMouseClick, this);
    this._map.off('mousemove', this._onMouseMove, this);

    this._map.removeLayer(this._marker);
    this._map.removeLayer(this._trailer);

    delete this._marker;
    delete this._trailer;
  }

  /**
   * Handle waypoint events
   *
   * @access private
   *
   * @param <L.Event> e - waypoint event
   *
   * @return void
  */
  ,_catchWaypointEvent: function(e) {
    var type = e.type.split(':')[1];

    if (this._hidden) {
      if (this._dragging) {
        if (type === 'dragend') {
          this._dragging = false;
        }
      } else {
        if (type === 'mouseout') {
          this._show();
        } else if (type === 'dragstart') {
          this._dragging = true;
        }
      }
    } else {
      if (type === 'mouseover') {
        this._hide();
      }
    }
  }

  /**
   * Hide HUD
   *
   * Call this method in order to quickly hide graphical drawing elements for
   * instance hoovering over draggable objects which should tempoarily disable
   * dragging.
   *
   * @access private
   *
   * @return void
  */
  ,_hide: function() {
    this._hidden = true;
    this._marker.setOpacity(0.0);
    this._trailer.setStyle({opacity: 0.0});
  }

  /**
   * Show HUD
   *
   * Call this method to restore graphical drawing elements after they have been
   * hidden.
   *
   * @access private
   *
   * @return void
  */
  ,_show: function() {
    this._hidden = false;
    this._marker.setOpacity(this.options.icons.draw ? 1.0 : 0.0);
    this._showTrailer();
  }

  /**
   * Show trailer when hidden
   *
   * @access private
   *
   * @return void
  */
  ,_showTrailer: function() {
    if (this._trailer.options.opacity === 0.0) {
      this._trailer.setStyle({opacity: this._trailerOpacity});
    }
  }

  /**
   * Set trailing guide line
   *
  */
  ,_setTrailer: function(fromLatLng, toLatLng) {
      this._trailer.setLatLngs([fromLatLng, toLatLng]);
      this._showTrailer();
  }

  /**
   * Mouse move handler
   *
   * @access private
   *
   * @param <L.Event> e - mouse move event
   *
   * @return void
  */
  ,_onMouseMove : function(e) {
    if (this._hidden) { return; }

    var latlng = e.latlng;
    var last = this._parent.getLast();

    if (this.options.snapping) {
      latlng = L.LineUtil.snapToLayers(latlng, null, this.options.snapping);
    }

    this._marker.setLatLng(latlng);


    if (last !== null) {
      this._setTrailer(last.getLatLng(), latlng);
    };
  }

  /**
   * Mouse click handler
   *
   * @access private
   *
   * @param <L.Event> e - mouse click event
   *
   * @event map.routing:new-waypoint
   *
   * @return void
  */
  ,_onMouseClick: function(e) {
    if (this._hidden) { return; }

    var marker, latlng, last;

    latlng = e.latlng;
    if (this.options.snapping) {
      latlng = L.LineUtil.snapToLayers(latlng, null, this.options.snapping);
    }
    marker = new L.Marker(latlng, {title: this.options.tooltips.waypoint });
    last = this._parent.getLast();

    this._setTrailer(latlng, latlng);
    this._parent.addWaypoint(marker, last, null, function(err, data) {
      // console.log(err, data);
    });
  }
});
