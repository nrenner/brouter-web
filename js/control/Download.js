BR.Download = BR.Control.extend({
	  options: {
        heading: 'Download'
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        return container;
    },

    update: function (urls) {
        var html = '<div class="label">&nbsp;</div><div class="value">';
        if (urls.gpx) {
            html += '<a href="' + urls.gpx + '" download="brouter.gpx" target="_blank">GPX</a> &middot; ';
            html += '<a href="' + urls.kml + '" download="brouter.kml" target="_blank">KML</a>';
        }
        html += '</div>'
        this._content.innerHTML = html;
    }
});
