BR.Elevation = L.Control.Elevation.extend({
    options: {
        position: "leftpane",
        width: 385,
        margins: {
            top: 20,
            right: 20,
            bottom: 30,
            left: 50
        },
        theme: "steelblue-theme" //purple
    },

    clear: function() {
        this._data = [];
        this._dist = 0;
        this._maxElevation = 0;

        // workaround for 'Error: Problem parsing d=""' in Webkit when empty data
        // https://groups.google.com/d/msg/d3-js/7rFxpXKXFhI/HzIO_NPeDuMJ
        //this._areapath.datum(this._data).attr("d", this._area);
        this._areapath.attr("d", "M0 0");

        this._x.domain([0,1]);
        this._y.domain([0,1]);
        this._updateAxis();
    },

    update: function(track) {
        this.clear();
        if (track && track.getLatLngs().length > 0) {
            this.addData(track);
        }
    }
});