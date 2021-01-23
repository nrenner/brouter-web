BR.FindHotels = L.Control.extend({
    options: {
        shortcut: {
            draw: {
                enable: 72, // char code for 'h'
                disable: 27, // char code for 'ESC'
            },
        },
    },

    statics: {
        MSG_GET_HOTELS: 'Click to get hotels',
        MSG_REMOVE_HOTELS: 'Click to remove hotels',
        MSG_EDIT:
            '&square; = move / resize, <span class="fa fa-trash-o"></span> = delete,<br>click nogo to quit editing',
        STATE_DISABLED: 'Disabled',
        STATE_ENABLED: 'Enabled',
    },

    style: {
        color: '#f06eaa',
        weight: 4,
        opacity: 0.5,
        fillColor: null, //same as color by default
        fillOpacity: 0.2,
        dashArray: null,
    },

    editStyle: {
        color: '#fe57a1',
        opacity: 0.6,
        dashArray: '10, 10',
        fillOpacity: 0.1,
    },

    initialize: function (latLngArgs) {
        this._wasRouteDrawing = false;
        this._latLng = latLngArgs;
    },

    onAdd: function (map) {
        var self = this,
            boundaryBox,
            circle = new BR.Circle(this._latLng);
        circle.on('click', circleClick);
        circle.addTo(map);

        // circle.getBoundaryBox();
        this.editTools = map.editTools;

        function circleClick(e) {
            this.editTools = map.editTools = circle.toggleEdit();
            //this.editTools = map.editTools;
        }

        /*  var editTools = (this.editTools = new BR.Heditable(map, {
            // FeatureGroup instead of LayerGroup to propagate events to members
            editLayer: new L.FeatureGroup().addTo(map),

            featuresLayer: this.hotelDrawnItems,
        })); */

        this.startDrawing = function (control) {
            //todo
            //1. check if the cirle is still in edit mode, if it is stop it.
            // get boundary box of circle added to map
            boundaryBox = circle.getBoundaryBox();

            // get query
            query = BR.Query(boundaryBox);

            // instantiate the overpass query object
            var overpass = new BR.Overpass(map);

            // run query
            overpass.run_query(query, 'OverpassQL', undefined, undefined, '', undefined);

            //enable state
            control.state('Enabled');
        };

        this.stopDrawing = function (control) {
            // check if the circle is added.
            // remove circle and stop editiing
            //this.editTools.commitDrawing();

            if (circle && map.hasLayer(circle)) {
                circle.off('click', circleClick);
                // remove layer from map
                map.removeLayer(circle);
            }

            // remove geojson

            if (BR.hotelGeojson) {
                map.removeLayer(BR.hotelGeojson);
            }
            // change state of button
            control.state('Disabled');
            // remove control from map

            //change map state
            map.setHotelSearchIsActive(false);

            control.remove();
        };

        this.button = L.easyButton({
            states: [
                {
                    stateName: BR.FindHotels.STATE_DISABLED,
                    icon: 'fa-bed active',
                    title: BR.FindHotels.MSG_GET_HOTELS,
                    onClick: this.startDrawing,
                },
                {
                    stateName: BR.FindHotels.STATE_ENABLED,
                    icon: 'fa-undo active',
                    title: BR.FindHotels.MSG_REMOVE_HOTELS,
                    onClick: this.stopDrawing,
                },
            ],
        });

        // prevent instant re-activate when turning off button by both Pointer and Click
        // events firing in Chrome mobile while L.Map.Tap enabled for circle drawing
        L.DomEvent.addListener(this.button.button, 'pointerdown', L.DomEvent.stop);

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        this.editTools.on(
            'editable:drawing:end',
            function (e) {
                console.log('drawing end');
                self.button.state(BR.FindHotels.STATE_CREATE);

                setTimeout(
                    L.bind(function () {
                        // turn editing off after create; async to still fire 'editable:vertex:dragend'
                        e.layer.disableEdit();
                    }, this),
                    0
                );
            },
            this
        );

        this.editTools.on(
            'editable:vertex:dragend editable:deleted',
            function (e) {
                this._fireUpdate();
            },
            this
        );

        this.editTools.on(
            'editable:enable',
            function (e) {
                e.layer.setStyle(this.editStyle);
                console.log('enabled');
            },
            this
        );
        this.editTools.on(
            'editable:disable',
            function (e) {
                e.layer.setStyle(this.style);
            },
            this
        );

        // dummy, no own representation, delegating to EasyButton
        return L.DomUtil.create('div');
    },

    _keydownListener: function (e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable && this.button.state() === BR.FindHotels.STATE_CANCEL) {
            this.stopDrawing(this.button);
        } else if (
            e.keyCode === this.options.shortcut.draw.enable &&
            this.button.state() === BR.FindHotels.STATE_CREATE
        ) {
            this.startDrawing(this.button);
        }
    },

    displayUploadError: function (message) {
        $('#nogoError').text(message ? message : '');
        $('#nogoError').css('display', message ? 'block' : 'none');
    },

    // prevent route waypoint added after circle create (map click after up)
    preventRoutePointOnCreate: function (routing) {
        this.editTools.on(
            'editable:drawing:start',
            function (e) {
                this._wasRouteDrawing = routing.isDrawing();
                routing.draw(false);
            },
            this
        );

        // after create
        this.editTools.on(
            'editable:drawing:end',
            function (e) {
                if (this._wasRouteDrawing) {
                    setTimeout(function () {
                        routing.draw(true);
                    }, 0);
                }
            },
            this
        );
    },

    _clear: function () {
        this.hotelDrawnItems.clearLayers();
    },

    clear: function () {
        this._clear();
        this._fireUpdate();
    },

    _fireUpdate: function () {
        console.log('fire update');

        //this.fire('update', { options: this.getOptions() });
    },

    getFeatureGroup: function () {
        return this.hotelDrawnItems;
    },

    getEditGroup: function () {
        return this.editTools.editLayer;
    },

    getButton: function () {
        return this.button;
    },
});

