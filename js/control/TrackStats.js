BR.TrackStats = BR.Control.extend({
	  options: {
        heading: 'Route'
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        this.update();
        return container;
    },

    update: function (polyline) {
        var stats = this.calcStats(polyline),
            html = '';

        html += '<table id="stats">';
        html += '<tr><td>Length: </td><td>' +  L.Util.formatNum(stats.distance/1000,1) + '</td><td>km</td></tr>';
        html += '<tr><td>Ascent: </td><td>' + Math.round(stats.elevationGain) + '</td><td>m</td></tr>';
        html += '<tr><td>Descent: </td><td>' + Math.round(stats.elevationLoss) + '</td><td>m</td></tr>';
        html += '</table>'; 

        this._content.innerHTML = html;
    },

    calcStats: function(polyline) {
        var stats = {
            distance: 0,
            elevationGain: 0,
            elevationLoss: 0
        };

        var latLngs = polyline ? polyline.getLatLngs() : [];
        for (var i = 0, current, next, eleDiff; i < latLngs.length - 1; i++) {
            current = latLngs[i];
            next = latLngs[i + 1];
            stats.distance += current.distanceTo(next);

            // from Leaflet.gpx plugin (writes to LatLng.meta.ele, LatLng now supports ele)
            eleDiff = (next.ele || next.meta.ele) - (current.ele || current.meta.ele);
            if (eleDiff > 0) {
                stats.elevationGain += eleDiff;
            } else {
                stats.elevationLoss += Math.abs(eleDiff);
            }
        }
        
        return stats;
    }
});
