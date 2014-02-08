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

    update: function(track) {
        this.clear();
        if (track && track.getLatLngs().length > 0) {
            this.addData(track);
        }
    }
});