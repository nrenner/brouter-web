BR.NogoAreas = L.Control.extend({
    options: {
        shortcut: {
            draw: {
                enable: 78, // char code for 'n'
                disable: 27 // char code for 'ESC'
            }
        }
    },

    statics: {
        MSG_BUTTON: 'Draw no-go area (circle)',
        MSG_BUTTON_CANCEL: 'Cancel drawing no-go area',
        MSG_CREATE: 'Click and drag to draw circle',
        MSG_DISABLED: 'Click to edit',
        MSG_ENABLED:
            '&square; = move / resize, <span class="fa fa-trash-o"></span> = delete,<br>click nogo to quit editing',
        STATE_CREATE: 'no-go-create',
        STATE_CANCEL: 'cancel-no-go-create'
    },

    style: {
        color: '#f06eaa',
        weight: 4,
        opacity: 0.5,
        fillColor: null, //same as color by default
        fillOpacity: 0.2,
        dashArray: null
    },

    editStyle: {
        color: '#fe57a1',
        opacity: 0.6,
        dashArray: '10, 10',
        fillOpacity: 0.1
    },

    initialize: function() {
        this._wasRouteDrawing = false;
    },

    onAdd: function(map) {
        var self = this;

        $('#submitNogos').on('click', L.bind(this.uploadNogos, this));

        this.drawnItems = new L.FeatureGroup().addTo(map);
        this.drawnItems.on('click', function(e) {
            L.DomEvent.stop(e);
            e.layer.toggleEdit();
        });

        var editTools = (this.editTools = map.editTools = new BR.Editable(map, {
            circleEditorClass: BR.DeletableCircleEditor,
            // FeatureGroup instead of LayerGroup to propagate events to members
            editLayer: new L.FeatureGroup().addTo(map),
            featuresLayer: this.drawnItems
        }));

        this.startDrawing = function(control) {
            // initial radius of 0 to detect click, see DeletableCircleEditor.onDrawingMouseUp
            var opts = L.extend({ radius: 0 }, self.style);
            editTools.startCircle(null, opts);

            control.state('cancel-no-go-create');
        };

        this.stopDrawing = function(control) {
            editTools.stopDrawing();
            control.state('no-go-create');
        };

        this.button = L.easyButton({
            states: [
                {
                    stateName: BR.NogoAreas.STATE_CREATE,
                    icon: 'fa-ban',
                    title: BR.NogoAreas.MSG_BUTTON,
                    onClick: this.startDrawing
                },
                {
                    stateName: BR.NogoAreas.STATE_CANCEL,
                    icon: 'fa-ban active',
                    title: BR.NogoAreas.MSG_BUTTON_CANCEL,
                    onClick: this.stopDrawing
                }
            ]
        });

        // prevent instant re-activate when turning off button by both Pointer and Click
        // events firing in Chrome mobile while L.Map.Tap enabled for circle drawing
        L.DomEvent.addListener(this.button.button, 'pointerdown', L.DomEvent.stop);

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        this.editTools.on(
            'editable:drawing:end',
            function(e) {
                self.button.state(BR.NogoAreas.STATE_CREATE);

                setTimeout(
                    L.bind(function() {
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
            function(e) {
                this._fireUpdate();
            },
            this
        );

        this.editTools.on(
            'editable:enable',
            function(e) {
                e.layer.setStyle(this.editStyle);
            },
            this
        );
        this.editTools.on(
            'editable:disable',
            function(e) {
                e.layer.setStyle(this.style);
            },
            this
        );

        this.tooltip = new BR.EditingTooltip(map, editTools, this.button);
        this.tooltip.enable();

        // dummy, no own representation, delegating to EasyButton
        return L.DomUtil.create('div');
    },

    _keydownListener: function(e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable && this.button.state() === BR.NogoAreas.STATE_CANCEL) {
            this.stopDrawing(this.button);
        } else if (
            e.keyCode === this.options.shortcut.draw.enable &&
            this.button.state() === BR.NogoAreas.STATE_CREATE
        ) {
            this.startDrawing(this.button);
        }
    },

    displayUploadError: function(message) {
        $('#nogoError').text(message ? message : '');
        $('#nogoError').css('display', message ? 'block' : 'none');
    },

    uploadNogos: function() {
        var self = this;

        var geoJSONPromise;
        var nogoURL = $('#nogoURL').val();
        var nogoFile = $('#nogoFile')[0].files[0];
        if (nogoURL) {
            // TODO: Handle {{bbox}}
            geoJSONPromise = fetch(nogoURL).then(function(response) {
                response.json();
            });
        } else if (nogoFile) {
            geoJSONPromise = new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() {
                    resolve(reader.result);
                };
                reader.onerror = function() {
                    self.displayUploadError('Could not load file: ' + reader.error.message);
                };

                reader.readAsText(nogoFile);
            }).then(function(response) {
                return JSON.parse(response);
            });
        } else {
            // FIXME: use form validator instead
            self.displayUploadError('Missing file or URL.');
            return false;
        }
        var nogoWeight = parseFloat($('#nogoWeight').val());
        if (isNaN(nogoWeight)) {
            // FIXME: use form validator instead
            self.displayUploadError('Missing default nogo weight.');
            return false;
        }
        var nogoRadius = parseFloat($('#nogoRadius').val());
        if (isNaN(nogoRadius) || nogoRadius < 0) {
            // FIXME: use form validator instead
            self.displayUploadError('Invalid default nogo radius.');
            return false;
        }
        var nogoBuffer = parseFloat($('#nogoBuffer').val());
        if (isNaN(nogoBuffer)) {
            // FIXME: use form validator instead
            self.displayUploadError('Invalid nogo buffering radius.');
            return false;
        }

        geoJSONPromise.then(function(response) {
            // Iterate on features in order to discard features without geometry
            var cleanedGeoJSONFeatures = [];
            turf.flattenEach(response, function(feature) {
                if (turf.getGeom(feature)) {
                    var maybeBufferedFeature = feature;
                    // Eventually buffer GeoJSON
                    if (nogoBuffer !== 0) {
                        maybeBufferedFeature = turf.buffer(maybeBufferedFeature, nogoBuffer, { units: 'meters' });
                    }
                    cleanedGeoJSONFeatures.push(maybeBufferedFeature);
                }
            });

            if (cleanedGeoJSONFeatures.length === 0) {
                self.displayUploadError('No valid area found in provided input.');
                return false;
            }

            var geoJSON = L.geoJson(turf.featureCollection(cleanedGeoJSONFeatures), {
                onEachFeature: function(feature, layer) {
                    layer.options.nogoWeight = feature.properties.nogoWeight || nogoWeight;
                }
            });
            var nogosPoints = geoJSON.getLayers().filter(function(e) {
                return e.feature.geometry.type === 'Point';
            });
            nogosPoints = nogosPoints.map(function(item) {
                var radius = item.feature.properties.radius || nogoRadius;
                if (radius > 0) {
                    return L.circle(item.getLatLng(), { radius: radius });
                }
                return null;
            });
            nogosPoints = nogosPoints.filter(function(e) {
                return e;
            });
            self.setOptions({
                nogos: nogosPoints,
                polygons: geoJSON.getLayers().filter(function(e) {
                    return e.feature.geometry.type === 'Polygon';
                }),
                polylines: geoJSON.getLayers().filter(function(e) {
                    return e.feature.geometry.type === 'LineString';
                })
            });
            self._fireUpdate();
            self.displayUploadError(undefined);
            $('#loadNogos').modal('hide');
        });
        return false;
    },

    // prevent route waypoint added after circle create (map click after up)
    preventRoutePointOnCreate: function(routing) {
        this.editTools.on(
            'editable:drawing:start',
            function(e) {
                this._wasRouteDrawing = routing.isDrawing();
                routing.draw(false);
            },
            this
        );

        // after create
        this.editTools.on(
            'editable:drawing:end',
            function(e) {
                if (this._wasRouteDrawing) {
                    setTimeout(function() {
                        routing.draw(true);
                    }, 0);
                }
            },
            this
        );
    },

    getOptions: function() {
        return {
            nogos: this.drawnItems.getLayers().filter(function(e) {
                return e instanceof L.Circle;
            }),
            polygons: this.drawnItems.getLayers().filter(function(e) {
                return e instanceof L.Polygon;
            }),
            polylines: this.drawnItems.getLayers().filter(function(e) {
                return e instanceof L.Polyline && !(e instanceof L.Polygon);
            })
        };
    },

    setOptions: function(options) {
        var nogos = options.nogos;
        var polylines = options.polylines;
        var polygons = options.polygons;
        this._clear();
        if (nogos) {
            for (var i = 0; i < nogos.length; i++) {
                nogos[i].setStyle(this.style);
                this.drawnItems.addLayer(nogos[i]);
            }
        }
        if (polylines) {
            for (var i = 0; i < polylines.length; i++) {
                polylines[i].setStyle(this.style);
                this.drawnItems.addLayer(polylines[i]);
            }
        }
        if (polygons) {
            for (var i = 0; i < polygons.length; i++) {
                polygons[i].setStyle(this.style);
                this.drawnItems.addLayer(polygons[i]);
            }
        }
    },

    _clear: function() {
        this.drawnItems.clearLayers();
    },

    clear: function() {
        this._clear();
        this._fireUpdate();
    },

    _fireUpdate: function() {
        this.fire('update', { options: this.getOptions() });
    },

    getFeatureGroup: function() {
        return this.drawnItems;
    },

    getEditGroup: function() {
        return this.editTools.editLayer;
    },

    getButton: function() {
        return this.button;
    }
});

BR.NogoAreas.include(L.Evented.prototype);

BR.Editable = L.Editable.extend({
    // Editable relies on L.Map.Tap for touch support. But the Tap handler is not added when
    // the Browser supports Pointer events, which is the case for mobile Chrome. So we add it
    // ourselves in this case, but disabled and only enable while drawing (#259).
    // Also, we generally disable the Tap handler in the map options for route dragging,
    // see Map.js, so we always need to enable for drawing.

    initialize: function(map, options) {
        L.Editable.prototype.initialize.call(this, map, options);

        if (!this.map.tap) {
            this.map.addHandler('tap', L.Map.Tap);
            this.map.tap.disable();
        }
    },

    registerForDrawing: function(editor) {
        this._tapEnabled = this.map.tap.enabled();
        if (!this._tapEnabled) {
            this.map.tap.enable();
        }

        L.Editable.prototype.registerForDrawing.call(this, editor);
    },

    unregisterForDrawing: function(editor) {
        if (!this._tapEnabled) {
            this.map.tap.disable();
        }

        L.Editable.prototype.unregisterForDrawing.call(this, editor);
    },

    createVertexIcon: function(options) {
        return BR.Browser.touch ? new L.Editable.TouchVertexIcon(options) : new L.Editable.VertexIcon(options);
    }
});

BR.EditingTooltip = L.Handler.extend({
    options: {
        closeTimeout: 2000
    },

    initialize: function(map, editTools, button) {
        this.map = map;
        this.editTools = editTools;
        this.button = button;
    },

    addHooks: function() {
        // hack: listen to EasyButton click (instead of editable:drawing:start),
        // to get mouse position from event for initial tooltip location
        L.DomEvent.addListener(this.button.button, 'click', this._addCreate, this);

        this.editTools.featuresLayer.on('layeradd', this._bind, this);

        this.editTools.on('editable:drawing:end', this._postCreate, this);
        this.editTools.on('editable:enable', this._enable, this);
        this.editTools.on('editable:disable', this._disable, this);
    },

    removeHooks: function() {
        L.DomEvent.removeListener(this.button.button, 'click', this._addCreate, this);

        this.editTools.featuresLayer.off('layeradd', this._bind, this);

        this.editTools.off('editable:drawing:end', this._postCreate, this);
        this.editTools.off('editable:enable', this._enable, this);
        this.editTools.off('editable:disable', this._disable, this);
    },

    _bind: function(e) {
        // Position tooltip at bottom of circle, less distracting than
        // sticky with cursor or at center.

        var layer = e.layer;
        layer.bindTooltip(BR.NogoAreas.MSG_DISABLED, {
            direction: 'bottom',
            className: 'editing-tooltip'
        });

        // Override to set position to south instead of center (circle latlng);
        // works better with zooming than updating offset to match radius
        layer.openTooltip = function(layer, latlng) {
            if (!latlng && layer instanceof L.Layer) {
                latlng = L.latLng(
                    layer.getBounds().getSouth(),
                    0.5 * (layer.getBounds().getWest() + layer.getBounds().getEast())
                );
            }
            L.Layer.prototype.openTooltip.call(this, layer, latlng);
        };
    },

    _addCreate: function(e) {
        // button cancel
        if (!this.editTools.drawing()) return;

        var initialLatLng = this.map.mouseEventToLatLng(e);
        var tooltip = L.tooltip({
            // no effect with map tooltip
            sticky: true,
            // offset wrong with 'auto' when switching direction
            direction: 'right',
            offset: L.point(5, 28),
            className: 'editing-tooltip-create'
        });

        // self-reference hack for _moveTooltip, as tooltip is not bound to layer
        tooltip._tooltip = tooltip;

        // simulate sticky feature (follow mouse) for map tooltip without layer
        var onOffMove = function(e) {
            var onOff = e.type === 'tooltipclose' ? 'off' : 'on';
            this._map[onOff]('mousemove', this._moveTooltip, this);
        };
        this.map.on('tooltipopen', onOffMove, tooltip);
        this.map.on('tooltipclose', onOffMove, tooltip);

        var onTooltipRemove = function(e) {
            this.map.off('tooltipopen', onOffMove, e.tooltip);
            this.map.off('tooltipclose', onOffMove, e.tooltip);
            this.map.off('tooltipclose', onTooltipRemove, this);
            e.tooltip._tooltip = null;
        };
        this.map.on('tooltipclose', onTooltipRemove, this);

        tooltip.setTooltipContent(BR.NogoAreas.MSG_CREATE);
        this.map.openTooltip(tooltip, initialLatLng);

        var closeTooltip = function() {
            this.map.closeTooltip(tooltip);
        };
        this.editTools.once('editable:editing editable:drawing:cancel', closeTooltip, this);

        if (BR.Browser.touch) {
            // can't move with cursor on touch devices, so show at start pos for a few seconds
            setTimeout(L.bind(closeTooltip, this), this.options.closeTimeout);
        }
    },

    _setCloseTimeout: function(layer) {
        var timeoutId = setTimeout(function() {
            layer.closeTooltip();
        }, this.options.closeTimeout);

        // prevent timer to close tooltip that changed in the meantime
        layer.once('tooltipopen', function(e) {
            clearTimeout(timeoutId);
        });
    },

    _postCreate: function() {
        // editing is disabled by another handler, tooltip won't stay open before
        this.editTools.once(
            'editable:disable',
            function(e) {
                // show for a few seconds, as mouse often not hovering circle after create
                e.layer.openTooltip(e.layer);
                this._setCloseTimeout(e.layer);
            },
            this
        );
    },

    _enable: function(e) {
        e.layer.setTooltipContent(BR.NogoAreas.MSG_ENABLED);

        this.editTools.once(
            'editable:editing',
            function(e) {
                e.layer.closeTooltip();
            },
            this
        );
    },

    _disable: function(e) {
        e.layer.setTooltipContent(BR.NogoAreas.MSG_DISABLED);
        this._setCloseTimeout(e.layer);
    }
});

BR.DeletableCircleEditor = L.Editable.CircleEditor.extend({
    _computeDeleteLatLng: function() {
        // While circle is not added to the map, _radius is not set.
        var delta = (this.feature._radius || this.feature._mRadius) * Math.cos(Math.PI / 4),
            point = this.map.project(this.feature._latlng);
        return this.map.unproject([point.x - delta, point.y - delta]);
    },

    _updateDeleteLatLng: function() {
        this._deleteLatLng.update(this._computeDeleteLatLng());
        this._deleteLatLng.__vertex.update();
    },

    _addDeleteMarker: function() {
        if (!this.enabled()) return;
        this._deleteLatLng = this._computeDeleteLatLng();
        return new BR.DeleteMarker(this._deleteLatLng, this);
    },

    _delete: function() {
        this.disable();
        this.tools.featuresLayer.removeLayer(this.feature);
    },

    delete: function() {
        this._delete();
        this.fireAndForward('editable:deleted');
    },

    initialize: function(map, feature, options) {
        L.Editable.CircleEditor.prototype.initialize.call(this, map, feature, options);
        this._deleteLatLng = this._computeDeleteLatLng();

        // FeatureGroup instead of LayerGroup to propagate events to members
        this.editLayer = new L.FeatureGroup();
    },

    addHooks: function() {
        L.Editable.CircleEditor.prototype.addHooks.call(this);
        if (this.feature) {
            this._addDeleteMarker();
        }
        return this;
    },

    reset: function() {
        L.Editable.CircleEditor.prototype.reset.call(this);
        this._addDeleteMarker();
    },

    onDrawingMouseDown: function(e) {
        this._deleteLatLng.update(e.latlng);
        L.Editable.CircleEditor.prototype.onDrawingMouseDown.call(this, e);
    },

    // override to cancel/remove created circle when added by click instead of drag, because:
    // - without resize, edit handles stacked on top of each other
    // - makes event handling more complicated (editable:vertex:dragend not called)
    onDrawingMouseUp: function(e) {
        if (this.feature.getRadius() > 0) {
            this.commitDrawing(e);
        } else {
            this.cancelDrawing(e);
            this._delete();
        }
        e.originalEvent._simulated = false;
        L.Editable.PathEditor.prototype.onDrawingMouseUp.call(this, e);
    },

    onVertexMarkerDrag: function(e) {
        this._updateDeleteLatLng();
        L.Editable.CircleEditor.prototype.onVertexMarkerDrag.call(this, e);
    }
});

BR.DeleteMarker = L.Marker.extend({
    options: {
        draggable: false,
        icon: L.divIcon({
            iconSize: BR.Browser.touch ? new L.Point(24, 24) : new L.Point(16, 16),
            className: 'leaflet-div-icon fa fa-trash-o nogo-delete-marker'
        })
    },

    initialize: function(latlng, editor, options) {
        // derived from L.Editable.VertexMarker.initialize

        // We don't use this._latlng, because on drag Leaflet replace it while
        // we want to keep reference.
        this.latlng = latlng;
        this.editor = editor;
        L.Marker.prototype.initialize.call(this, latlng, options);

        this.latlng.__vertex = this;
        this.editor.editLayer.addLayer(this);

        // to keep small circles editable, make sure delete button is below drag handle
        // (not using "+ 1" to place at bottom of other vertex markers)
        this.setZIndexOffset(editor.tools._lastZIndex);
    },

    onAdd: function(map) {
        L.Marker.prototype.onAdd.call(this, map);
        this.on('click', this.onClick);
    },

    onRemove: function(map) {
        delete this.latlng.__vertex;
        this.off('click', this.onClick);
        L.Marker.prototype.onRemove.call(this, map);
    },

    onClick: function(e) {
        this.editor.delete();
    }
});
