BR.TrackMessages = L.Class.extend({

    options: {
        heading: 'Data',
        edgeStyle: {
            color: 'yellow',
            opacity: 0.8,
            weight: 8
        }
    },

    // true when tab is shown, false when hidden
    active: false,

    columnOptions: {
        'Longitude': { visible: false },
        'Latitude': { visible: false },
        'Elevation': { title: 'elev.', className: 'dt-body-right' },
        'Distance': { title: 'dist.', className: 'dt-body-right' },
        'CostPerKm': { title: '$/km', className: 'dt-body-right' },
        'ElevCost': { title: 'elev$', className: 'dt-body-right' },
        'TurnCost': { title: 'turn$', className: 'dt-body-right' },
        'NodeCost': { title: 'node$', className: 'dt-body-right' },
        'InitialCost': { title: 'initial$', className: 'dt-body-right' }
    },

    initialize: function (options) {
        L.setOptions(this, options);

        var table = document.getElementById('datatable');
        this.tableClassName = table.className;
        this.tableParent = table.parentElement;
    },

    onAdd: function (map) {
        this._map = map;
    },

    update: function (polyline, segments) {
        var i, messages, columns, headings,
            data = [];

        if (!this.active) {
            return;
        }

        for (i = 0; segments && i < segments.length; i++) {
            messages = segments[i].feature.properties.messages;
            if (messages) {
                data = data.concat(messages.slice(1));
            }
        }

        this._destroyTable();

        if (data.length === 0) {
           return;
        }

        headings = messages[0];
        columns = this._getColumns(headings, data);

        console.time('datatable');
        this._table = $('#datatable').DataTable({
            destroy: true,
            data: data,
            columns: columns,
            paging: false,
            searching: false,
            info: false,
            // flexbox workaround: without scrollY height Firefox extends to content height
            // (^= minimum height with flexbox?)
            scrollY: 50,
            scrollX: true,
            order: []
        });

        // highlight track segment (graph edge) on row hover
        this._setEdges(polyline, segments);
        $('#datatable tbody tr').hover(L.bind(this._handleHover, this), L.bind(this._handleHoverOut, this));

        console.timeEnd('datatable');
    },

    show: function() {
        this.active = true;
        this.options.requestUpdate(this);
    },

    hide: function() {
        this.active = false;
    },

    _destroyTable: function() {
        var ele;

        if ($.fn.DataTable.isDataTable('#datatable') ) {
            // destroy option too slow on update, really remove elements with destroy method
            $('#datatable').DataTable().destroy(true);

            // recreate original table element, destroy removes all
            ele = document.createElement('table');
            ele.id = 'datatable';
            ele.className = this.tableClassName;
            this.tableParent.appendChild(ele);
        }

        return ele || document.getElementById('datatable');
    },

    _getColumns: function(headings, data) {
        var columns = [],
            defaultOptions,
            options,
            emptyColumns = this._getEmptyColumns(data);

        for (k = 0; k < headings.length; k++) {
            defaultOptions = {
                title: headings[k],
                visible: !emptyColumns[k]
            };
            options = L.extend(defaultOptions, this.columnOptions[headings[k]]);
            columns.push(options);
        }
        return columns;
    },

    _getEmptyColumns: function(data) {
        var empty = new Array(data[0].length),
            i;
    
        for (i = 0; i < empty.length; i++) {
            empty[i] = true;
        }

        data.forEach(function(row) {
            row.forEach(function(val, i) {
                empty[i] = empty[i] && !val;
            });
        });

        return empty;
    },

    _getMessageLatLng: function(message) {
        var lon = message[0] / 1000000,
            lat = message[1] / 1000000;
    
        return L.latLng(lat, lon);
    },

    _setEdges: function(polyline, segments) {
        var messages, segLatLngs, length, si, mi, latLng, i, segIndex,
            baseIndex = 0;

        // track latLngs index for end node of edge
        this._edges = [];
        this._track = polyline;

        for (si = 0; si < segments.length; si++) {
            messages = segments[si].feature.properties.messages;
            segLatLngs = segments[si].getLatLngs();
            length = segLatLngs.length;
            segIndex = 0;

            for (mi = 1; mi < messages.length; mi++) {
                latLng = this._getMessageLatLng(messages[mi]);

                for (i = segIndex; i < length; i++) {
                    if (latLng.equals(segLatLngs[i])) {
                        break;
                    }
                }
                if (i === length) {
                    i = length - 1;
                    if (mi !== messages.length - 1) debugger;
                }

                segIndex = i + 1;
                this._edges.push(baseIndex + i);
            }
            baseIndex += length;
        }
    },

    _handleHover: function(evt) {
        var tr = $(evt.currentTarget),
            row = this._table.row(tr),
            trackLatLngs = this._track.getLatLngs(),
            startIndex = row.index() > 0 ? this._edges[row.index() - 1] : 0,
            endIndex = this._edges[row.index()],
            edgeLatLngs = trackLatLngs.slice(startIndex, endIndex + 1);

        this._selectedEdge = L.polyline(edgeLatLngs, this.options.edgeStyle).addTo(this._map);
    },

    _handleHoverOut: function(evt) {
        this._map.removeLayer(this._selectedEdge);
        this._selectedEdge = null;
    }
});

BR.TrackMessages.include(L.Mixin.Events);
