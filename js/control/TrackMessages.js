BR.TrackMessages = L.Class.extend({
    initialize: function () {
    },

    update: function (polyline, segments) {
        var i,
            messages,
            data = [],
            columns;

        if (!segments || segments.length === 0)
           return;

        for (i = 0; segments && i < segments.length; i++) {
            messages = segments[i].feature.properties.messages;

            if (i === 0) {
                columns = this._getColumns(messages[0]);
            }

            data = data.concat(messages.slice(1));
        }

        $('#datatable').DataTable({
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

    },
            
    _getColumns: function(headings) {
        var columns = [];
        for (k = 0; k < headings.length; k++) {
            // http://datatables.net/reference/option/#Columns
            columns.push({
                title: headings[k]
            });
        }
        return columns;
    }
});

BR.TrackMessages.include(L.Mixin.Events);
