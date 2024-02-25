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
                    '-16': {
                        text: '< -15%',
                        color: '#81A850',
                    },
                    '-15': {
                        text: '-15%',
                        color: '#89AA55',
                    },
                    '-14': {
                        text: '-14%',
                        color: '#91AD59',
                    },
                    '-13': {
                        text: '-13%',
                        color: '#99AF5E',
                    },
                    '-12': {
                        text: '-12%',
                        color: '#A1B162',
                    },
                    '-11': {
                        text: '-11%',
                        color: '#A8B367',
                    },
                    '-10': {
                        text: '-10%',
                        color: '#B0B66B',
                    },
                    '-9': {
                        text: '-9%',
                        color: '#B8B870',
                    },
                    '-8': {
                        text: '-8%',
                        color: '#C0BA75',
                    },
                    '-7': {
                        text: '-7%',
                        color: '#C8BC79',
                    },
                    '-6': {
                        text: '-6%',
                        color: '#D0BF7E',
                    },
                    '-5': {
                        text: '-5%',
                        color: '#D8C182',
                    },
                    '-4': {
                        text: '-4%',
                        color: '#E0C387',
                    },
                    '-3': {
                        text: '-3%',
                        color: '#E7C58B',
                    },
                    '-2': {
                        text: '-2%',
                        color: '#EFC890',
                    },
                    '-1': {
                        text: '-1%',
                        color: '#F7CA94',
                    },
                    0: {
                        text: '0%',
                        color: '#FFCC99',
                    },
                    1: {
                        text: '1%',
                        color: '#FCC695',
                    },
                    2: {
                        text: '2%',
                        color: '#FAC090',
                    },
                    3: {
                        text: '3%',
                        color: '#F7BA8C',
                    },
                    4: {
                        text: '4%',
                        color: '#F5B588',
                    },
                    5: {
                        text: '5%',
                        color: '#F2AF83',
                    },
                    6: {
                        text: '6%',
                        color: '#F0A97F',
                    },
                    7: {
                        text: '7%',
                        color: '#EDA37A',
                    },
                    8: {
                        text: '8%',
                        color: '#EB9D76',
                    },
                    9: {
                        text: '9%',
                        color: '#E89772',
                    },
                    10: {
                        text: '10%',
                        color: '#E5916D',
                    },
                    11: {
                        text: '11%',
                        color: '#E38B69',
                    },
                    12: {
                        text: '12%',
                        color: '#E08665',
                    },
                    13: {
                        text: '13%',
                        color: '#DE8060',
                    },
                    14: {
                        text: '14%',
                        color: '#DB7A5C',
                    },
                    15: {
                        text: '15%',
                        color: '#D97457',
                    },
                    16: {
                        text: '> 15%',
                        color: '#D66E53',
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
                // there is no elevation data available above 60°N, except within 10°E-30°E (issue #365)
                if (
                    track.getLatLngs().filter(function (point) {
                        return point.alt !== undefined;
                    }).length == 0
                ) {
                    $('#no-elevation-data').show();
                } else {
                    $('#no-elevation-data').hide();
                }

                var geojsonFeatures = geoDataExchange.buildGeojsonFeatures(track.getLatLngs(), {
                    interpolate: false,
                    normalize: false,
                });
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

        _createLegend: function () {
            if (this._categories.length > 0) {
                // find the min and the max gradients for the current profile
                var minGradient = 16;
                var maxGradient = -16;
                // this legend object has the profile gradients as keys; it was built by heightgraph
                var allLegend = this._categories[this.options.selectedAttributeIdx].legend;
                for (key in allLegend) {
                    var gradient = parseInt(key);
                    if (minGradient > gradient) {
                        minGradient = gradient;
                    }
                    if (maxGradient < gradient) {
                        maxGradient = gradient;
                    }
                }

                // define the simplified legend with all known gradients
                var simplifiedLegend = [
                    {
                        type: -16,
                        text: this.options.mappings.gradient['-16'].text,
                        color: this.options.mappings.gradient['-16'].color,
                    },
                    {
                        type: -10,
                        text: this.options.mappings.gradient['-10'].text,
                        color: this.options.mappings.gradient['-10'].color,
                    },
                    {
                        type: -5,
                        text: this.options.mappings.gradient['-5'].text,
                        color: this.options.mappings.gradient['-5'].color,
                    },
                    {
                        type: 0,
                        text: this.options.mappings.gradient['0'].text,
                        color: this.options.mappings.gradient['0'].color,
                    },
                    {
                        type: 5,
                        text: this.options.mappings.gradient['5'].text,
                        color: this.options.mappings.gradient['5'].color,
                    },
                    {
                        type: 10,
                        text: this.options.mappings.gradient['10'].text,
                        color: this.options.mappings.gradient['10'].color,
                    },
                    {
                        type: 16,
                        text: this.options.mappings.gradient['16'].text,
                        color: this.options.mappings.gradient['16'].color,
                    },
                ];
                // then, keep only the range relevant to the current profile
                // (e.g. if min gradient of profile is -6, remove -16 and -15 from range)
                for (var i = 0; i < simplifiedLegend.length; i++) {
                    if (simplifiedLegend[i].type > minGradient) {
                        simplifiedLegend.splice(0, i - 1);
                        break;
                    }
                }
                for (var i = simplifiedLegend.length - 1; i > -1; i--) {
                    if (simplifiedLegend[i].type < maxGradient) {
                        simplifiedLegend.splice(i + 2);
                        break;
                    }
                }

                this._categories[this.options.selectedAttributeIdx].legend = simplifiedLegend;
            }

            var existingLegend = document.querySelector('.legend-container');
            if (existingLegend !== null) {
                existingLegend.remove();
            }

            var legend = L.DomUtil.create('div', 'legend-container', this._container);
            // hack to keep the chart from getting too tall,
            // and to keep it from growing vertically on window resize
            legend.style.setProperty('position', 'absolute');
            // naively align the legend vertically with the y-axis
            legend.style.setProperty('margin-left', '65px');
            legend.style.setProperty('margin-top', '-18px');

            var legendLabel = L.DomUtil.create('span', 'legend-hover legend-text', legend);
            legendLabel.textContent = this._getTranslation('legend') + ':';

            this._categories[this.options.selectedAttributeIdx].legend.forEach((l) => {
                var color = L.DomUtil.create('span', 'legend-rect', legend);
                color.style.setProperty('padding-left', '10px');
                color.style.setProperty('padding-right', '3px');
                color.style.setProperty('width', '6px');
                color.style.setProperty('height', '6px');
                color.style.setProperty('color', l.color);
                color.innerHTML = '&#9632;';

                var label = L.DomUtil.create('span', 'legend-text', legend);
                label.textContent = l.text;
            });
        },
    });

    var heightgraphControl = new Heightgraph();
    return heightgraphControl;
};
