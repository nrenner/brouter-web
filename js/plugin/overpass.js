BR.Overpass = function (map) {
    // == private members ==
    var originalGeom2Layer;
    // == public members ==
    this.handlers = {};
    this.rerender = function (mapcss) {};

    // == private methods ==
    var fire = function () {
        var name = arguments[0];
        if (typeof this.handlers[name] != 'function') return undefined;
        var handler_args = [];
        for (var i = 1; i < arguments.length; i++) handler_args.push(arguments[i]);

        return this.handlers[name].apply({}, handler_args);
    }.bind(this);

    // == public methods ==

    this.init = function () {
        // register mapcss extensions
        /* own MapCSS-extension:
         * added symbol-* properties
         * TODO: implement symbol-shape = marker|square?|shield?|...
         */
        styleparser.PointStyle.prototype.properties.push(
            'symbol_shape',
            'symbol_size',
            'symbol_stroke_width',
            'symbol_stroke_color',
            'symbol_stroke_opacity',
            'symbol_fill_color',
            'symbol_fill_opacity'
        );
        styleparser.PointStyle.prototype.symbol_shape = '';
        styleparser.PointStyle.prototype.symbol_size = NaN;
        styleparser.PointStyle.prototype.symbol_stroke_width = NaN;
        styleparser.PointStyle.prototype.symbol_stroke_color = null;
        styleparser.PointStyle.prototype.symbol_stroke_opacity = NaN;
        styleparser.PointStyle.prototype.symbol_fill_color = null;
        styleparser.PointStyle.prototype.symbol_fill_opacity = NaN;

        // prepare some Leaflet hacks
        originalGeom2Layer = L.GeoJSON.geometryToLayer;
    };

    // updates the map

    this.run_query = function (query, query_lang, cache, shouldCacheOnly, server, user_mapcss) {
        BR.Waiter.open('Preparing Query');
        server = 'http://overpass-api.de/api/';
        // 1. get overpass json data
        fire('onProgress', 'calling Overpass API interpreter', function (callback) {
            // kill the query on abort
            this.ajax_request.abort();
            // try to abort queries via kill_my_queries
            $.get(server + 'kill_my_queries')
                .done(callback)
                .fail(function () {
                    console.log('Warning: failed to kill query.');
                    callback();
                });
        });
        var onSuccessCb = function (data, textStatus, jqXHR) {
            //textStatus is not needed in the successCallback, don't cache it
            if (cache) cache[query] = [data, undefined, jqXHR];

            var data_amount = jqXHR.responseText.length;
            var data_txt;
            // round amount of data
            var scale = Math.floor(Math.log(data_amount) / Math.log(10));
            data_amount = Math.round(data_amount / Math.pow(10, scale)) * Math.pow(10, scale);
            if (data_amount < 1000) data_txt = data_amount + ' bytes';
            else if (data_amount < 1000000) data_txt = data_amount / 1000 + ' kB';
            else data_txt = data_amount / 1000000 + ' MB';
            fire('onProgress', 'received about ' + data_txt + ' of data');
            fire(
                'onDataRecieved',
                data_amount,
                data_txt,
                function () {
                    // abort callback
                    fire('onAbort');
                    return;
                },
                function () {
                    // continue callback
                    // different cases of loaded data: json data, xml data or error message?
                    var data_mode = null;
                    var geojson;
                    var stats = {};
                    this.ajax_request_duration = Date.now() - this.ajax_request_start;
                    fire('onProgress', 'parsing data');
                    setTimeout(function () {
                        // hacky firefox hack :( (it is not properly detecting json from the content-type header)
                        if (typeof data == 'string' && data[0] == '{') {
                            // if the data is a string, but looks more like a json object
                            try {
                                data = $.parseJSON(data);
                            } catch (e) {}
                        }
                        // hacky firefox hack :( (it is not properly detecting xml from the content-type header)
                        if (
                            typeof data == 'string' &&
                            data.substr(0, 5) == '<?xml' &&
                            jqXHR.status === 200 &&
                            !(jqXHR.getResponseHeader('content-type') || '').match(/text\/html/) &&
                            data.match(/<osm/)
                        ) {
                            try {
                                jqXHR.responseXML = data;
                                data = $.parseXML(data);
                            } catch (e) {
                                delete jqXHR.responseXML;
                            }
                        }

                        // continue after firefox hack
                        if (
                            typeof data == 'string' ||
                            (typeof data == 'object' && jqXHR.responseXML && $('remark', data).length > 0) ||
                            (typeof data == 'object' && data.remark && data.remark.length > 0)
                        ) {
                            // maybe an error message
                            data_mode = 'unknown';
                            var is_error = false;
                            is_error =
                                is_error ||
                                (typeof data == 'string' && // html coded error messages
                                    data.indexOf('Error') != -1 &&
                                    data.indexOf('<script') == -1 && // detect output="custom" content
                                    data.indexOf('<h2>Public Transport Stops</h2>') == -1); // detect output="popup" content
                            is_error =
                                is_error ||
                                (typeof data == 'object' && jqXHR.responseXML && $('remark', data).length > 0);
                            is_error = is_error || (typeof data == 'object' && data.remark && data.remark.length > 0);
                            if (is_error) {
                                // this really looks like an error message, so lets open an additional modal error message
                                var errmsg = '?';
                                if (typeof data == 'string') {
                                    errmsg = data.replace(/([\S\s]*<body>)/, '').replace(/(<\/body>[\S\s]*)/, '');
                                    // do some magic cleanup for better legibility of the actual error message
                                    errmsg = errmsg.replace(
                                        /<p>The data included in this document is from .*?<\/p>/,
                                        ''
                                    );
                                    var fullerrmsg = errmsg;
                                    errmsg = errmsg.replace(
                                        /open64: 0 Success \/osm3s_v\d+\.\d+\.\d+_osm_base (\w+::)*\w+\./,
                                        '[…]'
                                    );
                                }
                                if (typeof data == 'object' && jqXHR.responseXML)
                                    errmsg = '<p>' + $.trim($('remark', data).html()) + '</p>';
                                if (typeof data == 'object' && data.remark)
                                    errmsg = '<p>' + $('<div/>').text($.trim(data.remark)).html() + '</p>';
                                console.log('Overpass API error', fullerrmsg || errmsg); // write (full) error message to console for easier debugging
                                fire('onQueryError', errmsg);
                                data_mode = 'error';
                                // parse errors and highlight error lines
                                // var errlines = errmsg.match(/line \d+:/g) || [];
                                // for (var i = 0; i < errlines.length; i++) {
                                //   fire('onQueryErrorLine', 1 * errlines[i].match(/\d+/)[0]);
                                //}
                            }
                            // the html error message returned by overpass API looks goods also in xml mode ^^
                            this.resultType = 'error';
                            data = { elements: [] };
                            this.timestamp = undefined;
                            this.timestampAreas = undefined;
                            this.copyright = undefined;
                            stats.data = { nodes: 0, ways: 0, relations: 0, areas: 0 };
                            //geojson = [{features:[]}, {features:[]}, {features:[]}];
                        } else if (typeof data == 'object' && jqXHR.responseXML) {
                            // xml data
                            this.resultType = 'xml';
                            data_mode = 'xml';
                            this.timestamp = $('osm > meta:first-of-type', data).attr('osm_base');
                            this.timestampAreas = $('osm > meta:first-of-type', data).attr('areas');
                            this.copyright = $('osm > note:first-of-type', data).text();
                            stats.data = {
                                nodes: $('osm > node', data).length,
                                ways: $('osm > way', data).length,
                                relations: $('osm > relation', data).length,
                                areas: $('osm > area', data).length,
                            };
                            //// convert to geoJSON
                            //geojson = overpass.overpassXML2geoJSON(data);
                        } else {
                            // maybe json data
                            this.resultType = 'javascript';
                            data_mode = 'json';
                            this.timestamp = data.osm3s.timestamp_osm_base;
                            this.timestampAreas = data.osm3s.timestamp_areas_base;
                            this.copyright = data.osm3s.copyright;

                            stats.data = {
                                nodes: $.grep(data.elements, function (d) {
                                    return d.type == 'node';
                                }).length,
                                ways: $.grep(data.elements, function (d) {
                                    return d.type == 'way';
                                }).length,
                                relations: $.grep(data.elements, function (d) {
                                    return d.type == 'relation';
                                }).length,
                                areas: $.grep(data.elements, function (d) {
                                    return d.type == 'area';
                                }).length,
                            };

                            geojson = osmtogeojson(data, { flatProperties: true });
                            var redMarker = L.VectorMarkers.icon({
                                icon: 'hotel',
                                markerColor: 'green',
                            });
                            // Adds geojson to global scope
                            BR.hotelGeojson = L.geoJSON(geojson, {
                                pointToLayer: function (pointFeature, latlng) {
                                    return L.marker(latlng, {
                                        icon: redMarker,
                                    });
                                },
                            })
                                .bindPopup(function (layer) {
                                    console.log(layer.feature.properties);
                                    var content = layer.feature.properties;
                                    return JSON.stringify(content);
                                })
                                .addTo(map);
                            // Add geojson to map
                            map.addLayer(BR.hotelGeojson);

                            //// convert to geoJSON
                            //geojson = overpass.overpassJSON2geoJSON(data);
                            fire('onDone');
                        }

                        //   fire('onProgress', 'applying styles'); // doesn't correspond to what's really going on. (the whole code could in principle be put further up and called "preparing mapcss styles" or something, but it's probably not worth the effort)
                    }, 1); // end setTimeout
                }
            );
        };
        if (cache && cache.hasOwnProperty(query)) {
            onSuccessCb.apply(this, cache[query]);
        } else {
            this.ajax_request_start = Date.now();
            this.ajax_request = $.ajax(server + 'interpreter', {
                type: 'POST',
                data: { data: query },

                success: onSuccessCb,
                error: function (jqXHR, textStatus, errorThrown) {
                    if (textStatus == 'abort') return; // ignore aborted queries.
                    fire('onProgress', 'error during ajax call');
                    if (jqXHR.status == 400 || jqXHR.status == 504 || jqXHR.status == 429) {
                        // todo: handle those in a separate routine
                        // pass 400 Bad Request errors to the standard result parser, as this is most likely going to be a syntax error in the query.
                        this.success(jqXHR.responseText, textStatus, jqXHR);
                        return;
                    }
                    this.resultText = jqXHR.resultText;
                    var errmsg = '';
                    if (jqXHR.state() == 'rejected')
                        errmsg +=
                            '<p>Request rejected. (e.g. server not found, request blocked by browser addon, request redirected, internal server errors, etc.)</p>';
                    if (textStatus == 'parsererror') errmsg += '<p>Error while parsing the data (parsererror).</p>';
                    else if (textStatus != 'error' && textStatus != jqXHR.statusText)
                        errmsg += '<p>Error-Code: ' + textStatus + '</p>';
                    if (
                        (jqXHR.status != 0 && jqXHR.status != 200) ||
                        jqXHR.statusText != 'OK' // note to me: jqXHR.status "should" give http status codes
                    )
                        errmsg += '<p>Error-Code: ' + jqXHR.statusText + ' (' + jqXHR.status + ')</p>';
                    fire('onAjaxError', errmsg);
                    // closing wait spinner
                    fire('onDone');
                },
            }); // getJSON
        }
    };

    // Events for overpass objects

    this.handlers['onProgress'] = function (msg, abortcallback) {
        BR.Waiter.addInfo(msg, abortcallback);
    };
    this.handlers['onDone'] = function () {
        BR.Waiter.close();
        // var map_bounds = ide.map.getBounds();
        //var data_bounds = overpass.osmLayer.getBaseLayer().getBounds();
    };
    this.handlers['onEmptyMap'] = function (empty_msg, data_mode) {
        // show warning/info if only invisible data is returned
        if (empty_msg == 'no visible data') {
            if (!settings.no_autorepair) {
                var content =
                    '<p>' +
                    i18n.t('warning.incomplete.expl.1') +
                    '</p><p>' +
                    i18n.t('warning.incomplete.expl.2') +
                    '</p><p><input type="checkbox" name="hide_incomplete_data_warning"/>&nbsp;' +
                    i18n.t('warning.incomplete.not_again') +
                    '</p>';

                var dialog_buttons = [
                    {
                        name: i18n.t('dialog.repair_query'),
                        callback: function () {
                            ide.repairQuery('no visible data');
                        },
                    },
                    {
                        name: i18n.t('dialog.show_data'),
                        callback: function () {
                            if ($('input[name=hide_incomplete_data_warning]', this)[0].checked) {
                                settings.no_autorepair = true;
                                settings.save();
                            }
                            ide.switchTab('Data');
                        },
                    },
                ];
                showDialog(i18n.t('warning.incomplete.title'), content, dialog_buttons);
            }
        }
        // auto tab switching (if only areas are returned)
        if (empty_msg == 'only areas returned') ide.switchTab('Data');
        // auto tab switching (if nodes without coordinates are returned)
        if (empty_msg == 'no coordinates returned') ide.switchTab('Data');
        // auto tab switching (if unstructured data is returned)
        if (data_mode == 'unknown') ide.switchTab('Data');
        // display empty map badge
        $(
            '<div id="map_blank" style="z-index:5; display:block; position:relative; top:42px; width:100%; text-align:center; background-color:#eee; opacity: 0.8;">' +
                i18n.t('map.intentionally_blank') +
                ' <small>(' +
                empty_msg +
                ')</small></div>'
        ).appendTo('#map');
    };
    this.handlers['onDataRecieved'] = function (amount, amount_txt, abortCB, continueCB) {
        if (amount > 1000000) {
            BR.Waiter.close();
            var _originalDocumentTitle = document.title;
            document.title = '❗ ' + _originalDocumentTitle;
            // more than ~1MB of data
            // show warning dialog
            var dialog_buttons = [
                {
                    name: i18n.t('dialog.abort'),
                    callback: function () {
                        document.title = _originalDocumentTitle;
                        abortCB();
                    },
                },
                {
                    name: i18n.t('dialog.continue_anyway'),
                    callback: function () {
                        document.title = _originalDocumentTitle;
                        continueCB();
                    },
                },
            ];

            var content =
                '<p>' +
                i18n.t('warning.huge_data.expl.1').replace('{{amount_txt}}', amount_txt) +
                '</p><p>' +
                i18n.t('warning.huge_data.expl.2') +
                '</p>';
            showDialog(i18n.t('warning.huge_data.title'), content, dialog_buttons);
        } else continueCB();
    };
    this.handlers['onAbort'] = function () {
        BR.Waiter.close();
    };
    this.handlers['onAjaxError'] = function (errmsg) {
        BR.Waiter.close();
        var _originalDocumentTitle = document.title;
        document.title = '❗ ' + _originalDocumentTitle;
        // show error dialog
        var dialog_buttons = [
            {
                name: i18n.t('dialog.dismiss'),
                callback: function () {
                    document.title = _originalDocumentTitle;
                },
            },
        ];

        var content = '<p style="color:red;">' + i18n.t('error.ajax.expl') + '</p>' + errmsg;
        showDialog(i18n.t('error.ajax.title'), content, dialog_buttons);

        // print error text, if present
        if (this.resultText) ide.dataViewer.setValue(this.resultText);
    };
    this.handlers['onQueryError'] = function (errmsg) {
        BR.Waiter.close();
        var _originalDocumentTitle = document.title;
        document.title = '❗ ' + _originalDocumentTitle;
        var dialog_buttons = [
            {
                name: i18n.t('dialog.dismiss'),
                callback: function () {
                    document.title = _originalDocumentTitle;
                },
            },
        ];
        var content =
            '<div class="notification is-danger is-light">' + i18n.t('error.query.expl') + '<br>' + errmsg + '</div>';
        showDialog(i18n.t('error.query.title'), content, dialog_buttons);
    };
    this.handlers['onStyleError'] = function (errmsg) {
        var dialog_buttons = [{ name: i18n.t('dialog.dismiss') }];
        var content = '<p style="color:red;">' + i18n.t('error.mapcss.expl') + '</p>' + errmsg;
        showDialog(i18n.t('error.mapcss.title'), content, dialog_buttons);
    };
    this.handlers['onQueryErrorLine'] = function (linenumber) {
        ide.highlightError(linenumber);
    };
    this.handlers['onRawDataPresent'] = function () {
        ide.dataViewer.setOption('mode', this.resultType);
        ide.dataViewer.setValue(this.resultText);
    };
    this.handlers['onGeoJsonReady'] = function () {
        // show layer
        ide.map.addLayer(this.osmLayer);
        // autorun callback (e.g. zoom to data)
        if (typeof ide.run_query_on_startup === 'function') {
            ide.run_query_on_startup();
        }
        // display stats
        if (settings.show_data_stats) {
            var stats = this.stats;
            var stats_txt =
                '<small>' +
                i18n.t('data_stats.loaded') +
                '</small>&nbsp;&ndash;&nbsp;' +
                '' +
                i18n.t('data_stats.nodes') +
                ':&nbsp;' +
                stats.data.nodes +
                ', ' +
                i18n.t('data_stats.ways') +
                ':&nbsp;' +
                stats.data.ways +
                ', ' +
                i18n.t('data_stats.relations') +
                ':&nbsp;' +
                stats.data.relations +
                (stats.data.areas > 0 ? ', ' + i18n.t('data_stats.areas') + ':&nbsp;' + stats.data.areas : '') +
                '<br/>' +
                '<small>' +
                i18n.t('data_stats.displayed') +
                '</small>&nbsp;&ndash;&nbsp;' +
                '' +
                i18n.t('data_stats.pois') +
                ':&nbsp;' +
                stats.geojson.pois +
                ', ' +
                i18n.t('data_stats.lines') +
                ':&nbsp;' +
                stats.geojson.lines +
                ', ' +
                i18n.t('data_stats.polygons') +
                ':&nbsp;' +
                stats.geojson.polys +
                '</small>';
            $('<div id="data_stats" class="stats">' + stats_txt + '</div>').insertAfter('#map');
            // show more stats as a tooltip
            var backlogOverpass = this.timestamp && Date.now() - Date.parse(this.timestamp);
            var backlogOverpassAreas = this.timestampAreas && Date.now() - Date.parse(this.timestampAreas);
            $('#data_stats').tooltip({
                items: 'div',
                tooltipClass: 'stats',
                content: function () {
                    var str = '<div>';
                    if (this.ajax_request_duration) {
                        var duration = this.ajax_request_duration;
                        if (duration.toLocaleString) {
                            duration = duration.toLocaleString();
                        }
                        str += i18n.t('data_stats.request_duration') + ': ' + duration + 'ms<br>';
                    }
                    if (this.timestamp) {
                        str +=
                            i18n.t('data_stats.lag') +
                            ': ' +
                            Math.floor(backlogOverpass / 1000) +
                            's' +
                            ' <small>' +
                            i18n.t('data_stats.lag.expl') +
                            '</small>';
                    }
                    if (this.timestampAreas) {
                        str +=
                            '<br>' +
                            i18n.t('data_stats.lag_areas') +
                            ': ' +
                            Math.floor(backlogOverpassAreas / 1000) +
                            's' +
                            ' <small>' +
                            i18n.t('data_stats.lag.expl') +
                            '</small>';
                    }
                    str += '</div>';
                    return str;
                },
                hide: {
                    effect: 'fadeOut',
                    duration: 100,
                },
                position: {
                    my: 'right bottom-5',
                    at: 'right top',
                },
            });
            if (backlogOverpass > 24 * 60 * 60 * 1000 || backlogOverpassAreas > 96 * 60 * 60 * 1000) {
                $('#data_stats').css('background-color', 'yellow');
            }
        }
    };
    this.handlers['onPopupReady'] = function (p) {
        p.openOn(ide.map);
    };

    // == initializations ==
}; // end create overpass object

BR.Query = function (locationArgs) {
    var query = `[out:json][timeout:25];
    (node
      [tourism=hotel]${locationArgs};
    );
    out;
    `;

    return query;
};
