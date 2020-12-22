BR.Heightgraph = function (map, layersControl, routing, pois) {
    Heightgraph = L.Control.Heightgraph.extend({
        options: {
            width: $('#map').outerWidth(),
            margins: {
                top: 15,
                right: 30,
                bottom: 30,
                left: 70,
            },
            expandControls: false,
            mappings: {
                gradient: {
                    '-5': {
                        text: '- 16%+',
                        color: '#028306',
                    },
                    '-4': {
                        text: '- 10-15%',
                        color: '#2AA12E',
                    },
                    '-3': {
                        text: '- 7-9%',
                        color: '#53BF56',
                    },
                    '-2': {
                        text: '- 4-6%',
                        color: '#7BDD7E',
                    },
                    '-1': {
                        text: '- 1-3%',
                        color: '#A4FBA6',
                    },
                    0: {
                        text: '0%',
                        color: '#ffcc99',
                    },
                    1: {
                        text: '1-3%',
                        color: '#F29898',
                    },
                    2: {
                        text: '4-6%',
                        color: '#E07575',
                    },
                    3: {
                        text: '7-9%',
                        color: '#CF5352',
                    },
                    4: {
                        text: '10-15%',
                        color: '#BE312F',
                    },
                    5: {
                        text: '16%+',
                        color: '#AD0F0C',
                    },
                },
            },
            // extra options
            shortcut: {
                toggle: 69, // char code for 'e'
            },
        },

        addBelow: function (map) {
            // waiting for https://github.com/MrMufflon/Leaflet.Elevation/pull/66
            // this.width($('#map').outerWidth());
            this.options.width = $('#content').outerWidth();

            if (this.getContainer() != null) {
                this.remove(map);
            }

            function setParent(el, newParent) {
                newParent.appendChild(el);
            }
            this.addTo(map);

            // move elevation graph outside of the map
            setParent(this.getContainer(), document.getElementById('elevation-chart'));

            // bind the mouse move and mouse out handlers, I'll reuse them later on
            this._mouseMoveHandlerBound = this.mapMousemoveHandler.bind(this);
            this._mouseoutHandlerBound = this._mouseoutHandler.bind(this);

            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
            this.initCollapse(map);

            var self = this;
            var container = $('#elevation-chart');
            $(window).resize(function () {
                // avoid useless computations if the chart is not visible
                if (container.is(':visible')) {
                    self.resize({
                        width: container.width(),
                        height: container.height(),
                    });
                }
            });
            // Trigger the chart resize after the toggle animation is complete,
            // in case the window was resized while the chart was not visible.
            // The resize must be called after the animation (i.e. 'shown.bs.collapse')
            // and cannot be called before the animation (i.e. 'show.bs.collapse'),
            // for the container has the old width pre animation and new width post animation.
            container.on('shown.bs.collapse', function () {
                self.resize({
                    width: container.width(),
                    height: container.height(),
                });
            });

            // and render the chart
            this.update();
        },

        initCollapse: function (map) {
            var self = this;
            var onHide = function () {
                $('#elevation-btn').removeClass('active');
                // we must fetch tiles that are located behind elevation-chart
                map._onResize();

                if (this.id && BR.Util.localStorageAvailable() && !self.shouldRestoreChart) {
                    localStorage.removeItem(this.id);
                }
            };
            var onShow = function () {
                $('#elevation-btn').addClass('active');

                if (this.id && BR.Util.localStorageAvailable()) {
                    localStorage[this.id] = 'true';
                }
            };
            // on page load, we want to restore collapse state from previous usage
            $('#elevation-chart')
                .on('hidden.bs.collapse', onHide)
                .on('shown.bs.collapse', onShow)
                .each(function () {
                    if (this.id && BR.Util.localStorageAvailable() && localStorage[this.id] === 'true') {
                        self.shouldRestoreChart = true;
                    }
                });
        },

        _keydownListener: function (e) {
            if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.toggle) {
                $('#elevation-btn').click();
            }
        },

        update: function (track, layer) {
            // bring height indicator to front, because of track casing in BR.Routing
            if (this._mouseHeightFocus) {
                var g = this._mouseHeightFocus._groups[0][0].parentNode;
                g.parentNode.appendChild(g);
            }

            if (track && track.getLatLngs().length > 0) {
                var geojsonFeatures = geoDataExchange.buildGeojsonFeatures(track.getLatLngs());
                this.addData(geojsonFeatures);

                // re-add handlers
                if (layer) {
                    layer.on('mousemove', this._mouseMoveHandlerBound);
                    layer.on('mouseout', this._mouseoutHandlerBound);
                }

                if (this.shouldRestoreChart === true) $('#elevation-chart').collapse('show');
                this.shouldRestoreChart = undefined;
            } else {
                this._removeMarkedSegmentsOnMap();
                this._resetDrag();

                // clear chart by passing an empty dataset
                this.addData([]);

                // and remove handlers
                if (layer) {
                    layer.off('mousemove', this._mouseMoveHandlerBound);
                    layer.off('mouseout', this._mouseoutHandlerBound);
                }

                if ($('#elevation-chart').hasClass('show')) {
                    this.shouldRestoreChart = true;
                }
                $('#elevation-chart').collapse('hide');
            }
        },
    });

    var heightgraphControl = new Heightgraph();
    return heightgraphControl;
};
