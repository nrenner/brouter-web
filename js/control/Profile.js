BR.Profile = BR.Control.extend({
	  options: {
        heading: ''
    },

    onAdd: function (map) {
        var container = BR.Control.prototype.onAdd.call(this, map);
        container.innerHTML = "&nbsp;";
        return container;
    }
});
