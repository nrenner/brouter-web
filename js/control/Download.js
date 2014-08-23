BR.Download = BR.Control.extend({
	  options: {
        heading: 'Download'
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        return container;
    },

    update: function (urls) {
        var html = '<div class="value">';
        if (urls.gpx) {
            html += '<a href="' + urls.gpx + '" download="brouter.gpx">GPX</a> &middot; ';
            html += '<a href="' + urls.kml + '" download="brouter.kml">KML</a> &middot; ';
            html += '<a href="' + urls.geojson + '" download="brouter.geojson">GeoJSON</a> &middot; ';
            html += '<a href="' + urls.csv + '" download="brouter.tsv">data CSV</a>';
        }
        html += '</div>';
        this._content.innerHTML = html;
    }
});
