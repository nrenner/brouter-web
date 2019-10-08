BR.Profile = L.Evented.extend({
    cache: {},

    initialize: function() {
        var textArea = L.DomUtil.get('profile_upload');
        this.editor = CodeMirror.fromTextArea(textArea, {
            lineNumbers: true
        });

        var that = this;
        L.DomUtil.get('profile_advanced').addEventListener('click', function() {
            that._toggleAdvanced();
        });
        L.DomUtil.get('profile_basic').addEventListener('click', function() {
            that._toggleAdvanced();
        });

        L.DomUtil.get('save').onclick = L.bind(this._save, this);
        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);

        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this._setValue('');

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profileUrl,
            empty = !this.editor.getValue(),
            clean = this.editor.isClean();

        if (profileName && BR.conf.profilesUrl && (empty || clean)) {
            this.profileName = profileName;
            if (!(profileName in this.cache)) {
                profileUrl = BR.conf.profilesUrl + profileName + '.brf';
                BR.Util.get(
                    profileUrl,
                    L.bind(function(err, profileText) {
                        if (err) {
                            console.warn('Error getting profile from "' + profileUrl + '": ' + err);
                            return;
                        }

                        this.cache[profileName] = profileText;

                        // don't set when option has changed while loading
                        if (!this.profileName || this.profileName === profileName) {
                            this._setValue(profileText);
                        }
                    }, this)
                );
            } else {
                this._setValue(this.cache[profileName]);
            }
        }
    },

    show: function() {
        this.editor.refresh();
    },

    onResize: function() {
        this.editor.refresh();
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.editor.getValue();

        this.message.hide();
        $(button).button('uploading');
        evt.preventDefault();

        var that = this;
        this.fire('update', {
            profileText: profile,
            callback: function(err, profileId, profileText) {
                $(button).button('reset');
                $(button).blur();
                if (!err) {
                    that.cache[profileId] = profileText;
                }
            }
        });
    },

    _buildCustomProfile: function() {
        var profileText = this.cache[this.profileName];
        document.querySelectorAll('#profile_params input, #profile_params select').forEach(function(input) {
            var name = input.name;
            var value;
            if (input.type == 'checkbox') {
                value = input.checked;
            } else {
                value = input.value;
            }

            var re = new RegExp(
                '(assign\\s*' +
                    name +
                    '\\s*=?\\s*)([\\w.]*)(\\s*#\\s*%(.*)%\\s*(\\|\\s*(.*)\\s*\\|\\s*(.*)\\s*)?[\\r\\n])'
            );
            profileText = profileText.replace(re, function(match, p1, p2, p3) {
                return p1 + value + p3;
            });
        });
        return profileText;
    },

    _save: function(evt) {
        var profileText = this._buildCustomProfile();
        var that = this;
        this.fire('update', {
            profileText: profileText,
            callback: function(err, profileId, profileText) {
                if (!err) {
                    that.cache[profileId] = profileText;
                }
            }
        });
    },

    _setValue: function(profileText) {
        if (L.DomUtil.get('profile_editor').style.display == 'flex') {
            // Set value of the full editor and exit
            this.editor.setValue(profileText);
            this.editor.markClean();
            return;
        }

        // Otherwise, create user friendly form
        var global = profileText.split('---context:').filter(function(e) {
            return e.startsWith('global');
        });
        if (global) {
            // Remove ---context:global line
            global = global[0].split('\n').slice(1);

            // Comment is mandatory
            var assignRegex = /assign\s*(\w*)\s*=?\s*([\w\.]*)\s*#\s*%(.*)%\s*(\|\s*(.*)\s*\|\s*(.*)\s*)?$/;
            var params = {};
            global.forEach(function(item) {
                var match = item.match(assignRegex);
                var value;
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
                            .forEach(function(option) {
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
                        possible_values: paramValues
                    };
                }
            });
        }
        var paramsSection = L.DomUtil.get('profile_params');
        paramsSection.innerHTML = '';

        if (!Object.keys(params).length) {
            paramsSection.append(i18next.t('sidebar.profile.no_easy_configuration_warning'));
        }

        Object.keys(params).forEach(function(param) {
            var div = document.createElement('div');
            var label = document.createElement('label');

            var paramType = params[param].type;
            var paramName = i18next.exists('profileParameters.' + param + '.name')
                ? i18next.t('profileParameters.' + param + '.name')
                : param;
            if (paramType == 'select') {
                var select = document.createElement('select');
                select.name = paramName;
                select.className = 'form-control';
                label.htmlFor = select.id = 'customize-profile-' + paramName;

                var paramValues = params[param].possible_values;
                Object.keys(paramValues).forEach(function(paramValue) {
                    var option = document.createElement('option');
                    option.value = paramValue;
                    option.append(paramValues[paramValue]);
                    select.appendChild(option);
                });

                label.append(paramName);
                div.appendChild(label);
                div.appendChild(select);
            } else {
                var input = document.createElement('input');
                input.name = paramName;
                label.htmlFor = input.id = 'customize-profile-' + paramName;
                if (paramType == 'number') {
                    input.type = 'number';
                    input.value = params[param].value;
                    input.className = 'form-control';

                    label.append(paramName);
                    div.appendChild(label);
                    div.appendChild(input);
                    div.className = 'form-group';
                } else if (paramType == 'boolean') {
                    input.type = 'checkbox';
                    input.checked = params[param].value;

                    div.appendChild(input);
                    label.append(paramName);
                    div.appendChild(label);
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

    _toggleAdvanced: function() {
        if (L.DomUtil.get('profile_editor').style.display == 'flex') {
            L.DomUtil.get('profile_params_container').style.display = 'initial';
            L.DomUtil.get('profile_editor').style.display = 'none';
            this._setValue(this.editor.getValue());
        } else {
            L.DomUtil.get('profile_params_container').style.display = 'none';
            L.DomUtil.get('profile_editor').style.display = 'flex';
            this._setValue(this._buildCustomProfile());
        }
    }
});
