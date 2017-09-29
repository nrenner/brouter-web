BR.TrackStats = BR.Control.extend({
	  options: {
        heading: 'Route'
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        this.update();
        return container;
    },

    update: function (polyline, segments) {
        var stats = this.calcStats(polyline, segments),
            length1 = L.Util.formatNum(stats.trackLength/1000,1),
            length3 = L.Util.formatNum(stats.trackLength/1000,3),
            meanCostFactor = stats.trackLength ? L.Util.formatNum(stats.cost / stats.trackLength, 2) : '',
            formattedTime = L.Util.formatNum(stats.totalTime / 60., 1),
            formattedEnergy = L.Util.formatNum(stats.totalEnergy / 3600000., 2),
            meanEnergy = stats.trackLength ? L.Util.formatNum(stats.totalEnergy / 36. / stats.trackLength, 2) : '',
            html = '';

        html += '<table id="stats">';
        html += '<tr><td>Length: </td><td title="' + length3 + ' km">' + length1 + '</td><td>km</td></tr>';
        if ( stats.totalTime )
        {
          html += '<tr><td>Time:</td><td>' + formattedTime + '</td><td>min</td></tr>';
          html += '<tr><td>Energy:</td><td>' + formattedEnergy + '</td><td>kWh</td><td><small>&nbsp;(mean: ' + meanEnergy + ')</small></td></tr>';
          html += '<tr><td>Ascent:</td><td>' + stats.filteredAscend + '</td><td>m</td><td><small>&nbsp;(plain: ' + stats.plainAscend + ')</small></td></tr>';
          html += '<tr><td>Cost: </td><td>' + stats.cost + '</td><td></td><td><small>&nbsp;(mean: ' + meanCostFactor + ')</small></td></tr>';
        }
        else
        {
          html += '<tr><td>Ascent filtered:</td><td>' + stats.filteredAscend + '</td><td>m</td></tr>';
          html += '<tr><td>Ascent plain:</td><td>' + stats.plainAscend + '</td><td>m</td></tr>';
          html += '<tr><td>Cost: </td><td>' + stats.cost + '</td><td></td></tr>';
          html += '<tr><td>Mean cost:</td><td>' + meanCostFactor + '</td><td></td></tr>';
        }
        html += '</table>'; 

        this._content.innerHTML = html;
    },

    calcStats: function(polyline, segments) {
        var stats = {
            trackLength: 0,
            filteredAscend: 0,
            plainAscend: 0,
            totalTime: 0,
            totalEnergy: 0,
            cost: 0
        };
        var i, props;

        for (i = 0; segments && i < segments.length; i++) {
            props = segments[i].feature.properties;
            stats.trackLength += +props['track-length'];
            stats.filteredAscend += +props['filtered ascend'];
            stats.plainAscend += +props['plain-ascend'];
            stats.totalTime += +props['total-time'];
            stats.totalEnergy += +props['total-energy'];
            stats.cost += +props['cost'];
        }

        return stats;
    }
});
