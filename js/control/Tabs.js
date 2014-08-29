BR.Tabs = BR.Control.extend({
    options: {
        divId: 'tabs_div'
    },

    onAdd: function (map) {
        $('#tab a').click(function (e) {
          e.preventDefault();
          $(this).tab('show');
        });

        return BR.Control.prototype.onAdd.call(this, map);
    }
});
