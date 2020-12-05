BR.OpacitySliderControl = L.Control.extend({
    options: {
        position: 'topleft',
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar control-slider');

        // prevent also dragging map in Chrome
        L.DomEvent.disableClickPropagation(container);

        // migrate legacy value
        if (BR.Util.localStorageAvailable()) {
            var value = localStorage.getItem('opacitySliderValue');
            if (value !== null) {
                localStorage.setItem('opacitySliderValue' + this.options.id, value);
                localStorage.removeItem('opacitySliderValue');
            }
        }

        var slider = new BR.OpacitySlider(this.options);
        container.appendChild(slider.getElement());

        var stopClickAfterSlide = function (evt) {
            L.DomEvent.stop(evt);
            removeStopClickListeners();
        };

        var removeStopClickListeners = function () {
            document.removeEventListener('click', stopClickAfterSlide, true);
            document.removeEventListener('mousedown', removeStopClickListeners, true);
        };

        slider.input
            .on('slideStart', function (evt) {
                // dragging beyond slider control selects zoom control +/- text in Firefox
                L.DomUtil.disableTextSelection();
            })
            .on('slideStop', { self: this }, function (evt) {
                L.DomUtil.enableTextSelection();

                // When dragging outside slider and over map, click event after mouseup
                // adds marker when active on Chromium. So disable click (not needed)
                // once after sliding.
                document.addEventListener('click', stopClickAfterSlide, true);
                // Firefox does not fire click event in this case, so make sure stop listener
                // is always removed on next mousedown.
                document.addEventListener('mousedown', removeStopClickListeners, true);
            });

        return container;
    },
});
