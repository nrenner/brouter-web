BR.Sidebar = L.Control.Sidebar.extend({
    storageId: 'sidebar-control',

    options: {
        position: 'right',
        container: 'sidebar',
        tabContainer: 'sidebarTabs',
        autopan: false,
        defaultTabId: '',

        shortcut: {
            toggleTabs: 84 // char code for 't'
        },

        // Tabs to be notified when shown or hidden
        // (tab div id -> object implementing show/hide methods)
        listeningTabs: {}
    },

    initialize: function(id, options) {
        L.Control.Sidebar.prototype.initialize.call(this, id, options);

        this.oldTab = null;

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
    },

    addTo: function(map) {
        L.Control.Sidebar.prototype.addTo.call(this, map);

        this.on('content', this._notifyOnContent, this);
        this.on('closing', this._notifyOnClose, this);
        this.on('toggleExpand', this._notifyOnResize, this);

        this.on(
            'closing',
            function() {
                this._map.getContainer().focus();
            },
            this
        );

        this.recentTab = this.options.defaultTabId;
        this.on(
            'content',
            function(tab) {
                this.recentTab = tab.id;
            },
            this
        );

        this._rememberTabState();

        if (L.Browser.touch && BR.Browser.touchScreenDetectable && !BR.Browser.touchScreen) {
            L.DomUtil.removeClass(this._container, 'leaflet-touch');
            L.DomUtil.removeClass(this._tabContainer, 'leaflet-touch');
        }

        return this;
    },

    showPanel: function(id) {
        var tab = this._getTab(id);
        tab.hidden = false;

        return this;
    },

    _rememberTabState: function() {
        if (BR.Util.localStorageAvailable()) {
            this.on('content closing', this._storeActiveTab, this);

            var tabId = localStorage.getItem(this.storageId);

            // 'true': legacy value for toggling old sidebar
            if (tabId === 'true') {
                tabId = this.options.defaultTabId;
            } else if (tabId === null) {
                // not set: closed by default for new users
                tabId = '';
            }
            if (tabId !== '' && this._getTab(tabId)) {
                this.open(tabId);
            }
        }
    },

    _notifyShow: function(tab) {
        if (tab && tab.show) {
            tab.show();
        }
    },

    _notifyHide: function(tab) {
        if (tab && tab.hide) {
            tab.hide();
        }
    },

    _notifyOnContent: function(e) {
        var tab = this.options.listeningTabs[e.id];
        this._notifyHide(this.oldTab);
        this._notifyShow(tab);
        this.oldTab = tab;
    },

    _notifyOnClose: function(e) {
        this._notifyHide(this.oldTab);
        this.oldTab = null;
    },

    _notifyOnResize: function(e) {
        var tab = this.oldTab;
        if (tab && tab.onResize) {
            tab.onResize();
        }
    },

    _storeActiveTab: function(e) {
        localStorage.setItem(this.storageId, e.id || '');
    },

    _keydownListener: function(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.toggleTabs) {
            if ($('#sidebarTabs > ul > li[class=active]').length) {
                // sidebar is currently open, close current tab
                if (!e.shiftKey) {
                    this.close();
                }
            } else {
                // sidebar is currently closed, open recent or default tab
                this.open(this.recentTab);
            }
            if (e.shiftKey) {
                // try to find next tab
                var nextTab = $('#sidebarTabs > ul > li[class=active] ~ li:not([hidden]) > a');
                if (!nextTab.length) {
                    // wrap around to first tab
                    nextTab = $('#sidebarTabs > ul > li:not([hidden]) > a');
                }
                // switch to next or first tab
                this.open(nextTab.attr('href').slice(1));
            }
        }
    }
});

BR.sidebar = function(divId, options) {
    return new BR.Sidebar(divId, options);
};
