BR.Tabs = BR.Control.extend({
    options: {
        divId: 'tabs_div',
        // tab a.hash > instance
        tabs: {}
    },

    initialize: function (options) {
        L.setOptions(this, options);
    },

    onAdd: function (map) {
        $('#tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        // e.target = activated tab
        // e.relatedTarget = previous tab
        $('#tab a').on('shown.bs.tab', L.bind(function (e) {
            var tab = this.options.tabs[e.target.hash],
                prevTab = this.options.tabs[e.relatedTarget.hash];

            if (tab && tab.show) {
                tab.show();
            }
            if (prevTab && prevTab.hide) {
                prevTab.hide();
            }
        }, this));

        return BR.Control.prototype.onAdd.call(this, map);
    }
});
