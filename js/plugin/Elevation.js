BR.Elevation = L.Control.Elevation.extend({
    options: {
        position: "leftpane",
        width: 385,
        margins: {
            top: 20,
            right: 30,
            bottom: 30,
            left: 60
        },
        theme: "steelblue-theme" //purple
    },

    update: function(track, layer) {
        this.clear();

        // bring height indicator to front, because of track casing in BR.Routing
        if (this._mouseHeightFocus) {
            var g = this._mouseHeightFocus[0][0].parentNode;
            g.parentNode.appendChild(g);
        }

        if (track && track.getLatLngs().length > 0) {
            // TODO disabled track layer mouseover, as it doesn't really work 
            // with line marker and indicator does not get removed (no mouseout?)
            //this.addData(track.toGeoJSON(), layer);
            this.addData(track.toGeoJSON());
        }
    }
});