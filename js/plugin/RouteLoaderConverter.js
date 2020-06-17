BR.routeLoader = function(map, layersControl, routing, pois) {
    RouteLoader = L.Control.extend({
        _layerName: 'Tracklayer',
        _trackLayer: undefined,
        _bounds: undefined,
        _testLayer: L.layerGroup().addTo(map),
        _trackPoints: [],
        _closeCanceled: true,
        _currentGeoJSON: {},
        _options: {
            format: undefined,
            showTrackLayer: true,
            showPointAsPoi: true,
            simplifyTolerance: -1,
            isTestMode: false,
            simplifyLastKnownGood: 0.001
        },

        setDialogDraggable: function(jqDlgHeader) {
            jqDlgHeader.on('mousedown', function(mousedownEvt) {
                var $draggable = $(this);
                var x = mousedownEvt.pageX - $draggable.offset().left,
                    y = mousedownEvt.pageY - $draggable.offset().top;
                $('body').on('mousemove.draggable', function(mousemoveEvt) {
                    $draggable.closest('.modal-dialog').offset({
                        left: mousemoveEvt.pageX - x,
                        top: mousemoveEvt.pageY - y
                    });
                });
                $('body').one('mouseup', function() {
                    $('body').off('mousemove.draggable');
                });
                $draggable.closest('.modal').one('bs.modal.hide', function() {
                    $('body').off('mousemove.draggable');
                });
            });
        },

        getSimplifiedLatLngs: function() {
            var simplifiedLine = turf.simplify(this._trackPoints.geometry, {
                tolerance: this._options.simplifyTolerance,
                highQuality: true
            });

            return L.GeoJSON.coordsToLatLngs(simplifiedLine.coordinates);
        },

        refreshTestLayer: function() {
            this.onBusyChanged(true);
            this._testLayer.clearLayers();

            var simplifiedLatLngs = this.getSimplifiedLatLngs();
            if (simplifiedLatLngs.length > 5000) {
                this.onBusyChanged(false);
                return false;
            }

            for (var i = 0; i < simplifiedLatLngs.length; i++) {
                this._testLayer.addLayer(
                    L.circleMarker(simplifiedLatLngs[i], {
                        radius: 6,
                        fill: false,
                        color: '#FF0000'
                    })
                );
            }

            this.onBusyChanged(false);
            return true;
        },

        cleanup: function(e) {
            this._testLayer.clearLayers();
            if (
                this._trackLayer &&
                map.hasLayer(this._trackLayer) &&
                (!this._options.showTrackLayer || this._closeCanceled)
            ) {
                map.removeLayer(this._trackLayer);
                layersControl.removeLayer(this._trackLayer);
                this._trackLayer = undefined;
            }
            (this._bounds = undefined), (this._trackPoints = []);
            this._currentGeoJSON = {};
            this._options = {
                ext: 'gpx',
                showTrackLayer: true,
                showPointAsPoi: true,
                simplifyTolerance: -1,
                isTestMode: false,
                simplifyLastKnownGood: 0.001
            };
        },

        setSliderRange: function() {
            $slider = $('#simplify_tolerance');
            var guessedTolerance = this.guessSimplifyTolerance(this._trackPoints);
            $slider.data('guess', guessedTolerance.toFixed(20));
            $slider.val(0);
            this._options.simplifyTolerance = guessedTolerance;
            this.refreshTestLayer();
        },

        onToleranceSlider: function(e) {
            var guess = parseFloat($(e.target).data('guess'));
            var f = parseFloat(e.target.value);
            var frac = parseFloat($(e.target).prop('max'));

            if (f > guess)
                this._options.simplifyTolerance = guess + Math.pow(f, 2) * (guess / (Math.pow(frac, 2) / 10));
            else this._options.simplifyTolerance = Math.abs(guess + Math.pow(f, 3) * (guess / Math.pow(frac, 3)));

            if (!this.refreshTestLayer()) {
                e.target.value = $(e.target).data('lastknowngood');
                this._options.simplifyTolerance = this._options.simplifyLastKnownGood;
                this.refreshTestLayer();
            } else {
                this._options.simplifyLastKnownGood = this._options.simplifyTolerance;
                $(e.target).data('lastknowngood', e.target.value);
            }
        },

        onBusyChanged: function(isBusy) {
            if (typeof isBusy === undefined) {
                isBusy = false;
            }
            if (isBusy === true) $('#loadedittrackdlg #msg_busy').removeClass('invisible');
            else $('#loadedittrackdlg #msg_busy').addClass('invisible');
        },

        onManualCollapse: function(e) {
            //workaround for starting with closed collapse
            if ($('#loadedittrackdlg').is(':hidden')) return;
            this._options.isTestMode = $(e.target).hasClass('show');

            if (this._options.isTestMode) {
                this.once('file:loaded', this.setSliderRange, this);
                this.convertTrackLocal();
            } else this.cleanup();
        },

        onAdd: function(map) {
            $('#loadedittrackdlg').on(
                'hidden.bs.modal',
                function(e) {
                    this.cleanup();
                }.bind(this)
            );
            $('#loadedittrackdlg').on(
                'show.bs.modal',
                function(e) {
                    $('#manual_collapse').collapse('hide');
                    this._closeCanceled = true;
                }.bind(this)
            );

            L.DomUtil.get('submitLoadEditTrack').onclick = L.bind(function() {
                this._closeCanceled = false;
                this.onBusyChanged(true);
                if (this._testLayer.getLayers().length > 0) {
                    this._testLayer.clearLayers();
                    setTimeout(
                        function() {
                            this.addRoutingPoints();
                            this.onBusyChanged(false);
                            $('#loadedittrackdlg').modal('hide');
                        }.bind(this),
                        0
                    );
                } else
                    setTimeout(
                        function() {
                            this.convertTrackLocal();
                            $('#loadedittrackdlg').modal('hide');
                        }.bind(this),
                        0
                    );
            }, this);

            L.DomUtil.get('simplify_tolerance').onchange = L.bind(this.onToleranceSlider, this);

            L.DomUtil.get('loadedittrackFile').onchange = L.bind(this.onFileChanged, this);
            this.onFileChanged({ target: L.DomUtil.get('loadedittrackFile') });

            this.setDialogDraggable($('#loadedittrackdlg .modal-header'));

            $('#manual_collapse').collapse('hide');
            $('#manual_collapse').on(
                'hidden.bs.collapse shown.bs.collapse',
                function(e) {
                    this.onManualCollapse(e);
                }.bind(this)
            );

            // dummy, no own representation, delegating to EasyButton
            var dummy = L.DomUtil.create('div');
            dummy.hidden = true;
            return dummy;
        },

        onRemove: function(map) {
            // Nothing to do here
        },

        onFileChanged: function(e) {
            if (!e.target.files[0]) return;
            $(e.target)
                .next('label')
                .text(e.target.files[0].name);
            var testmode = this._options.isTestMode;
            this.cleanup();
            this._options.isTestMode = testmode;
            if (this._options.isTestMode) {
                this.once('file:loaded', this.setSliderRange, this);
                this.convertTrackLocal();
            }
        },

        setLayerNameFromGeojson: function(geoJSON) {
            if (geoJSON.type == 'Feature' && geoJSON.properties && geoJSON.properties.name) {
                this._layerName = geoJSON.properties.name;
                return;
            }

            if (geoJSON.type == 'FeatureCollection') {
                for (var i = 0; i < geoJSON.features.length; i++) {
                    if (geoJSON.features[i].properties && geoJSON.features[i].properties.name) {
                        this._layerName = geoJSON.features[i].properties.name;
                        return;
                    }
                }
            }
        },

        getOptions: function() {
            this._options.showTrackLayer = $('#cb_showtracklayer')[0].checked;
            this._options.showPointAsPoi = $('#cb_showpois')[0].checked;

            this._options.simplifyTolerance = -1;
            this._bounds = undefined;
        },

        convertTrackLocal: function() {
            this.onBusyChanged(true);

            this.getOptions();

            var trackFile = $('#loadedittrackFile')[0].files[0];
            this._layerName = trackFile.name.replace(/\.[^\.]*$/, '');

            if (!this._options.format) this._options.format = trackFile.name.split('.').pop();

            const reader = new FileReader();

            reader.onload = L.bind(this.processFile, this);
            reader.readAsText(trackFile);
        },

        addTrackOverlay: function(geoJSON) {
            this._trackLayer = L.geoJSON(geoJSON, {
                filter: function(geoJsonFeature) {
                    return !(geoJsonFeature.type == 'Feature' && geoJsonFeature.geometry.type == 'Point');
                }
            }).addTo(map);

            layersControl.addOverlay(this._trackLayer, this._layerName);

            this._bounds = this._trackLayer.getBounds();

            if (this._bounds) map.fitBounds(this._bounds);
        },

        getLineStringsFromGeoJSON: function(geoJSON) {
            var allLinePoints = [];
            var flat = turf.flatten(geoJSON);
            turf.featureEach(flat, function(feature, idx) {
                if (turf.getType(feature) == 'LineString') {
                    feature = turf.cleanCoords(feature);
                    var lPoints = turf.coordAll(feature);
                    allLinePoints = allLinePoints.concat(lPoints);
                }
            });

            var linesGeoJSON = turf.lineString(allLinePoints);
            linesGeoJSON.length = allLinePoints.length;
            return linesGeoJSON;
        },

        guessSimplifyTolerance: function(trackPoints) {
            var tolerance = trackPoints.length / 1000000;
            if (tolerance > 0.8) tolerance = 0.8;
            return tolerance;
        },

        addRoutingPoints: function(geoJSON) {
            if (this._options.simplifyTolerance < 0)
                this._options.simplifyTolerance = this.guessSimplifyTolerance(this._trackPoints);

            var routingPoints = [];
            var simplifiedLatLngs = this.getSimplifiedLatLngs();

            for (var i = 0; i < simplifiedLatLngs.length; i++) {
                routingPoints.push(simplifiedLatLngs[i]);
            }

            if (routingPoints.length > 0) {
                routing.setWaypoints(routingPoints, function(event) {
                    if (!event) return;
                    var err = event.error;
                    BR.message.showError(
                        i18next.t('warning.tracks-load-error', {
                            error: err && err.message ? err.message : err
                        })
                    );
                });

                if (!this._bounds) this._bounds = L.latLngBounds(routingPoints);
            }

            if (!this._bounds) map.fitBounds(this._bounds);

            if (this._options.showPointAsPoi) {
                turf.featureEach(this._currentGeoJSON, function(feature, idx) {
                    if (turf.getType(feature) == 'Point') {
                        var coord = turf.getCoord(feature);
                        var latlng = L.GeoJSON.coordsToLatLng(coord);
                        var name = '';
                        if (feature.properties && feature.properties.name) name = feature.properties.name;
                        pois.addMarker(latlng, name);
                    }
                });
            }
        },

        processFile: function(e) {
            var res = e.target.result;
            var geoJSON = null;
            switch (this._options.format) {
                case 'kml':
                case 'gpx':
                    var xml = new DOMParser().parseFromString(res, 'text/xml');
                    geoJSON = toGeoJSON[this._options.format](xml);
                    break;

                default:
                    geoJSON = JSON.parse(res);
                    break;
            }

            this._currentGeoJSON = geoJSON;
            this.setLayerNameFromGeojson(geoJSON);

            this._trackPoints = this.getLineStringsFromGeoJSON(geoJSON);
            this.fire('file:loaded');

            if (this._options.showTrackLayer || this._options.isTestMode) this.addTrackOverlay(geoJSON);

            if (!this._options.isTestMode) this.addRoutingPoints();

            this.onBusyChanged(false);
        }
    });

    RouteLoader.include(L.Evented.prototype);

    var routeLoaderControl = new RouteLoader();
    routeLoaderControl.addTo(map);

    return routeLoaderControl;
};
