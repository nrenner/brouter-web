/*
 * https://github.com/adoroszlai/leaflet-distance-markers
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014- Doroszlai Attila, 2016- Phil Whitehurst
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

L.DistanceMarkers = L.LayerGroup.extend({
    initialize(line, map, options) {
        options = options || {};
        var offset = options.offset || 1000;
        var showAll = Math.min(map.getMaxZoom(), options.showAll || 12);
        var cssClass = options.cssClass || 'dist-marker';
        var iconSize = options.iconSize !== undefined ? options.iconSize : [12, 12];
        var textFunction =
            options.textFunction ||
            function (distance, i) {
                return i;
            };

        var zoomLayers = {};
        // Get line coords as an array
        var coords = line;
        if (typeof line.getLatLngs == 'function') {
            coords = line.getLatLngs();
        }
        // Get accumulated line lengths as well as overall length
        var accumulated = L.GeometryUtil.accumulatedLengths(line);
        var length = accumulated.length > 0 ? accumulated[accumulated.length - 1] : 0;
        // Position in accumulated line length array
        var j = 0;
        // Number of distance markers to be added
        var count = Math.floor(length / offset);

        for (var i = 1; i <= count; ++i) {
            var distance = offset * i;
            // Find the first accumulated distance that is greater
            // than the distance of this marker
            while (j < accumulated.length - 1 && accumulated[j] < distance) {
                ++j;
            }
            // Now grab the two nearest points either side of
            // distance marker position and create a simple line to
            // interpolate on
            var text = textFunction.call(this, distance, i, offset);
            var p1 = coords[j - 1];
            var p2 = coords[j];
            var m_line = L.polyline([p1, p2]);
            var ratio = (distance - accumulated[j - 1]) / (accumulated[j] - accumulated[j - 1]);
            var position = L.GeometryUtil.interpolateOnLine(map, m_line, ratio);
            // width as base number, one for padding + multiply by number of digits
            var size = [iconSize[0] + iconSize[0] * ('' + text).length, iconSize[1]];
            var icon = L.divIcon({ className: cssClass, html: text, iconSize: size });
            var marker = L.marker(position.latLng, { title: text, icon, interactive: false });

            // visible only starting at a specific zoom level
            var zoom = this._minimumZoomLevelForItem(i, showAll);
            if (zoomLayers[zoom] === undefined) {
                zoomLayers[zoom] = L.layerGroup();
            }
            zoomLayers[zoom].addLayer(marker);
        }

        var currentZoomLevel = 0;
        var markerLayer = this;
        var updateMarkerVisibility = function () {
            var oldZoom = currentZoomLevel;
            var newZoom = (currentZoomLevel = map.getZoom());

            if (newZoom > oldZoom) {
                for (var i = oldZoom + 1; i <= newZoom; ++i) {
                    if (zoomLayers[i] !== undefined) {
                        markerLayer.addLayer(zoomLayers[i]);
                    }
                }
            } else if (newZoom < oldZoom) {
                for (var i = oldZoom; i > newZoom; --i) {
                    if (zoomLayers[i] !== undefined) {
                        markerLayer.removeLayer(zoomLayers[i]);
                    }
                }
            }
        };
        map.on('zoomend', updateMarkerVisibility);

        this._zoomLayers = zoomLayers;
        this._layers = {}; // need to initialize before adding markers to this LayerGroup
        updateMarkerVisibility();
    },

    setOpacity(opacity) {
        var i,
            keys = Object.keys(this._zoomLayers),
            l = keys.length;

        for (i = 0; i < l; ++i) {
            var zoomLayer = this._zoomLayers[keys[i]];
            zoomLayer.eachLayer(function (layer) {
                layer.setOpacity(opacity);
            });
        }
    },

    _minimumZoomLevelForItem(item, showAllLevel) {
        var zoom = showAllLevel,
            i = item;
        while (i > 0 && i % 2 === 0) {
            --zoom;
            i = Math.floor(i / 2);
        }
        return zoom;
    },
});
