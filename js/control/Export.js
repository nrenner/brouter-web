BR.Export = L.Class.extend({
    latLngs: [],

    options: {
        shortcut: {
            export: 88, // char code for 'x'
        },
    },

    initialize: function (router, pois, circlego) {
        this.router = router;
        this.pois = pois;
        this.circlego = circlego;
        this.exportButton = $('#exportButton');
        var trackname = (this.trackname = document.getElementById('trackname'));
        this.tracknameAllowedChars = BR.conf.tracknameAllowedChars;

        if (this.tracknameAllowedChars) {
            this.tracknameMessage = document.getElementById('trackname-message');
            var patternRegex = new RegExp('[' + this.tracknameAllowedChars + ']+');

            // warn about special characters getting removed by server quick fix (#194)
            trackname.pattern = patternRegex.toString().slice(1, -1);
            trackname.addEventListener('input', L.bind(this._validationMessage, this));
        }

        this.exportButton.on('click', L.bind(this._generateTrackname, this));
        L.DomUtil.get('submitExport').onclick = L.bind(this._export, this);
        L.DomUtil.get('submitQRCode').onclick = L.bind(this._qrcode, this);

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        this.update([]);
    },

    update: function (latLngs) {
        this.latLngs = latLngs;

        if (latLngs.length < 2) {
            this.exportButton.addClass('disabled');
        } else {
            this.exportButton.removeClass('disabled');
        }
    },

    _export: function (e) {
        var exportForm = document.forms['export'];
        var format = exportForm['format'].value || $('#export-format input:radio:checked').val();
        var name = encodeURIComponent(exportForm['trackname'].value);
        var includeWaypoints = exportForm['include-waypoints'].checked;

        var uri = this.router.getUrl(this.latLngs, this.pois.getMarkers(), null, format, name, includeWaypoints);

        e.preventDefault();

        var evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        var link = document.createElement('a');
        link.href = uri;
        link.dispatchEvent(evt);
    },

    /**
     * Renders QR Code for a direct link to the GPX export of the current route.
     *
     * - hides the export modal dialog (QR Code is shown in a new dialog)
     * - creates the GPX request URL for the BRouter engine
     * - renders the QR Code into the dialog
     */
    _qrcode: function (e) {
        e.preventDefault();

        $('#export').modal('toggle');

        var exportForm = document.forms['export'];

        var gpxUrl = this._fixQrCodeUrl(
            this.router.getUrl(
                this.latLngs,
                this.pois.getMarkers(),
                this.circlego ? this.circlego.getCircle() : null,
                'gpx',
                encodeURIComponent(exportForm['trackname'].value),
                exportForm['include-waypoints'].checked
            )
        );

        this._renderQrCode('qrcode-img', gpxUrl, this._getQrCodeSizeForUrl(gpxUrl));

        $('.qrcode-size-button').on('click', { export: this, url: gpxUrl }, function (event) {
            event.data.export._renderQrCode('qrcode-img', event.data.url, $(this).data('qrcodeSize'));
        });
    },

    /**
     * Replaces BRouter engine URL for local installations. Ensures HTTPS is used for brouter.de URLs.
     *
     * @param url
     */
    _fixQrCodeUrl: function (url) {
        if (url.indexOf('http://brouter.de') === 0) {
            return url.replace('http://', 'https://');
        }

        if (url.indexOf('//localhost') === -1) {
            return url;
        }

        return 'https://brouter.de/brouter?' + url.split('?')[1];
    },

    _getQrCodeSizeForUrl: function (url) {
        if (url.length < 500) {
            return 256;
        }

        if (url.length < 1700) {
            return 384;
        }

        return 512;
    },

    _renderQrCode: function (elementId, url, size) {
        $('#qrcode-img').empty();
        $('#qrcode-buttons').show();
        $('#qrcode-msg-unknown-error').hide();
        $('#qrcode-msg-too-long').hide();

        try {
            new QRCode(document.getElementById(elementId), {
                text: url,
                width: size,
                height: size,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M,
            });
        } catch (exception) {
            $('#qrcode-img').empty();
            $('#qrcode-buttons').hide();
            if (exception.message === 'Too long data') {
                $('#qrcode-msg-too-long').show();

                return;
            }

            console.error('Cannot create QR Code', exception);
            $('#qrcode-msg-unknown-error').show();
        }
    },

    _validationMessage: function () {
        var trackname = this.trackname;
        var replaceRegex = new RegExp('[^' + this.tracknameAllowedChars + ']', 'g');

        if (trackname.validity.patternMismatch) {
            var replaced = trackname.value.replace(replaceRegex, '');
            var patternStr = this.tracknameAllowedChars.replace(/\\/g, '');
            this.tracknameMessage.textContent = '[' + patternStr + '] --> ' + replaced;
        } else {
            this.tracknameMessage.textContent = '';
        }
    },

    _generateTrackname: function () {
        var trackname = this.trackname;
        this._getCityAtPosition(
            this.latLngs[0],
            L.bind(function (from) {
                this._getCityAtPosition(
                    this.latLngs[this.latLngs.length - 1],
                    L.bind(function (to) {
                        var distance = document.getElementById('distance').innerHTML;
                        if (this.tracknameAllowedChars) {
                            distance = distance.replace(',', '.'); // temp. fix (#202)
                        }
                        if (!from || !to) {
                            trackname.value = null;
                        } else if (from === to) {
                            trackname.value = i18next.t('export.route-loop', {
                                from: from,
                                distance: distance,
                            });
                        } else {
                            trackname.value = i18next.t('export.route-from-to', {
                                from: from,
                                to: to,
                                distance: distance,
                            });
                        }

                        if (this.tracknameAllowedChars) {
                            // temp. fix: replace and remove characters that will get removed by server quick fix (#194)
                            trackname.value = trackname.value.replace(/[>)]/g, '').replace(/ \(/g, ' - ');
                            this._validationMessage();
                        }
                    }, this)
                );
            }, this)
        );
    },

    _getCityAtPosition: function (lonlat, cb) {
        var url = L.Util.template(
            'https://nominatim.openstreetmap.org/reverse?lon={lng}&lat={lat}&format=json',
            lonlat
        );
        BR.Util.get(
            url,
            L.bind(function (err, response) {
                try {
                    var addr = JSON.parse(response).address;
                    cb(addr.village || addr.town || addr.hamlet || addr.city_district || addr.city);
                } catch (err) {
                    BR.message.showError('Error getting position city "' + lonlat + '": ' + err);
                    return cb(null);
                }
            })
        );
    },

    _keydownListener: function (e) {
        if (
            BR.Util.keyboardShortcutsAllowed(e) &&
            e.keyCode === this.options.shortcut.export &&
            !this.exportButton.hasClass('disabled')
        ) {
            this._generateTrackname();
            $('#export').modal('show');
        }
    },
});

BR.export = function () {
    return new BR.Export();
};
