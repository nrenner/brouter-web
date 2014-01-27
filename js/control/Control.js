BR.Control = L.Control.extend({
    options: {
        position: 'leftpane'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'info'),
            heading,
            div;

        if (this.options.heading) {
            heading = L.DomUtil.create('div', 'heading', container);
            heading.innerHTML = this.options.heading;
            this._content = L.DomUtil.create('div', 'content', container);
        } else {
            this._content = container;
        }

        if (this.options.divId) {
            div = L.DomUtil.get(this.options.divId);
            L.DomUtil.removeClass(div, 'hidden');
            this._content.appendChild(div);
        }

        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .on(container, 'click', stop)
            .on(container, 'mousedown', stop)
            .on(container, 'dblclick', stop);
        // disabled because links not working, remove?
        //L.DomEvent.on(container, 'click', L.DomEvent.preventDefault);

        return container;
    }
});


