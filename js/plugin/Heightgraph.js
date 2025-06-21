BR.Heightgraph = function (map, layersControl, routing, pois) {
    class WeightedMovingAverage {
	constructor(windowLenMeters) {
	    this.windowLenMeters = windowLenMeters;
	    this.sum = 0;
	    this.cnt = 0;
	    this.win = [];
	    this.distance = 0;
	    // for fillAhead
	    this.position = 0;
	}

	factor(point) {
	    return Math.min(point._distance / this.windowLenMeters, 1);
	}

	push(point) {
	    const f = this.factor(point);
	    this.sum += point._value * f;
	    this.cnt += f;
	    this.distance += point._distance;
	    this.win.push(point);
	}

	pop() {
	    if(this.win.length === 0) {
		return null;
	    }
	    const point = this.win.shift();
	    const f = this.factor(point);
	    this.sum -= point._value * f;
	    this.cnt -= f;
	    this.distance -= point._distance;
	    return point;
	}
	
	popIfSame(point) {
	    if(this.win.length > 0 && this.win[0] === point) {
		this.pop();
	    }
	}

	limitBehind() {
	    while(this.distance > this.windowLenMeters && this.win.length > 1) {
		this.pop();
	    }
	}

	fillAhead(points) {
	    for(; this.position < points.length && 
		(this.distance + points[this.position]._distance) < this.windowLenMeters; 
		this.position++) 
	    {
		this.push(points[this.position]);
	    }
	}
    }

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
	    extratext: (value) => {
		if(!value?._feature?.wayTags) {
		    return [];
		}
		let data = new URLSearchParams(value._feature.wayTags.replace(/\s+/g, '&')); // eslint-disable-line compat/compat
		let surface = data.get('surface');
		let highway = data.get('highway');
		if(!surface && highway === 'track') {
		    surface = data.get('tracktype');
		}
		let res = [];
		if(highway) {
		    res.push([i18next.t('sidebar.analysis.header.highway'), i18next.t(highway)]);
		}
		if(surface) {
		    res.push([i18next.t('sidebar.analysis.header.surface'), i18next.t(surface)]);
		}
		return res;
	    },
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

	/* Convert incoming Track into array of points and do some Altitude
	 * filtering.
	 *
	 * Logic to reduce some noise on altitude. Assuming that most inclines/declines
	 * are steady but elevation data comes in blocks there are often short
	 * points with opposite direction. Moste notably on roads with serpentine's.
	 * 
	 * I would be very happy if someone with more knowledge replace this with
	 * something better.
	 */
	_filterTrack(track) {
	    let points = [];
	    let inputLatLngs = track.getLatLngs();
	    let lastPoint = inputLatLngs[0];
	    let lastLastPoint = inputLatLngs[0];
	    let fixed = 0;

	    for(let i = 0; i < inputLatLngs.length; i++) {
		const point = inputLatLngs[i];
		const distance = lastPoint.distanceTo(point); // in m

		const newPoint = L.latLng(point.lat, point.lng, point.alt || 0);
		newPoint._distance = distance;
		newPoint._feature = point.feature;
		points.push(newPoint);

		let dir = Math.sign(point.alt - lastPoint.alt);

		if(distance > 10 || dir === 0 || !point.alt || !lastPoint.alt || !lastLastPoint.alt) {
		    // do nothing here
		} else if(Math.sign(point.alt - lastLastPoint.alt) === dir) {
		    // Check if change in rise/decline is only temporary within the
		    // next short stretch of 10 meters
		    const lastPeakPoint = lastPoint;
		    let peakDistance = 0;
		    let j = i;
		    for(; j < inputLatLngs.length && peakDistance < 10; j++) {
			const peakPoint = inputLatLngs[j];
			if(!peakPoint.alt || Math.sign(peakPoint.alt - lastPoint.alt) !== dir ) {
			    break;
			}
			peakDistance += lastPeakPoint.distanceTo(peakPoint); 
		    }
		    const endPoint = inputLatLngs[j];
		    if(endPoint && endPoint !== point && Math.sign(endPoint.alt - point.alt) !== dir) {
			// in that case overwrite this part
			newPoint.alt = (lastPoint.alt + endPoint.alt) / 2;
		    }
		}
		lastLastPoint = lastPoint;
		lastPoint = point;
	    }
	    return points;
	},

	/* Calculate (smoothed) gradients for array of points */
	_calcData(points) {
	    let lastPoint = points[0];
	    let maxGrade = 0;
	    let maxAlt = Number.MIN_SAFE_INTEGER;
	    let minAlt = Number.MAX_SAFE_INTEGER;
	    for(let point of points) {
		const deltaAltitude = point.alt - lastPoint.alt;
		point._value = (deltaAltitude / point._distance)*100;
		if(isNaN(point._value)) {
		    // guaranteed for first point and might happen for strange other points
		    // use zero otherwise the average calculation would wipe out everything
		    point._value = 0;
		}
		maxGrade = Math.max(maxGrade, point._value);
		maxAlt = Math.max(point.alt, maxAlt);
		minAlt = Math.min(point.alt, minAlt);
		lastPoint = point;
	    }
	    let maxDelta = maxAlt - minAlt;

	    // Decide whether to try smoothing absurde gradients or not.
	    // Aim is to avoid massive rainbow colored long climbs, without any
	    // something something like stelvio might have bits with +40% and -15%
	    // especially the claimed decrease (on the climb!) is miles away from
	    // reality.
	    //
	    // The numbers when and by which amount to smooth are of course
	    // completely arbitrary. (With aim of making stelvio look reasonable).
	    //
	    // We could improve this selection for longer routers by dynamically
	    // adjust the smoothing base on large segements e.g. every 10km.
	    // But keep it simple for now
	    //
	    // Again would be happy if someone can suggest something with better
	    // results and/or some scientific base

	    console.debug(`${maxGrade}  - ${maxDelta}`);
	    if(maxGrade < 15 || (maxDelta < 100 && maxGrade < 30)) {
		// don't do any smoothing on flat routes
		console.debug('no smoothing');
		return points;
	    }
	    let windowLenMeters = 15;
	    if((maxGrade > 20 && maxDelta > 500) || maxGrade > 40) {
		windowLenMeters = 35;
	    } else if(maxGrade > 15 || maxDelta > 200) {
		windowLenMeters = 25;
	    }
	    console.debug(`smoothing ${windowLenMeters}`);

	    let behind = new WeightedMovingAverage(windowLenMeters);
	    let ahead = new WeightedMovingAverage(windowLenMeters);
	    for(let point of points) {
		behind.push(point);
		behind.limitBehind(windowLenMeters, 1);
		ahead.popIfSame(point);
		ahead.fillAhead(points, windowLenMeters);
		//console.debug(`(${behind.sum} + ${ahead.sum}) / (${behind.cnt} + ${ahead.cnt})`);
		point._newValue = (behind.sum + ahead.sum) / (behind.cnt + ahead.cnt);
		//console.debug(`${point._value} => ${point._newValue}`);
	    }

	    for(let point of points) {
		point._value = point._newValue;
		delete point._newValue;
	    }

	    return points;
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

		const points = this._filterTrack(track);
		this.addData(this._calcData(points));
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
