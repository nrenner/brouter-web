BR.TrackStats = L.Class.extend({
    update: function (polyline, segments) {
        var stats = this.calcStats(polyline, segments),
            length1 = L.Util.formatNum(stats.trackLength/1000,1),
            length3 = L.Util.formatNum(stats.trackLength/1000,3),
            meanCostFactor = stats.trackLength ? L.Util.formatNum(stats.cost / stats.trackLength, 2) : '',
            formattedTime = L.Util.formatNum(stats.totalTime / 60., 1),
            formattedEnergy = L.Util.formatNum(stats.totalEnergy / 3600000., 2),
            meanEnergy = stats.trackLength ? L.Util.formatNum(stats.totalEnergy / 36. / stats.trackLength, 2) : '';

        $('#distance').html(length1 + ' <abbr title="kilometer">km</abbr>');
        $('#ascend').html(stats.filteredAscend + ' (' + stats.plainAscend +')' + ' <abbr title="meter">m</abbr>');
        $('#cost').html(stats.cost + ' (' + meanCostFactor + ')');
        $('#totaltime').html(formattedTime + ' <abbr title="minutes">min</abbr>');
        $('#totalenergy').html(formattedEnergy + ' (' + meanEnergy +') kWh');

        document.getElementById('totaltime').parentElement.hidden = !stats.totalTime;
        document.getElementById('totalenergy').parentElement.hidden = !stats.totalEnergy;
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
