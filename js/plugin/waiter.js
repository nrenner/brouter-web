BR.Waiter = {
    opened: true,
    frames: ['◴', '◷', '◶', '◵'],
    frameDelay: 250,
    open: function (show_info) {
        if (show_info) {
            $('.modal .wait-info h4').text(show_info);
            $('.wait-info').show();
        } else {
            $('.wait-info').hide();
        }
        $('#loading-dialog').addClass('is-active');
        document.title = BR.Waiter.frames[0] + ' ' + BR.Waiter._initialTitle;
        var f = 0;
        BR.Waiter.interval = setInterval(
            function () {
                document.title =
                    (this.isAlert ? this.alertFrame : this.frames[++f % this.frames.length]) + ' ' + this._initialTitle;
            }.bind(BR.Waiter),
            BR.Waiter.frameDelay
        );
        BR.Waiter.opened = true;
    },
    close: function () {
        if (!BR.Waiter.opened) return;
        clearInterval(BR.Waiter.interval);
        document.title = BR.Waiter._initialTitle;
        $('#loading-dialog').removeClass('is-active');
        $('.wait-info ul li').remove();
        delete BR.Waiter.onAbort;
        BR.Waiter.opened = false;
    },
    addInfo: function (txt, abortCallback) {
        $('#aborter').remove(); // remove previously added abort button, which cannot be used anymore.
        $('.wait-info ul li:nth-child(n+1)').css('opacity', 0.5);
        $('.wait-info ul li span.fa').removeClass('fa-spinner').removeClass('fa-spin').addClass('fa-check');
        $('.wait-info ul li:nth-child(n+4)').hide();
        var li = $(
            '<li><span class="fa fa-spinner fa-spin" style="display:inline-block; margin-bottom:-2px; margin-right:3px;"></span>' +
                txt +
                '</li>'
        );

        if (typeof abortCallback == 'function') {
            BR.Waiter.onAbort = abortCallback;
            var aborter = $('<span id="aborter">&nbsp;(<a href="#">abort</a>)</span>').on('click', function () {
                BR.Waiter.abort();
                return false;
            });
            li.append(aborter);
        }
        $('.wait-info ul').prepend(li);
    },
    abort: function () {
        if (typeof BR.Waiter.onAbort == 'function') {
            BR.Waiter.addInfo('aborting');
            BR.Waiter.onAbort(BR.Waiter.close);
        }
    },
};

BR.Waiter.close();
