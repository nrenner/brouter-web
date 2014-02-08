L.Control.Elevation = L.Control.extend({
	options: {
		position: "topright",
		theme: "lime-theme",
		width: 600,
		height: 175,
		margins: {
			top: 10,
			right: 20,
			bottom: 30,
			left: 50
		},
		useHeightIndicator: true,
		interpolation: "linear",
		hoverNumber: {
			decimalsX: 3,
			decimalsY: 0,
			formatter: undefined
		},
		xTicks: undefined,
		yTicks: undefined,
		collapsed: false
	},

	onRemove: function(map) {
		this._container = null;
		this._data = null;
		this._dist = null;
	},

	onAdd: function(map) {
		this._map = map;

		var opts = this.options;
		var margin = opts.margins;
		opts.width = opts.width - margin.left - margin.right;
		opts.height = opts.height - margin.top - margin.bottom;
		opts.xTicks = opts.xTicks || Math.round(opts.width / 75);
		opts.yTicks = opts.yTicks || Math.round(opts.height / 30);
		opts.hoverNumber.formatter = opts.hoverNumber.formatter || this._formatter;

		//append theme name on body
		d3.select("body").classed(opts.theme, true);

		var x = this._x = d3.scale.linear()
			.range([0, opts.width]);

		var y = this._y = d3.scale.linear()
			.range([opts.height, 0]);

		var area = this._area = d3.svg.area()
			.interpolate(opts.interpolation)
			.x(function(d) {
			return x(d.dist);
		})
			.y0(opts.height)
			.y1(function(d) {
			return y(d.altitude);
		});

		var container = this._container = L.DomUtil.create("div", "elevation");
		
		this._initToggle();

		var complWidth = opts.width + margin.left + margin.right;
		var cont = d3.select(container);
		cont.attr("width", complWidth);
		var svg = cont.append("svg");
		svg.attr("width", complWidth)
			.attr("class", "background")
			.attr("height", opts.height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var line = d3.svg.line();
		line = line
			.x(function(d) {
			return d3.mouse(svg.select("g"))[0];
		})
			.y(function(d) {
			return opts.height;
		});

		var g = d3.select(this._container).select("svg").select("g");

		this._areapath = g.append("path")
			.attr("class", "area");

		var background = this._background = g.append("rect")
			.attr("width", opts.width)
			.attr("height", opts.height)
			.style("fill", "none")
			.style("stroke", "none")
			.style("pointer-events", "all");

		background.on("mousemove", this._mousemoveHandler.bind(this));
		background.on("mouseout", this._mouseoutHandler.bind(this));

		this._xaxisgraphicnode = g.append("g");
		this._yaxisgraphicnode = g.append("g");
		this._appendXaxis(this._xaxisgraphicnode);
		this._appendYaxis(this._yaxisgraphicnode);

		var focusG = this._focusG = g.append("g");
		this._mousefocus = focusG.append('svg:line')
			.attr('class', 'mouse-focus-line')
			.attr('x2', '0')
			.attr('y2', '0')
			.attr('x1', '0')
			.attr('y1', '0');
		this._focuslabelX = focusG.append("svg:text")
			.style("pointer-events", "none")
			.attr("class", "mouse-focus-label-x");
		this._focuslabelY = focusG.append("svg:text")
			.style("pointer-events", "none")
			.attr("class", "mouse-focus-label-y");

		return container;
	},

	_initToggle: function () {

		/* inspired by L.Control.Layers */

		var container = this._container;

		//Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!L.Browser.touch) {
			L.DomEvent
				.disableClickPropagation(container);
				//.disableScrollPropagation(container);
		} else {
			L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
		}

		if (this.options.collapsed)
		{
			this._collapse();

			if (!L.Browser.android) {
				L.DomEvent
					.on(container, 'mouseover', this._expand, this)
					.on(container, 'mouseout', this._collapse, this);
			}
			var link = this._button = L.DomUtil.create('a', 'elevation-toggle', container);
			link.href = '#';
			link.title = 'Elevation';

			if (L.Browser.touch) {
				L.DomEvent
					.on(link, 'click', L.DomEvent.stop)
					.on(link, 'click', this._expand, this);
			}
			else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		}
	},

	_expand: function () {
		this._container.className = this._container.className.replace(' elevation-collapsed', '');
	},

	_collapse: function () {
		L.DomUtil.addClass(this._container, 'elevation-collapsed');
	},

	/*
	 * Fromatting funciton using the given decimals and seperator
	 */
	_formatter: function(num, dec, sep) {
		var res;
		if (dec === 0) {
			res = Math.round(num) + "";
		} else {
			res = L.Util.formatNum(num, dec) + "";
		}
		var numbers = res.split(".");
		if (numbers[1]) {
			var d = dec - numbers[1].length;
			for (; d > 0; d--) {
				numbers[1] += "0";
			}
			res = numbers.join(sep || ".");
		}
		return res;
	},

	_appendYaxis: function(y) {
		y.attr("class", "y axis")
			.call(d3.svg.axis()
			.scale(this._y)
			.ticks(this.options.yTicks)
			.orient("left"))
			.append("text")
			.attr("x", 15)
			.style("text-anchor", "end")
			.text("m");
	},

	_appendXaxis: function(x) {
		x.attr("class", "x axis")
			.attr("transform", "translate(0," + this.options.height + ")")
			.call(d3.svg.axis()
			.scale(this._x)
			.ticks(this.options.xTicks)
			.orient("bottom"))
			.append("text")
			.attr("x", this.options.width + 15)
			.style("text-anchor", "end")
			.text("km");
	},

	_updateAxis: function() {
		this._xaxisgraphicnode.selectAll("axis").remove();
		this._yaxisgraphicnode.selectAll("axis").remove();
		this._appendXaxis(this._xaxisgraphicnode);
		this._appendYaxis(this._yaxisgraphicnode);
	},

	_mouseoutHandler: function() {
		if (this._marker) {
			this._map.removeLayer(this._marker);
			this._marker = null;
		}
		if (this._mouseHeightFocus) {
			this._mouseHeightFocus.style("visibility", "hidden");
			this._mouseHeightFocusLabel.style("visibility", "hidden");
		}
		if (this._pointG) {
			this._pointG.style("visibility", "hidden");
		}
		this._focusG.style("visibility", "hidden");
	},

	_mousemoveHandler: function(d, i, ctx) {
		if (!this._data || this._data.length === 0) {
			return;
		}
		var coords = d3.mouse(this._background.node());
		var opts = this.options;
		this._focusG.style("visibility", "visible");
		this._mousefocus.attr('x1', coords[0])
			.attr('y1', 0)
			.attr('x2', coords[0])
			.attr('y2', opts.height)
			.classed('hidden', false);
		var bisect = d3.bisector(function(d) {
			return d.dist;
		}).left;

		var xinvert = this._x.invert(coords[0]),
			item = bisect(this._data, xinvert),
			alt = this._data[item].altitude,
			dist = this._data[item].dist,
			ll = this._data[item].latlng,
			numY = opts.hoverNumber.formatter(alt, opts.hoverNumber.decimalsY),
			numX = opts.hoverNumber.formatter(dist, opts.hoverNumber.decimalsX);

		this._focuslabelX.attr("x", coords[0])
			.text(numY + " m");
		this._focuslabelY.attr("y", opts.height - 5)
			.attr("x", coords[0])
			.text(numX + " km");

		var layerpoint = this._map.latLngToLayerPoint(ll);

		//if we use a height indicator we create one with SVG
		//otherwise we show a marker
		if (opts.useHeightIndicator) {

			if (!this._mouseHeightFocus) {

				var heightG = d3.select(".leaflet-overlay-pane svg")
					.append("g");
				this._mouseHeightFocus = heightG.append('svg:line')
					.attr('class', 'height-focus line')
					.attr('x2', '0')
					.attr('y2', '0')
					.attr('x1', '0')
					.attr('y1', '0');

				var pointG = this._pointG = heightG.append("g");
				pointG.append("svg:circle")
					.attr("r", 6)
					.attr("cx", 0)
					.attr("cy", 0)
					.attr("class", "height-focus circle-lower");

				this._mouseHeightFocusLabel = heightG.append("svg:text")
					.attr("class", "height-focus-label")
					.style("pointer-events", "none");

			}

			var normalizedAlt = this.options.height / this._maxElevation * alt;
			var normalizedY = layerpoint.y - normalizedAlt;
			this._mouseHeightFocus.attr("x1", layerpoint.x)
				.attr("x2", layerpoint.x)
				.attr("y1", layerpoint.y)
				.attr("y2", normalizedY)
				.style("visibility", "visible");

			this._pointG.attr("transform", "translate(" + layerpoint.x + "," + layerpoint.y + ")")
				.style("visibility", "visible");

			this._mouseHeightFocusLabel.attr("x", layerpoint.x)
				.attr("y", normalizedY)
				.text(alt + " m")
				.style("visibility", "visible");

		} else {

			if (!this._marker) {

				this._marker = new L.Marker(ll).addTo(this._map);

			} else {

				this._marker.setLatLng(ll);

			}

		}

	},

	/*
	 * Parsing of GeoJSON data lines and their elevation in z-coordinate
	 */
	_addGeoJSONData: function(coords) {
		if (coords) {
			var data = this._data || [];
			var dist = this._dist || 0;
			var ele = this._maxElevation || 0;
			for (var i = 0; i < coords.length; i++) {
				var s = new L.LatLng(coords[i][1], coords[i][0]);
				var e = new L.LatLng(coords[i ? i - 1 : 0][1], coords[i ? i - 1 : 0][0]);
				var newdist = s.distanceTo(e);
				dist = dist + newdist / 1000;
				ele = ele < coords[i][2] ? coords[i][2] : ele;
				data.push({
					dist: dist,
					altitude: coords[i][2],
					x: coords[i][0],
					y: coords[i][1],
					latlng: s
				});
			}
			this._dist = dist;
			this._data = data;
			this._maxElevation = ele;
		}
	},

	/*
	 * Parsing function for GPX data as used by https://github.com/mpetazzoni/leaflet-gpx
	 */
	_addGPXdata: function(coords) {
		if (coords) {
			var data = this._data || [];
			var dist = this._dist || 0;
			var ele = this._maxElevation || 0;
			for (var i = 0; i < coords.length; i++) {
				var s = coords[i];
				var e = coords[i ? i - 1 : 0];
				var newdist = s.distanceTo(e);
				dist = dist + newdist / 1000;
				ele = ele < s.meta.ele ? s.meta.ele : ele;
				data.push({
					dist: dist,
					altitude: s.meta.ele,
					x: s.lng,
					y: s.lat,
					latlng: s
				});
			}
			this._dist = dist;
			this._data = data;
			this._maxElevation = ele;
		}
	},

	_addData: function(d) {
		var geom = d && d.geometry && d.geometry;
		var i;

		if (geom) {
			switch (geom.type) {
				case 'LineString':
					this._addGeoJSONData(geom.coordinates);
					break;

				case 'MultiLineString':
					for (i = 0; i < geom.coordinates.length; i++) {
						this._addGeoJSONData(geom.coordinates[i]);
					}
					break;

				default:
					throw new Error('Invalid GeoJSON object.');
			}
		}

		var feat = d && d.type === "FeatureCollection";
		if (feat) {
			for (i = 0; i < d.features.length; i++) {
				this._addData(d.features[i]);
			}
		}

		if (d && d._latlngs) {
			this._addGPXdata(d._latlngs);
		}
	},

	/*
	 * Add data to the diagram either from GPX or GeoJSON and
	 * update the axis domain and data
	 */
	addData: function(d) {

		this._addData(d);

		var xdomain = d3.extent(this._data, function(d) {
			return d.dist;
		});
		var ydomain = d3.extent(this._data, function(d) {
			return d.altitude;
		});

		this._x.domain(xdomain);
		this._y.domain(ydomain);
		this._areapath.datum(this._data)
			.attr("d", this._area);
		this._updateAxis();
		return;
	}

});

L.control.elevation = function(options) {
	return new L.Control.Elevation(options);
};