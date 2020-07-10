BR.TrackStats = L.Class.extend({
    update: function(polyline, segments) {
        if (segments.length == 0) {
            $('#stats-container').hide();
            $('#stats-info').show();
            return;
        }

        $('#stats-container').show();
        $('#stats-info').hide();

        var stats = this.calcStats(polyline, segments),
            length1 = L.Util.formatNum(stats.trackLength / 1000, 1).toLocaleString(),
            length3 = L.Util.formatNum(stats.trackLength / 1000, 3).toLocaleString(undefined, {
                minimumFractionDigits: 3
            }),
            formattedAscend = stats.filteredAscend.toLocaleString(),
            formattedPlainAscend = stats.plainAscend.toLocaleString(),
            formattedCost = stats.cost.toLocaleString(),
            meanCostFactor = stats.trackLength
                ? L.Util.formatNum(stats.cost / stats.trackLength, 2).toLocaleString()
                : '0',
            formattedTime =
                Math.trunc(stats.totalTime / 3600) + ':' + ('0' + Math.trunc((stats.totalTime % 3600) / 60)).slice(-2),
            formattedEnergy = L.Util.formatNum(stats.totalEnergy / 3600000, 2).toLocaleString(),
            meanEnergy = stats.trackLength
                ? L.Util.formatNum(stats.totalEnergy / 36 / stats.trackLength, 2).toLocaleString()
                : '0';

        $('#distance').html(length1);
        // alternative 3-digit format down to meters as tooltip
        $('#distance').attr('title', length3 + ' km');
        $('#ascend').html(formattedAscend);
        $('#plainascend').html(formattedPlainAscend);
        $('#cost').html(formattedCost);
        $('#meancostfactor').html(meanCostFactor);
        $('#totaltime').html(formattedTime);
        $('#totalenergy').html(formattedEnergy);
        $('#meanenergy').html(meanEnergy);
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
