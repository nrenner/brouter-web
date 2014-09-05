BR.TrackMessages = L.Class.extend({
    // true when tab is shown, false when hidden
    active: false,

    columnOptions: {
        'Longitude': { visible: false },
        'Latitude': { visible: false },
        'Elevation': { title: 'elev.', className: 'dt-body-right' },
        'Distance': { title: 'dist.', className: 'dt-body-right' },
        'CostPerKm': { title: 'cost/km', className: 'dt-body-right' },
        'ElevCost': { title: 'elevcost', className: 'dt-body-right' },
        'TurnCost': { title: 'turncost', className: 'dt-body-right' }
    },

    initialize: function (options) {
        L.setOptions(this, options);

        var table = document.getElementById('datatable');
        this.tableClassName = table.className;
        this.tableParent = table.parentElement;
    },

    update: function (polyline, segments) {
        var i,
            messages,
            data = [],
            columns,
            headings,
            table;

        if (!this.active)
            return;

        for (i = 0; segments && i < segments.length; i++) {
            messages = segments[i].feature.properties.messages;
            data = data.concat(messages.slice(1));
        }

        this._destroyTable();

        if (data.length === 0)
           return;

        headings = messages[0];
        columns = this._getColumns(headings, data);

        console.time('datatable');
        table = $('#datatable').DataTable({
            destroy: true,
            data: data,
            columns: columns,
            paging: false,
            searching: false,
            info: false,
            scrollY: 330,
            scrollX: 370,
            scrollCollapse: true,
            order: []
        });

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
    }
});

BR.TrackMessages.include(L.Mixin.Events);
