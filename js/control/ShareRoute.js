BR.ShareRoute = L.Class.extend({
    options: {
        services: {
            mastodon: true,
        },
        shortcut: {
            share_action: 65, // char code for 'a' ("action")
        },
    },

    initialize: function () {
        L.DomUtil.get('shareButton').onclick = L.bind(this.share, this);
        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
    },

    share: function (event) {
        event.preventDefault();
        this.services();
        this.qrcode();
    },

    services: function () {
        const self = this;

        $('.share-copy-link').on('click', function () {
            navigator.clipboard.writeText(self.getShareUrl());
        });

        $('a.share-service').each(function () {
            $(this).attr('href', $(this).attr('href').replace('{url}', encodeURIComponent(self.getShareUrl())));
        });

        if (this.options.services.mastodon === true) {
            let storedMastodonInstance;
            if (BR.Util.localStorageAvailable()) {
                storedMastodonInstance = localStorage.getItem('share/mastodonInstance');
            }
            $('.share-service-mastodon')
                .removeAttr('hidden')
                .on('click', function () {
                    let mastodonServer = window.prompt(
                        i18next.t('share.mastodon-enter-server-name'),
                        storedMastodonInstance ?? 'mastodon.social'
                    );

                    if (mastodonServer.indexOf('http') !== 0) {
                        mastodonServer = 'https://' + mastodonServer;
                    }

                    if (BR.Util.localStorageAvailable()) {
                        try {
                            localStorage.setItem('share/mastodonInstance', new URL(mastodonServer).hostname);
                        } catch (exception) {
                            console.error('Cannot store Mastodon instance', exception);
                        }
                    }

                    window.open(mastodonServer + '/share?text=' + encodeURIComponent(self.getShareUrl()), '_blank');
                });
        }
    },

    /**
     * Renders QR Code for the current route:
     *
     * - add query parameter `?export=dialog` to the current URL
     * - displays QR Code for that URL in the dialog, size is automatically adjusted
     *   to the length of the URL
     * - displays buttons to change the size of the QR Code (small, medium, large)
     */
    qrcode: function () {
        const exportUrl = this.createQrCodeUrl();

        this.renderQrCode('share-qrcode-img', exportUrl, this.getQrCodeSizeForUrl(exportUrl));

        $('.qrcode-size-button').on('click', { shareRoute: this, url: exportUrl }, function (event) {
            event.data.shareRoute.renderQrCode('share-qrcode-img', event.data.url, $(this).data('qrcodeSize'));
        });
    },

    getQrCodeSizeForUrl: function (url) {
        if (url.length < 500) {
            return 256;
        }

        if (url.length < 1700) {
            return 384;
        }

        return 512;
    },

    renderQrCode: function (elementId, url, size) {
        $('#share-qrcode-img').empty();
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
            $('#share-qrcode-img').empty();
            $('#qrcode-buttons').hide();
            if (exception.message === 'Too long data') {
                $('#qrcode-msg-too-long').show();

                return;
            }

            console.error('Cannot create QR Code', exception);
            $('#qrcode-msg-unknown-error').show();
        }
    },

    createQrCodeUrl: function () {
        // We work on a copy of the current location instance to avoid
        // reloading the page (which will happen when the `export` query
        // parameter is added to the actual location object):
        const exportLocation = new URL(document.location.href);
        const searchParams = new URLSearchParams(exportLocation.search);

        // We've to provide a value to the query parameter here, because
        // URLSearchParams uses a list of tuples internally where the
        // value part of such a tuple isn't optional. For now the value
        // is 'dialog', but it's possible to add support for other values
        // later, e.g. for starting a download directly after opening the link:
        searchParams.set('export', 'dialog');
        exportLocation.search = searchParams.toString();

        return exportLocation.toString();
    },

    getShareUrl: function () {
        const exportLocation = new URL(document.location.href);
        const searchParams = new URLSearchParams(exportLocation.search);
        searchParams.delete('export');
        exportLocation.search = searchParams.toString();

        return exportLocation.toString();
    },

    _keydownListener: function (event) {
        if (
            BR.Util.keyboardShortcutsAllowed(event) &&
            event.keyCode === this.options.shortcut.share_action &&
            !$('#shareButton').hasClass('disabled')
        ) {
            $('#share-dialog').modal('show');
            this.share(event);
        }
    },
});
