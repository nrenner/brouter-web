BR.Sidebar = L.Control.Sidebar.extend({
    storageId: 'sidebar-control',

    options: {
        position: 'right',
        container: 'sidebar', 
        tabContainer: 'sidebarTabs',
        autopan: false,
        defaultTabId: '',

        // Tabs to be notified when shown or hidden
        // (tab div id -> object implementing show/hide methods)
        listeningTabs: {}
    },

    initialize: function (id, options) {
        L.Control.Sidebar.prototype.initialize.call(this, id, options);

        this.oldTab = null;
    },

    addTo: function (map) {
        L.Control.Sidebar.prototype.addTo.call(this, map);

        this.on('content', this._notifyOnContent, this);
        this.on('closing', this._notifyOnClose, this);

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

    _rememberTabState: function () {
        if (BR.Util.localStorageAvailable()) {
            this.on('content closing', this._storeActiveTab, this);

            var tabId = localStorage.getItem(this.storageId);
            
            // not set: open sidebar by default for new users
            // 'true': legacy value for toggling old sidebar
            if (tabId === null || tabId === 'true') {
                tabId = this.options.defaultTabId;
            }
            if (tabId !== '') {
                this.open(tabId);
            }
        }
    },

    _notifyShow: function (tab) {
        if (tab && tab.show) {
            tab.show();
        }
    },

    _notifyHide: function (tab) {
        if (tab && tab.hide) {
            tab.hide();
        }
    },

    _notifyOnContent: function (e) {
        var tab = this.options.listeningTabs[e.id];
        this._notifyHide(this.oldTab);
        this._notifyShow(tab);
        this.oldTab = tab;
    },
    
    _notifyOnClose: function (e) {
        this._notifyHide(this.oldTab);
        this.oldTab = null;
    },
    
    _storeActiveTab: function (e) {
        localStorage.setItem(this.storageId, e.id || '');
    }
});

BR.sidebar = function (divId, options) {
    return new BR.Sidebar(divId, options);
};
