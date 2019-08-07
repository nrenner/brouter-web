BR.Elevation = L.Control.Elevation.extend({
    options: {
        width: $('#map').outerWidth(),
        margins: {
            top: 20,
            right: 30,
            bottom: 30,
            left: 60
        },
        theme: 'steelblue-theme'
    },

    onAdd: function(map) {
        var container = L.Control.Elevation.prototype.onAdd.call(this, map);

        // revert registering touch events when touch screen detection is available and negative
        // see https://github.com/MrMufflon/Leaflet.Elevation/issues/67
        if (L.Browser.touch && BR.Browser.touchScreenDetectable && !BR.Browser.touchScreen) {
            this._background
                .on('touchmove.drag', null)
                .on('touchstart.drag', null)
                .on('touchstart.focus', null);
            L.DomEvent.off(this._container, 'touchend', this._dragEndHandler, this);

            this._background
                .on('mousemove.focus', this._mousemoveHandler.bind(this))
                .on('mouseout.focus', this._mouseoutHandler.bind(this))
                .on('mousedown.drag', this._dragStartHandler.bind(this))
                .on('mousemove.drag', this._dragHandler.bind(this));
            L.DomEvent.on(this._container, 'mouseup', this._dragEndHandler, this);
        }

        return container;
    },

    addBelow: function(map) {
        // waiting for https://github.com/MrMufflon/Leaflet.Elevation/pull/66
        // this.width($('#map').outerWidth());
        this.options.width = $('#content').outerWidth();

        if (this.getContainer() != null) {
            this.remove(map);
        }

        function setParent(el, newParent) {
            newParent.appendChild(el);
        }
        this.addTo(map);
        // move elevation graph outside of the map
        setParent(this.getContainer(), document.getElementById('elevation-chart'));
    },

    update: function(track, layer) {
        this.clear();

        // bring height indicator to front, because of track casing in BR.Routing
        if (this._mouseHeightFocus) {
            var g = this._mouseHeightFocus[0][0].parentNode;
            g.parentNode.appendChild(g);
        }

        if (track && track.getLatLngs().length > 0) {
            this.addData(track.toGeoJSON(), layer);

            layer.on('mouseout', this._hidePositionMarker.bind(this));
        }
    }
});
