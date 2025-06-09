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
	    // Same as RoutingPathQuality.js for incline
	    palette: {
		0.0: '#0000ff', // blue
		0.25: '#00ffff', // cyan
		0.5: '#00ff00', // green
		0.75: '#ffff00', // yellow
		1.0: '#ff0000', // red
	    },
	    // fixed palette color range -15% to +15% (not degree!)
	    palette_minValue: -15,
            palette_maxValue: 15,
	    palette_size: 50,
            expandControls: false,
	    value2text: (value) => `${value.toFixed(0)}%`,
            // extra options
            shortcut: {
                toggle: 69, // char code for 'e'
            },
        },

        addBelow(map) {
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

        initCollapse(map) {
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

        _keydownListener(e) {
            if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.toggle) {
                $('#elevation-btn').click();
            }
        },

        update(track, layer) {
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

		const dataProvider = new HotLineQualityProvider({
                    valueFunction(latLng, prevLatLng) {
			if(latLng.alt === undefined) {
			    return 0;
			}
                        var deltaAltitude = latLng.alt - prevLatLng.alt, // in m
                            distance = prevLatLng.distanceTo(latLng); // in m
                        if (distance === 0) {
                            return 0;
                        }
                        return Math.round((deltaAltitude / distance)*100);
                    },
		    convertToArray(latLng, val) {
			let res = L.latLng(latLng);
			res.alt = res.alt || 0; // may happen on beeline
			res._value = val;
			return res;
		    },
                });
		this.addData(dataProvider.computeLatLngVals(track));
		this._createLegend();

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

        _createLegend() {
            if (this._data.length < 0) {
		return;
	    }
	    // Already calculated by Heightgraph
	    let minGradient =  Math.max(Math.round(this._palette.realMin / 5) * 5, this.options.palette_minValue);
	    let maxGradient =  Math.min(Math.round(this._palette.realMax / 5) * 5, this.options.palette_maxValue);

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
            legendLabel.textContent = i18next.t('Legend') + ':';

	    for(let i = minGradient; i <= maxGradient; i += 5) {
                var color = L.DomUtil.create('span', 'legend-rect', legend);
                color.style.setProperty('padding-left', '10px');
                color.style.setProperty('padding-right', '3px');
                color.style.setProperty('width', '6px');
                color.style.setProperty('height', '6px');
                color.style.setProperty('color', this.getRGBForValue(i));
                color.innerHTML = '&#9632;';

                var label = L.DomUtil.create('span', 'legend-text', legend);
                label.textContent = `${i} %`;
            }
        },
    });

    var heightgraphControl = new Heightgraph();
    return heightgraphControl;
};
