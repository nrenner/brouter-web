BR.OpacitySlider = L.Control.extend({
    options: {
        id: '',
        position: 'topleft',
        reversed: true,
        orientation: 'vertical',
        defaultValue: BR.conf.defaultOpacity,
        title: i18next.t('map.opacity-slider'),
        callback: function(opacity) {}
    },

    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-bar control-slider'),
            input = $(
                '<input id="slider-' + this.options.id + '" type="text"/>'
            ),
            item = BR.Util.localStorageAvailable()
                ? localStorage['opacitySliderValue' + this.options.id]
                : null,
            value = item ? parseInt(item) : this.options.defaultValue * 100,
            minOpacity = (BR.conf.minOpacity || 0) * 100;

        if (value < minOpacity) {
            value = minOpacity;
        }

        // prevent also dragging map in Chrome
        L.DomEvent.disableClickPropagation(container);

        var stopClickAfterSlide = function(evt) {
            L.DomEvent.stop(evt);
            removeStopClickListeners();
        };
        var removeStopClickListeners = function() {
            document.removeEventListener('click', stopClickAfterSlide, true);
            document.removeEventListener(
                'mousedown',
                removeStopClickListeners,
                true
            );
        };

        $(container).html(input);
        $(container).attr('title', this.options.title);

        input
            .slider({
                id: this.options.id,
                min: 0,
                max: 100,
                step: 1,
                value: value,
                orientation: this.options.orientation,
                reversed: this.options.reversed,
                selection: this.options.reversed ? 'before' : 'after', // inverted, serves as track style, see css
                tooltip: 'hide'
            })
            .on('slideStart', function(evt) {
                // dragging beyond slider control selects zoom control +/- text in Firefox
                L.DomUtil.disableTextSelection();
            })
            .on('slide slideStop', { self: this }, function(evt) {
                evt.data.self.options.callback(evt.value / 100);
            })
            .on('slideStop', { self: this }, function(evt) {
                if (BR.Util.localStorageAvailable()) {
                    localStorage[
                        'opacitySliderValue' + evt.data.self.options.id
                    ] = evt.value;
                }

                L.DomUtil.enableTextSelection();

                // When dragging outside slider and over map, click event after mouseup
                // adds marker when active on Chromium. So disable click (not needed)
                // once after sliding.
                document.addEventListener('click', stopClickAfterSlide, true);
                // Firefox does not fire click event in this case, so make sure stop listener
                // is always removed on next mousedown.
                document.addEventListener(
                    'mousedown',
                    removeStopClickListeners,
                    true
                );
            });

        this.options.callback(value / 100);

        return container;
    }
});
