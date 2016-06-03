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
        var tabs = this.options.tabs;

        for (var key in tabs) {
            $('<li><a href="' + key + '" role="tab">' + tabs[key].options.heading + '</a></li>').appendTo('#tab');

            if (tabs[key].onAdd) {
                tabs[key].onAdd(map);
            }
        }

        $('#tab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        // e.target = activated tab
        // e.relatedTarget = previous tab
        $('#tab a').on('shown.bs.tab', L.bind(function (e) {
            var tab = this.options.tabs[e.target.hash],
                prevTab = e.relatedTarget ? this.options.tabs[e.relatedTarget.hash] : null;

            if (tab && tab.show) {
                tab.show();
            }
            if (prevTab && prevTab.hide) {
                prevTab.hide();
            }
        }, this));

        // activate first tab (instead of setting 'active' class in html)
        $('#tab li:not(.hidden) a:first').tab('show');

        return BR.Control.prototype.onAdd.call(this, map);
    }
});
