BR.TrackMessages = L.Class.extend({
    options: {
        edgeStyle: {
            color: 'yellow',
            opacity: 0.8,
            weight: 8,
            // show above quality coding (pane defined in RoutingPathQuality.js)
            pane: 'routingQualityPane'
        },
        // center hovered edge (way segment) on map
        syncMap: true
    },

    // true when tab is shown, false when hidden
    active: false,

    columnOptions: {
        Longitude: { visible: false },
        Latitude: { visible: false },
        Elevation: { title: 'elev.', className: 'dt-body-right' },
        Distance: { title: 'dist.', className: 'dt-body-right' },
        CostPerKm: { title: '$/km', className: 'dt-body-right' },
        ElevCost: { title: 'elev$', className: 'dt-body-right' },
        TurnCost: { title: 'turn$', className: 'dt-body-right' },
        NodeCost: { title: 'node$', className: 'dt-body-right' },
        InitialCost: { title: 'initial$', className: 'dt-body-right' }
    },

    /**
     * @type {?BR.TrackEdges}
     */
    trackEdges: null,

    /**
     * @type {?L.Polyline}
     */
    trackPolyline: null,

    initialize: function(map, options) {
        L.setOptions(this, options);
        this._map = map;

        var table = document.getElementById('datatable');
        this.tableClassName = table.className;
        this.tableParent = table.parentElement;

        var syncButton = document.getElementById('data-sync-map');
        L.DomEvent.on(syncButton, 'click', this._toggleSyncMap, this);
    },

    update: function(polyline, segments) {
        var i,
            messages,
            columns,
            headings,
            data = [];

        if (!this.active) {
            return;
        }

        this.trackPolyline = polyline;
        this.trackEdges = new BR.TrackEdges(segments);

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

        $('#datatable tbody tr').hover(L.bind(this._handleHover, this), L.bind(this._handleHoverOut, this));
        $('#datatable tbody').on('click', 'tr', L.bind(this._toggleSelected, this));
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

        if ($.fn.DataTable.isDataTable('#datatable')) {
            // destroy option too slow on update, really remove elements with destroy method
            $('#datatable')
                .DataTable()
                .destroy(true);

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

    _getRowEdge: function(tr) {
        var row = this._table.row($(tr)),
            trackLatLngs = this.trackPolyline.getLatLngs(),
            startIndex = row.index() > 0 ? this.trackEdges.edges[row.index() - 1] : 0,
            endIndex = this.trackEdges.edges[row.index()],
            edgeLatLngs = trackLatLngs.slice(startIndex, endIndex + 1);

        return L.polyline(edgeLatLngs, this.options.edgeStyle);
    },

    _handleHover: function(evt) {
        var tr = evt.currentTarget;

        this._hoveredEdge = this._getRowEdge(tr).addTo(this._map);
        if (this.options.syncMap && !this._selectedEdge) {
            this._map.panTo(this._hoveredEdge.getCenter());
        }
    },

    _handleHoverOut: function(evt) {
        this._map.removeLayer(this._hoveredEdge);
        this._hoveredEdge = null;
    },

    _toggleSelected: function(evt) {
        var tr = evt.currentTarget;

        if (tr.classList.toggle('selected')) {
            if (this._selectedEdge) {
                // no multi-select, remove selection of other row
                // (simpler to implement and to use?)
                this._map.removeLayer(this._selectedEdge);
                this._selectedRow.classList.remove('selected');
            }
            this._selectedEdge = this._getRowEdge(tr).addTo(this._map);
            this._selectedRow = tr;

            this._map.panTo(this._selectedEdge.getCenter());
        } else {
            this._map.removeLayer(this._selectedEdge);
            this._selectedEdge = null;
            this._selectedRow = null;
        }
    },

    _toggleSyncMap: function(evt) {
        var button = evt.currentTarget;

        button.classList.toggle('active');
        this.options.syncMap = !this.options.syncMap;
    }
});
