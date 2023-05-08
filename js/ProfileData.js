/* Central storage for the currently selected profile.
 *
 * Idea is to collect all state concerning profile here without beeing tied to
 * a specific UI element.
 *
 * The current profile is serialized as a profile ID or as an URL.
 * 1) profile ID: like the profile name on the server
 * 2) As URL "bw:<id>?opt=value": Default profile with user defined options
 * 3) As URL "http://example.com/profile.brf?opt=value": Profile stored on external location
 *     possibly with user defined options
 *     TODO: NYI
 * 4) As URL "bwl:local": Marks a manually user edited profile.
 *     The last state of this is stored an can be accessed again
 *     TODO: NYI
 */
BR.ProfileData = L.Evented.extend({
    // Currently active profile name/id for backend Request
    // Possible values:
    // - any known profile name for backend
    // - L.BRouter.CUSTOM_PREFIX - not-yet-uploaded custom profile
    // - L.BRouter.CUSTOM_PREFIX+_1234 - uploaded custom profile
    id: '',
    // Original profile name/id before user made custom changes
    // Or URL of external Profile
    baseId: '',
    // Options the user changed in the profile (query-string)
    options: '',
    // Profile is unchanged
    isDefault: false,
    // Profile is loaded from external URL
    isExternal: false,

    // SourceCode of current profile. Private!
    _profileText: '',

    _lastInput: false,

    initialize: function () {
        this.selectProfile(null);
    },

    /** Set selected Profile */
    selectProfile: function (input) {
        if (this._lastInput === input) {
            // break event loops
            return;
        } else if (input === null) {
            // set default
            input = BR.conf.profiles[0];
        }
        // assert input
        if (typeof input !== 'string') {
            throw new TypeError('Invalid argument');
        }
        this._lastInput = input;
        try {
            this._parseProfileName(input);
        } catch (e) {
            console.error('Invalid Profile. Reset to Default', e, input);
            this._parseProfileName(BR.conf.profiles[0]);
        }
        this.fire('changed');
    },

    _parseProfileName: function (input) {
        if (BR.conf.profilesRename?.[input]) {
            input = BR.conf.profilesRename[input];
        }
        this.isDefault = BR.conf.profiles.includes(input);
        this.isExternal = false;
        if (this.isDefault) {
            this.id = this.baseId = input;
            this.options = '';
        } else {
            let url = new URL(input);

            // split hash and url
            this.options = url.search;
            url.search = '';

            if (url.protocol === 'bw:') {
                // default profile with custom options
                if (BR.conf.profiles.includes(url.pathname)) {
                    this.baseId = url.pathname;
                    if (this.options) {
                        this.id = L.BRouter.CUSTOM_PREFIX;
                    } else {
                        this.id = this.baseId;
                        this.isDefault = true;
                    }
                } else {
                    throw new Error(`Profile ${url.pathname} not known in Config`);
                }
            } else {
                // external profile
                this.id = L.BRouter.CUSTOM_PREFIX;
                this.baseId = url.href;
                this.isExternal = true;
            }
        }
    },

    // create profile= argument for URL Hash (not yet escaped)
    toProfileName: function () {
        let val;
        if (this.isDefault) {
            val = this.id;
        } else if (!this.isExternal) {
            const url = new URL(`bw:${this.baseId}`);
            url.search = this.options;
            val = url.toString();
        } else {
            // External profile
            const url = new URL(this.baseId);
            url.search = this.options;
            val = url.toString();
        }
        return val;
    },

    setCustom: function (id) {
        if (this.id === this.baseId) {
            this.id = id;
            this.isDefault = false;
        }
    },

    setOption: function (option, value) {
        this.setCustom(L.BRouter.CUSTOM_PREFIX);
        let tmp = new URLSearchParams(this.options); // eslint-disable-line compat/compat
        tmp.set(option, value);
        this.options = tmp.toString();
    },

    setOptions: function (options) {
        for (const [option, value] of Object.entries(options)) {
            this.setOption(option, value);
        }
    },

    getOptions: function () {
        let tmp = new URLSearchParams(this.options); // eslint-disable-line compat/compat
        let res = {};
        for (const [key, value] of tmp.entries()) {
            res[key] = value;
        }
        return res;
    },

    isInitialProfile: function () {
        return this.id === BR.conf.profiles[0];
    },
});
