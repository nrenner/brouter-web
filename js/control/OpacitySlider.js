BR.OpacitySlider = L.Class.extend({
    options: {
        id: '',
        reversed: true,
        orientation: 'vertical',
        defaultValue: BR.conf.defaultOpacity,
        title: '',
        callback: function(opacity) {}
    },

    initialize: function(options) {
        L.setOptions(this, options);

        var input = (this.input = $('<input id="slider-' + this.options.id + '" type="text"/>')),
            item = BR.Util.localStorageAvailable() ? localStorage['opacitySliderValue' + this.options.id] : null,
            value = item ? parseInt(item) : this.options.defaultValue * 100,
            minOpacity = (BR.conf.minOpacity || 0) * 100;

        if (value < minOpacity) {
            value = minOpacity;
        }

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
            .on('slide slideStop', { self: this }, function(evt) {
                evt.data.self.options.callback(evt.value / 100);
            })
            .on('slideStop', { self: this }, function(evt) {
                if (BR.Util.localStorageAvailable()) {
                    localStorage['opacitySliderValue' + evt.data.self.options.id] = evt.value;
                }
            });

        this.getElement().title = this.options.title;

        this.options.callback(value / 100);

        if (this.options.muteKeyCode) {
            L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
            L.DomEvent.addListener(document, 'keyup', this._keyupListener, this);
        }
    },

    _keydownListener: function(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.muteKeyCode) {
            this.options.callback(0);
        }
    },

    _keyupListener: function(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.muteKeyCode) {
            this.options.callback(this.input.val() / 100);
        }
    },

    getElement: function() {
        return this.input.slider('getElement');
    }
});