BR.FindHotels.include(L.Evented.prototype);

BR.Heditable = L.Editable.extend({
    // Editable relies on L.Map.Tap for touch support. But the Tap handler is not added when
    // the Browser supports Pointer events, which is the case for mobile Chrome. So we add it
    // ourselves in this case, but disabled and only enable while drawing (#259).
    // Also, we generally disable the Tap handler in the map options for route dragging,
    // see Map.js, so we always need to enable for drawing.

    initialize: function (map, options) {
        L.Editable.prototype.initialize.call(this, map, options);

        if (!this.map.tap) {
            this.map.addHandler('tap', L.Map.Tap);
            this.map.tap.disable();
        }
    },

    registerForDrawing: function (editor) {
        this._tapEnabled = this.map.tap.enabled();
        if (!this._tapEnabled) {
            this.map.tap.enable();
        }

        L.Editable.prototype.registerForDrawing.call(this, editor);
    },

    unregisterForDrawing: function (editor) {
        if (!this._tapEnabled) {
            this.map.tap.disable();
        }

        L.Editable.prototype.unregisterForDrawing.call(this, editor);
    },

    createVertexIcon: function (options) {
        return BR.Browser.touch ? new L.Editable.TouchVertexIcon(options) : new L.Editable.VertexIcon(options);
    },
});

// Extend circle to add a convinient bbox method.

BR.Circle = L.Circle.extend({
    options: { radius: 1000 },
    initialize: function (latlng, options) {
        var self = this,
            opts = L.extend({}, options, self.options);
        L.Circle.prototype.initialize.call(this, latlng, opts);
    },

    getBoundaryBox() {
        var _nE,
            _sW,
            bounds = this.getBounds();
        _nE = bounds.getNorthEast();
        _sW = bounds.getSouthWest();

        var bbox = `(${_sW.lat}, ${_sW.lng}, ${_nE.lat}, ${_nE.lng})`;
        console.log(bbox);
        return bbox;
    },
});
