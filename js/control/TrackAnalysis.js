/**
 * Provides track analysis functionality.
 *
 * Takes the detailed way tags from brouter-server's response
 * and creates tables with distributions of way types, surfaces,
 * and smoothness values.
 *
 * On hovering/click a table row the corresponding track segments
 * are highlighted on the map.
 *
 * @type {L.Class}
 */
BR.TrackAnalysis = L.Class.extend({
    /**
     * @type {Object}
     */
    options: {
        overlayStyle: {
            color: 'yellow',
            opacity: 0.8,
            weight: 8,
            // show above quality coding (pane defined in RoutingPathQuality.js)
            pane: 'routingQualityPane'
        }
    },

    /**
     * The total distance of the whole track, recalculate on each `update()` call.
     *
     * @type {float}
     */
    totalRouteDistance: 0.0,

    /**
     * @param {Map} map
     * @param {object} options
     */
    initialize: function(map, options) {
        this.map = map;
        L.setOptions(this, options);
    },

    /**
     * @type {?BR.TrackEdges}
     */
    trackEdges: null,

    /**
     * @type {?L.Polyline}
     */
    trackPolyline: null,

    /**
     * true when tab is shown, false when hidden
     *
     * @type {boolean}
     */
    active: false,

    /**
     * Called by BR.Sidebar when tab is activated
     */
    show: function() {
        this.active = true;
        this.options.requestUpdate(this);
    },

    /**
     * Called by BR.Sidebar when tab is deactivated
     */
    hide: function() {
        this.active = false;
    },

    /**
     * Everytime the track changes this method is called:
     *
     * - calculate statistics (way type, surface, smoothness)
     *   for the whole track
     * - renders statistics tables
     * - create event listeners which allow to hover/click a
     *   table row for highlighting matching track segments
     *
     * @param {Polyline} polyline
     * @param {Array} segments
     */
    update: function(polyline, segments) {
        if (!this.active) {
            return;
        }

        if (segments.length === 0) {
            $('#track_statistics').html('');
            return;
        }

        this.trackPolyline = polyline;
        this.trackEdges = new BR.TrackEdges(segments);

        var analysis = this.calcStats(polyline, segments);

        this.render(analysis);

        $('.track-analysis-table tr').hover(L.bind(this.handleHover, this), L.bind(this.handleHoverOut, this));
        $('.track-analysis-table tbody').on('click', 'tr', L.bind(this.toggleSelected, this));
    },

    /**
     * This method does the heavy-lifting of statistics calculation.
     *
     * What happens here?
     *
     * - loop over all route segments
     * - for each segment loop over all contained points
     * - parse and analyze the `waytags` field between two consecutive points
     * - group the values for each examined category (highway, surface, smoothness) and sum up the distances
     *   - special handling for tracks: create an entry for each tracktype (and one if the tracktype is unknown)
     * - sort the result by distance descending
     *
     * @param polyline
     * @param segments
     * @returns {Object}
     */
    calcStats: function(polyline, segments) {
        var analysis = {
            highway: {},
            surface: {},
            smoothness: {}
        };

        this.totalRouteDistance = 0.0;

        for (var segmentIndex = 0; segments && segmentIndex < segments.length; segmentIndex++) {
            for (
                var messageIndex = 1;
                messageIndex < segments[segmentIndex].feature.properties.messages.length;
                messageIndex++
            ) {
                this.totalRouteDistance += parseFloat(
                    segments[segmentIndex].feature.properties.messages[messageIndex][3]
                );
                var wayTags = segments[segmentIndex].feature.properties.messages[messageIndex][9].split(' ');
                for (var wayTagIndex = 0; wayTagIndex < wayTags.length; wayTagIndex++) {
                    var wayTagParts = wayTags[wayTagIndex].split('=');
                    switch (wayTagParts[0]) {
                        case 'highway':
                            var highwayType = wayTagParts[1];
                            var trackType = '';
                            if (highwayType === 'track') {
                                trackType = this.getTrackType(wayTags);
                                highwayType = 'Track ' + trackType;
                            }
                            if (typeof analysis.highway[highwayType] === 'undefined') {
                                analysis.highway[highwayType] = {
                                    formatted_name: i18next.t(
                                        'sidebar.analysis.data.highway.' + highwayType,
                                        highwayType
                                    ),
                                    name: wayTagParts[1],
                                    subtype: trackType,
                                    distance: 0.0
                                };
                            }
                            analysis.highway[highwayType].distance += parseFloat(
                                segments[segmentIndex].feature.properties.messages[messageIndex][3]
                            );
                            break;
                        case 'surface':
                        case 'smoothness':
                            if (typeof analysis[wayTagParts[0]][wayTagParts[1]] === 'undefined') {
                                analysis[wayTagParts[0]][wayTagParts[1]] = {
                                    formatted_name: i18next.t(
                                        'sidebar.analysis.data.' + wayTagParts[0] + '.' + wayTagParts[1],
                                        wayTagParts[1]
                                    ),
                                    name: wayTagParts[1],
                                    subtype: '',
                                    distance: 0.0
                                };
                            }
                            analysis[wayTagParts[0]][wayTagParts[1]].distance += parseFloat(
                                segments[segmentIndex].feature.properties.messages[messageIndex][3]
                            );
                            break;
                    }
                }
            }
        }

        return this.sortAnalysisData(analysis);
    },

    /**
     * Transform analysis data for each type into an array, sort it
     * by distance descending and convert it back to an object.
     *
     * @param {Object} analysis
     *
     * @returns {Object}
     */
    sortAnalysisData: function(analysis) {
        var analysisSortable = {};
        var result = {};

        for (var type in analysis) {
            if (!analysis.hasOwnProperty(type)) {
                continue;
            }

            result[type] = {};
            analysisSortable[type] = [];

            for (var name in analysis[type]) {
                if (!analysis[type].hasOwnProperty(name)) {
                    continue;
                }
                analysisSortable[type].push(analysis[type][name]);
            }

            analysisSortable[type].sort(function(a, b) {
                return b.distance - a.distance;
            });

            for (var j = 0; j < analysisSortable[type].length; j++) {
                result[type][analysisSortable[type][j].formatted_name] = analysisSortable[type][j];
            }
        }

        return result;
    },

    /**
     * Extract the tracktype from a waytags string.
     * If no tracktype is found 'unknown' is returned.
     *
     * @param {string[]} wayTags
     * @returns {string}
     */
    getTrackType: function(wayTags) {
        for (var i = 0; i < wayTags.length; i++) {
            var wayTagParts = wayTags[i].split('=');
            if (wayTagParts[0] === 'tracktype') {
                return wayTagParts[1];
            }
        }

        return 'unknown';
    },

    /**
     * @param {Object} analysis
     */
    render: function(analysis) {
        var $content = $('#track_statistics');

        $content.html('');
        $content.append(
            $('<h4 class="track-analysis-heading">' + i18next.t('sidebar.analysis.header.highway') + '</h4>')
        );
        $content.append(this.renderTable('highway', analysis.highway));
        $content.append(
            $('<h4 class="track-analysis-heading">' + i18next.t('sidebar.analysis.header.surface') + '</h4>')
        );
        $content.append(this.renderTable('surface', analysis.surface));
        $content.append(
            $('<h4 class="track-analysis-heading">' + i18next.t('sidebar.analysis.header.smoothness') + '</h4>')
        );
        $content.append(this.renderTable('smoothness', analysis.smoothness));
    },

    /**
     * Renders an analysis table.
     *
     * @param {string} type
     * @param {Array} data
     * @returns {jQuery}
     */
    renderTable: function(type, data) {
        var index;
        var $table = $(
            '<table data-type="' + type + '" class="mini cell-border stripe dataTable track-analysis-table"></table>'
        );
        var $thead = $('<thead></thead>');
        $thead.append(
            $('<tr>')
                .append(
                    '<th class="track-analysis-header-category">' +
                        i18next.t('sidebar.analysis.table.category') +
                        '</th>'
                )
                .append(
                    $(
                        '<th class="track-analysis-header-distance">' +
                            i18next.t('sidebar.analysis.table.length') +
                            '</th>'
                    )
                )
        );
        $table.append($thead);
        var $tbody = $('<tbody></tbody>');

        var totalDistance = 0.0;

        for (index in data) {
            if (!data.hasOwnProperty(index)) {
                continue;
            }
            var $row = $(
                '<tr data-name="' +
                    data[index].name +
                    '" data-subtype="' +
                    data[index].subtype +
                    '" data-distance="' +
                    data[index].distance +
                    '"></tr>'
            );
            $row.append('<td class="track-analysis-title">' + data[index].formatted_name + '</td>');
            $row.append(
                '<td class="track-analysis-distance">' + this.formatDistance(data[index].distance) + ' km</td>'
            );
            $tbody.append($row);
            totalDistance += data[index].distance;
        }

        if (totalDistance < this.totalRouteDistance) {
            $tbody.append(
                $(
                    '<tr data-name="internal-unknown" data-distance="' +
                        (this.totalRouteDistance - totalDistance) +
                        '"></tr>'
                )
                    .append(
                        $('<td class="track-analysis-title">' + i18next.t('sidebar.analysis.table.unknown') + '</td>')
                    )
                    .append(
                        $(
                            '<td class="track-analysis-distance">' +
                                this.formatDistance(this.totalRouteDistance - totalDistance) +
                                ' km</td>'
                        )
                    )
            );
        }

        $table.append($tbody);

        $table.append(
            $('<tfoot></tfoot>')
                .append('<tr></tr>')
                .append($('<td>' + i18next.t('sidebar.analysis.table.total_known') + '</td>'))
                .append(
                    $(
                        '<td class="track-analysis-distance track-analysis-distance-total">' +
                            this.formatDistance(totalDistance) +
                            ' km</td>'
                    )
                )
        );

        return $table;
    },

    /**
     * Format a distance with two decimal places.
     *
     * @param {number} meters
     * @returns {string}
     */
    formatDistance: function(meters) {
        return (meters / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    handleHover: function(event) {
        var $tableRow = $(event.currentTarget);
        var $table = $tableRow.parents('table').first();
        var dataType = $table.data('type');
        var dataName = $tableRow.data('name');
        var trackType = $tableRow.data('subtype');

        var polylinesForDataType = this.getPolylinesForDataType(dataType, dataName, trackType);

        this.highlightedSegments = L.layerGroup(polylinesForDataType).addTo(this.map);
    },

    handleHoverOut: function() {
        this.map.removeLayer(this.highlightedSegments);
    },

    toggleSelected: function(event) {
        var tableRow = event.currentTarget;
        var $table = $(tableRow)
            .parents('table')
            .first();
        var dataType = $table.data('type');
        var dataName = $(tableRow).data('name');
        var trackType = $(tableRow).data('subtype');

        if (tableRow.classList.toggle('selected')) {
            if (this.highlightedSegment) {
                this.map.removeLayer(this.highlightedSegment);
                this.selectedTableRow.classList.remove('selected');
            }
            this.highlightedSegment = L.layerGroup(this.getPolylinesForDataType(dataType, dataName, trackType)).addTo(
                this.map
            );
            this.selectedTableRow = tableRow;

            return;
        }

        this.map.removeLayer(this.highlightedSegment);
        this.selectedTableRow = null;
        this.highlightedSegment = null;
    },

    /**
     * Searching each track edge if it matches the requested
     * arguments (type, name, subtype if type == track). If the
     * track edge matches the search, create a Leaflet polyline
     * and add it to the result array.
     *
     * @param {string} dataType `highway`, `surface`, `smoothness`
     * @param {string} dataName `primary`, `track, `asphalt`, etc.
     * @param {string} trackType the tracktype is passed here (e.g.
     * `grade3`), but only in the case that `dataName` is `track`
     *
     * @returns {Polyline[]}
     */
    getPolylinesForDataType: function(dataType, dataName, trackType) {
        var polylines = [];
        var trackLatLngs = this.trackPolyline.getLatLngs();

        for (var i = 0; i < this.trackEdges.edges.length; i++) {
            if (this.wayTagsMatchesData(trackLatLngs[this.trackEdges.edges[i]], dataType, dataName, trackType)) {
                var matchedEdgeIndexStart = i > 0 ? this.trackEdges.edges[i - 1] : 0;
                var matchedEdgeIndexEnd = this.trackEdges.edges[i] + 1;
                polylines.push(
                    L.polyline(
                        trackLatLngs.slice(matchedEdgeIndexStart, matchedEdgeIndexEnd),
                        this.options.overlayStyle
                    )
                );
            }
        }

        return polylines;
    },

    /**
     * Examine the way tags string if it matches the data arguments.
     * Special handling for implicit defined dataName 'internal-unknown'
     * which matches if a tag-pair is missing. Special handling for
     * tracktypes again.
     *
     * @param {string} wayTags The way tags as provided by brouter, e.g.
     * `highway=secondary surface=asphalt smoothness=good`
     * @param {string} dataType `highway`, `surface`, `smoothness`
     * @param {string} dataName `primary`, `track, `asphalt`, etc.
     * @param {string} trackType the tracktype is passed here (e.g.
     * `grade3`), but only in the case that `dataName` is `track`
     *
     * @returns {boolean}
     */
    wayTagsMatchesData: function(wayTags, dataType, dataName, trackType) {
        var parsed = this.parseWayTags(wayTags);

        switch (dataType) {
            case 'highway':
                if (dataName === 'track') {
                    if (trackType === 'unknown' && parsed.highway === 'track' && !parsed.tracktype) {
                        return true;
                    }

                    return typeof parsed.tracktype === 'string' && parsed.tracktype === trackType;
                }

                return parsed.highway === dataName;
            case 'surface':
                if (dataName === 'internal-unknown' && typeof parsed.surface !== 'string') {
                    return true;
                }

                return typeof parsed.surface === 'string' && parsed.surface === dataName;
            case 'smoothness':
                if (dataName === 'internal-unknown' && typeof parsed.smoothness !== 'string') {
                    return true;
                }

                return typeof parsed.smoothness === 'string' && parsed.smoothness === dataName;
        }

        return false;
    },

    /**
     * Transform a way tags string into an object, for example:
     *
     * 'highway=primary surface=asphalt' => { highway: 'primary', surface: 'asphalt' }
     *
     * @param wayTags The way tags as provided by brouter, e.g.
     * `highway=secondary surface=asphalt smoothness=good`
     *
     * @returns {object}
     */
    parseWayTags: function(wayTags) {
        var result = {};
        var wayTagPairs = wayTags.feature.wayTags.split(' ');

        for (var j = 0; j < wayTagPairs.length; j++) {
            var wayTagParts = wayTagPairs[j].split('=');
            result[wayTagParts[0]] = wayTagParts[1];
        }

        return result;
    }
});
