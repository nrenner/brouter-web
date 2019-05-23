BR.Export = L.Class.extend({
    latLngs: [],

    initialize: function(router) {
        this.router = router;
        this.exportButton = $('#exportButton');

        this.exportButton.on('click', L.bind(this._generateTrackname, this));
        L.DomUtil.get('submitExport').onclick = L.bind(this._export, this);

        this.update([]);
    },

    update: function(latLngs) {
        this.latLngs = latLngs;

        if (latLngs.length < 2) {
            this.exportButton.addClass('disabled');
        } else {
            this.exportButton.removeClass('disabled');
        }
    },

    _export: function() {
        var exportForm = document.forms['export'];
        var format = exportForm['format'].value;
        var name = encodeURIComponent(exportForm['trackname'].value);

        var uri = this.router.getUrl(this.latLngs, format, name);

        var evt = document.createEvent('MouseEvents');
        evt.initMouseEvent(
            'click',
            true,
            true,
            window,
            0,
            0,
            0,
            0,
            0,
            false,
            false,
            false,
            false,
            0,
            null
        );
        var link = document.createElement('a');
        link.download = name + '.' + format;
        link.href = uri;
        link.dispatchEvent(evt);
    },

    _generateTrackname: function() {
        var trackname = document.getElementById('trackname');
        this._getCityAtPosition(
            this.latLngs[0],
            L.bind(function(from) {
                this._getCityAtPosition(
                    this.latLngs[this.latLngs.length - 1],
                    L.bind(function(to) {
                        var distance = document.getElementById('distance')
                            .innerHTML;
                        if (!from || !to) {
                            trackname.value = null;
                        } else if (from === to) {
                            trackname.value = i18next.t('export.route-loop', {
                                from,
                                distance
                            });
                        } else {
                            trackname.value = i18next.t(
                                'export.route-from-to',
                                { from: from, to: to, distance: distance }
                            );
                        }
                    }, this)
                );
            }, this)
        );
    },

    _getCityAtPosition: function(lonlat, cb) {
        var url = L.Util.template(
            'https://nominatim.openstreetmap.org/reverse?lon={lng}&lat={lat}&format=json',
            lonlat
        );
        BR.Util.get(
            url,
            L.bind(function(err, response) {
                try {
                    var addr = JSON.parse(response).address;
                    cb(
                        addr.village ||
                            addr.town ||
                            addr.hamlet ||
                            addr.city_district ||
                            addr.city
                    );
                } catch (err) {
                    BR.message.showError(
                        'Error getting position city "' + lonlat + '": ' + err
                    );
                    return cb(null);
                }
            })
        );
    }
});

BR.export = function() {
    return new BR.Export();
};
