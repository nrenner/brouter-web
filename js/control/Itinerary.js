BR.Itinerary = L.Class.extend({
    initialize: function () {
        this._content = document.getElementById('itinerary');
        this.update();
    },

    update: function (polyline, segments) {
        var i,
            j,
            iter,
            html = '';

        html += '<pre class="flexgrow">';
        for (i = 0; segments && i < segments.length; i++) {
            iter = segments[i].feature.iternity;
            for (j = 0; iter && j < iter.length; j++) {
                html += iter[j] + '\n';
            }
        }
        html += '</pre>';

        this._content.innerHTML = html;
    },
});
