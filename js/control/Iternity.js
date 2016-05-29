BR.Iternity = BR.Control.extend({
	  options: {
        heading: 'Iternity'
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        this.update();
        return container;
    },

    update: function (polyline, segments) {
        var i, j, iter, html = '';

        html += '<small><pre>';
        for (i = 0; segments && i < segments.length; i++)
        {
            iter = segments[i].feature.iternity;
            for (j = 0; iter && j < iter.length; j++)
            {
              html += iter[j] + '\n';
            }
        }
        html += '</pre></small>';

        this._content.innerHTML = html;
    }
});
