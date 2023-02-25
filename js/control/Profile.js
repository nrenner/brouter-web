BR.Profile = L.Evented.extend({
    cache: {},
    saveWarningShown: false,
    profileData: null,

    initialize: function (profileData) {
        this.profileData = profileData;
        var textArea = L.DomUtil.get('profile_upload');
        this.editor = CodeMirror.fromTextArea(textArea, {
            lineNumbers: true,
        });

        $('#profileEditorTabs a[data-toggle="tab"]').on(
            'shown.bs.tab',
            L.bind(function (e) {
                this._activateSecondaryTab();
            }, this)
        );

        L.DomUtil.get('save').onclick = L.bind(this._save, this);
        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);

        this.pinned = L.DomUtil.get('profile-pinned');

        this.message = new BR.Message('profile_message', {
            alert: true,
        });

        this.profileData.on('changed', () => {
            this.update();
        });
    },

    clear: function (evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();

        this.editor.markClean();
        this._setValue('');

        this.fire('clear');
        button.blur();
    },

    update: function (_, cb) {
        var profileName = this.profileData.id,
            profileUrl,
            loading = false;

        var profileNameBase = profileName;
        if (!this.profileData.isDefault) {
            profileNameBase = this.profileData.baseId;
        }

        if (profileName && BR.conf.profilesUrl) {
            this.selectedProfileName = profileName;

            if (!(profileNameBase in this.cache)) {
                if (this.profileData.isExternal) {
                    throw new Error('NYI');
                } else {
                    profileUrl = BR.conf.profilesUrl + profileNameBase + '.brf';
                }
                loading = true;
                BR.Util.get(
                    profileUrl,
                    L.bind(function (err, profileText) {
                        if (err) {
                            console.warn('Error getting profile from "' + profileUrl + '": ' + err);
                            if (cb) cb();
                            return;
                        }

                        this.cache[profileName] = profileText;

                        // don't set when option has changed while loading
                        if (!this.profileName || this.selectedProfileName === profileName) {
                            this._updateProfile(profileName, profileText);
                        }
                        if (cb) cb();
                    }, this)
                );
            } else {
                this._updateProfile(profileName, this.cache[profileNameBase]);
            }
        }

        if (cb && !loading) cb();
    },

    show: function () {
        this.editor.refresh();
    },

    onResize: function () {
        this.editor.refresh();
    },

    // Returns the initial value of the given profile variable as String, as defined by the assign statement.
    // Intended for all assigned variables, not just parameters with a comment declaration, i.e. no type information used.
    getProfileVar: function (name) {
        let value;
        if (this._isParamsFormActive()) {
            const formValues = this._getFormValues();
            if (formValues.hasOwnProperty(name)) {
                return formValues[name];
            }
        }

        const profileText = this._getSelectedProfileText();
        if (!profileText) return value;

        const regex = new RegExp(`assign\\s*${name}\\s*=?\\s*([\\w\\.]*)`);
        const match = profileText.match(regex);
        if (match) {
            value = match[1];
        }
        return value;
    },

    // Returns car|bike|foot, default is foot
    getTransportMode: function () {
        const isCar = !!this.getProfileVar('validForCars');
        const isBike = !!this.getProfileVar('validForBikes');
        return isCar ? 'car' : isBike ? 'bike' : 'foot';
    },

    _upload: function (evt) {
        var button = evt.target || evt.srcElement,
            profile = this._getProfileText();

        this.message.hide();
        evt.preventDefault();

        this.fire('update', {
            profileText: profile,
            callback: L.bind(function (err, profileId, profileText) {
                $(button).blur();
                if (!err) {
                    this.profileName = profileId;
                    this.cache[profileId] = profileText;

                    if (!this.saveWarningShown) {
                        this.message.showWarning(i18next.t('warning.temporary-profile'));
                        this.saveWarningShown = true;
                    }
                }
            }, this),
        });
    },

    _buildCustomProfile: function (profileText, formValues) {
        if (!formValues) {
            formValues = this._getFormValues();
        }
        Object.keys(formValues).forEach((name) => {
            const value = formValues[name];
            var re = new RegExp(
                '(assign\\s*' +
                    name +
                    '\\s*=?\\s*)([\\w.]*)(\\s*#\\s*%(.*)%\\s*(\\|\\s*(.*)\\s*\\|\\s*(.*)\\s*)?[\\r\\n])'
            );
            profileText = profileText.replace(re, function (match, p1, p2, p3) {
                return p1 + value + p3;
            });
        });
        return profileText;
    },

    _getFormValues: function () {
        const obj = {};
        document.querySelectorAll('#profile_params input, #profile_params select').forEach((input) => {
            const name = input.name;
            let value;
            if (input.type == 'checkbox') {
                value = input.checked;
            } else {
                value = input.value;
            }
            obj[name] = value;
        });
        return obj;
    },

    _save: function (evt) {
        var profileText = this._buildCustomProfile(this._getProfileText());
        this.profileData.setOptions(this.pendingOptions);
        this.pendingOptions = {};

        this.profileData._profileText = profileText;
        this.fire('update', {
            profileText: profileText,
            callback: (err, profileId, profileText) => {
                if (!err) {
                    this.profileName = profileId;
                    this.cache[profileId] = profileText;
                }
            },
        });
    },

    _updateProfile: function (profileName, profileText) {
        const empty = !this.editor.getValue();
        const clean = this.editor.isClean();
        this.pendingOptions = {};

        // apply current/initial options
        profileText = this._buildCustomProfile(profileText, this.profileData.getOptions());
        if (!this.profileData.isDefault) {
            // upload the profile to backend
            // TODO: Currently this happens twice during page load need to fix this
            this.fire('update', { profileText: profileText });
        }

        this.profileData._profileText = profileText;

        // only synchronize profile editor/parameters with selection if no manual changes in full editor,
        // else keep custom profile pinned - to prevent changes in another profile overwriting previous ones
        if (empty || clean) {
            this.profileName = profileName;
            this._setValue(profileText);

            if (!this.pinned.hidden) {
                this.pinned.hidden = true;
            }
        } else {
            if (this.pinned.hidden) {
                this.pinned.hidden = false;
            }
        }
    },

    _setValue: function (profileText) {
        profileText = profileText || '';

        var clean = this.editor.isClean();

        // Always set value of the full editor, even if not active.
        // Full editor is master, the parameter form always gets the text from it (not cache).
        this.editor.setValue(profileText);

        // keep dirty state (manually modified; setValue also sets dirty)
        if (clean) {
            this.editor.markClean();
        }

        if (this._isParamsFormActive()) {
            this._buildParamsForm(profileText);
        }
    },

    _buildParamsForm: function (profileText) {
        if (!profileText) return;

        // Otherwise, create user friendly form
        var params = {};
        var global = profileText.split('---context:').filter(function (e) {
            return e.startsWith('global');
        });
        if (global && global.length > 0) {
            // Remove ---context:global line
            global = global[0].split('\n').slice(1);

            // Comment is mandatory
            var assignRegex = /assign\s*(\w*)\s*=?\s*([\w\.]*)\s*#\s*%(.*)%\s*(\|\s*(.*)\s*\|\s*(.*)\s*)?$/;
            global.forEach(function (item) {
                var match = item.match(assignRegex);
                if (match) {
                    var name = match[1];
                    var value = match[2];
                    var description = match[5];

                    // Find out type
                    var paramType = match[6];
                    var paramValues = {};
                    if (paramType.match(/\[.*\]/)) {
                        paramType
                            .slice(1, -1)
                            .split(',')
                            .forEach(function (option) {
                                var splitOption = option.split('=');
                                var value = (splitOption[0] || '').replace(/^\s+|\s+$/g, '');
                                var description = (splitOption[1] || '').replace(/^\s+|\s+$/g, '');
                                paramValues[value] = description;
                            });
                        paramType = 'select';
                    }

                    // Type is missing, let's try to induce it from value
                    if (!paramType) {
                        if (value == 'true' || value == 'false') {
                            paramType = 'boolean';
                        } else {
                            paramType = 'number';
                        }
                    }

                    // Sanitize value according to type
                    if (paramType == 'boolean') {
                        value = value == 'true';
                    } else if (paramType == 'number') {
                        value = Number.parseFloat(value);
                        if (Number.isNaN(value)) {
                            return;
                        }
                    }

                    params[name] = {
                        description: description,
                        type: paramType,
                        value: value,
                        possible_values: paramValues,
                    };
                }
            });
        }
        var paramsSection = L.DomUtil.get('profile_params');
        paramsSection.innerHTML = '';

        if (!Object.keys(params).length) {
            paramsSection.append(i18next.t('sidebar.profile.no_easy_configuration_warning'));
        }

        Object.keys(params).forEach((param) => {
            var div = document.createElement('div');
            var label = document.createElement('label');

            var paramType = params[param].type;
            var paramName = i18next.exists('profileParameters.' + param + '.name')
                ? i18next.t('profileParameters.' + param + '.name')
                : param;
            if (paramType == 'select') {
                var select = document.createElement('select');
                select.name = paramName;
                select.className = 'form-control form-control-sm';
                label.htmlFor = select.id = 'customize-profile-' + paramName;

                var paramValues = params[param].possible_values;
                Object.keys(paramValues).forEach(function (paramValue) {
                    var option = document.createElement('option');
                    option.value = paramValue;
                    if (paramValue == params[param].value) {
                        option.selected = true;
                    }
                    option.append(paramValues[paramValue]);
                    select.appendChild(option);
                });

                label.append(paramName);
                div.appendChild(label);
                div.appendChild(select);
                $(select).on('change', () => {
                    this.pendingOptions[paramName] = $(select).val();
                });
            } else {
                var input = document.createElement('input');
                input.name = paramName;
                label.htmlFor = input.id = 'customize-profile-' + paramName;
                if (paramType == 'number') {
                    input.type = 'number';
                    input.value = params[param].value;
                    input.className = 'form-control form-control-sm';

                    label.append(paramName);
                    div.appendChild(label);
                    div.appendChild(input);
                    div.className = 'form-group';
                    $(input).on('change', () => {
                        this.pendingOptions[paramName] = $(input).val();
                    });
                } else if (paramType == 'boolean') {
                    input.type = 'checkbox';
                    input.checked = params[param].value;

                    div.appendChild(input);
                    label.append(paramName);
                    div.appendChild(label);
                    $(input).on('change', () => {
                        this.pendingOptions[paramName] = String($(input).is(':checked'));
                    });
                } else {
                    // Unknown parameter type, skip it
                    return;
                }
            }

            var helpBlock = document.createElement('p');
            var description = i18next.exists('profileParameters.' + param + '.description')
                ? i18next.t('profileParameters.' + param + '.description')
                : params[param].description.replace(/^\s+|\s+$/g, '');
            helpBlock.innerHTML = description;
            helpBlock.className = 'help-block';

            div.appendChild(helpBlock);
            paramsSection.appendChild(div);
        });
    },

    _isParamsFormActive: function () {
        return L.DomUtil.get('profile_params_container').classList.contains('active');
    },

    _activateSecondaryTab: function () {
        var profileText = this._getProfileText();

        if (this._isParamsFormActive()) {
            this._buildParamsForm(profileText);
        } else {
            this._setValue(this._buildCustomProfile(profileText));
        }
    },

    _getProfileText: function () {
        return this.editor.getValue();
    },

    _getSelectedProfileText: function () {
        return this.cache[this.selectedProfileName] ?? this.editor.getValue();
    },
});
