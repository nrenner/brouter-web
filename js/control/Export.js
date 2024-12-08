BR.Export = L.Class.extend({
    latLngs: [],

    options: {
        shortcut: {
            export: 88, // char code for 'x'
        },
    },

    initialize(router, pois, profile) {
        this.router = router;
        this.pois = pois;
        this.profile = profile;
        this.exportButton = $('#exportButton');
        var trackname = (this.trackname = document.getElementById('trackname'));
        this.tracknameAllowedChars = BR.conf.tracknameAllowedChars;

        // a.download attribute automatically replaces invalid characters
        if (!BR.Browser.download && this.tracknameAllowedChars) {
            this.tracknameMessage = document.getElementById('trackname-message');
            var patternRegex = new RegExp('[' + this.tracknameAllowedChars + ']+');

            // warn about special characters getting removed by server quick fix (#194)
            trackname.pattern = patternRegex.toString().slice(1, -1);
            trackname.addEventListener('input', L.bind(this._validationMessage, this));
        }

        this.exportButton.on('click', L.bind(this._generateTrackname, this));
        L.DomUtil.get('submitExport').onclick = L.bind(this._export, this);
        L.DomUtil.get('serverExport').onclick = L.bind(this._exportServer, this);

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        $('#export').on('show.bs.modal', this._warnDownload.bind(this));
        $('#export input[name=format]').on('change', this._warnDownload.bind(this));
        $('#export').on('show.bs.modal', this._turnInstructionInfo.bind(this));

        this.update([]);
    },

    update(latLngs, segments) {
        this.latLngs = latLngs;
        this.segments = segments;

        if (latLngs.length < 2) {
            this.exportButton.addClass('disabled');
        } else {
            this.exportButton.removeClass('disabled');
        }
    },

    _warnDownload() {
        const hasBeeline = BR.Routing.hasBeeline(this.segments);
        const isFit = $('#format-fit').prop('checked');
        $('#export-download-warning').prop('hidden', !hasBeeline && !isFit);
        let title = 'Download from server (deprecated)';
        if (hasBeeline) {
            title = '[Warning: straight lines not supported] ' + title;
        }
        if (isFit) {
            title = '[Warning: FIT not supported] ' + title;
        }
        document.getElementById('serverExport').title = title;
    },

    _turnInstructionInfo() {
        const turnInstructionMode = +this.profile.getProfileVar('turnInstructionMode');
        $('.format-turns-enabled')
            .prop('hidden', turnInstructionMode <= 1)
            .attr('title', i18next.t('export.turns_enabled'));
    },

    _getMimeType(format) {
        const mimeTypeMap = {
            gpx: 'application/gpx+xml;charset=utf-8',
            kml: 'application/vnd.google-earth.kml+xml;charset=utf-8',
            geojson: 'application/vnd.geo+json;charset=utf-8',
            csv: 'text/tab-separated-values;charset=utf-8',
            fit: 'application/vnd.ant.fit',
        };

        return mimeTypeMap[format];
    },

    _triggerDownload(url, name) {
        const link = document.createElement('a');
        link.href = url;
        if (name) {
            link.download = name;
        }
        link.hidden = true;
        // in Firefox < 75 click() only works when element is attached to DOM tree
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    _exportServer(e) {
        this._export(e, true);
    },

    _export(e, server = false) {
        var exportForm = document.forms['export'];
        var format = exportForm['format'].value || $('#export-format input:radio:checked').val();
        var name = exportForm['trackname'].value;
        var nameUri = encodeURIComponent(name);
        var includeWaypoints = exportForm['include-waypoints'].checked;

        e.preventDefault();

        if (!server && BR.Browser.download) {
            const track = this._formatTrack(format, name, includeWaypoints);
            const fileName = (name || 'brouter') + '.' + format;

            const blob = new Blob([track], {
                type: this._getMimeType(format),
            });

            const reader = new FileReader();
            reader.onload = (e) => this._triggerDownload(reader.result, fileName);
            reader.readAsDataURL(blob);
        } else {
            if (format === 'fit') {
                // Server can't handle fit - downgrade to gpx
                format = 'gpx';
            }
            var serverUrl = this.router.getUrl(
                this.latLngs,
                null,
                this.pois.getMarkers(),
                null,
                format,
                nameUri,
                includeWaypoints
            );

            this._triggerDownload(serverUrl);
        }
    },

    _formatTrack(format, name, includeWaypoints) {
        const track = BR.Export._concatTotalTrack(this.segments);
        if (name) {
            track.features[0].properties.name = name;
        }
        this._addPois(track);
        if (includeWaypoints) {
            this._addRouteWaypoints(track);
        }
        switch (format) {
            case 'gpx':
                const turnInstructionMode = +this.profile.getProfileVar('turnInstructionMode');
                const transportMode = this.profile.getTransportMode();
                return BR.Gpx.format(track, turnInstructionMode, transportMode);
            case 'kml':
                return BR.Kml.format(track);
            case 'geojson':
                return JSON.stringify(track, null, 2);
            case 'csv':
                return BR.Csv.format(track);
            case 'fit':
                return BR.Fit.format(track);
            default:
                break;
        }
        console.error('Export format not implemented: ' + format);
    },

    _addPois(track) {
        const markers = this.pois.getMarkers();
        for (const poi of markers) {
            const properties = { name: poi.name, type: 'poi' };
            const point = turf.point([poi.latlng.lng, poi.latlng.lat], properties);
            track.features.push(point);
        }
    },

    _addRouteWaypoints(track) {
        for (const [i, latLng] of this.latLngs.entries()) {
            let name = 'via' + i;
            let type = 'via';
            if (i === 0) {
                name = 'from';
                type = 'from';
            } else if (i === this.latLngs.length - 1) {
                name = 'to';
                type = 'to';
            }
            const properties = { name, type };
            const point = turf.point([latLng.lng, latLng.lat], properties);
            track.features.push(point);
        }
    },

    _validationMessage() {
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

    _selectTrackname() {
        trackname.setSelectionRange(0, trackname.value.lastIndexOf(BR.Browser.download ? ' (' : ' - '));
    },

    _generateTrackname() {
        var trackname = this.trackname;
        this._getCityAtPosition(
            this.latLngs[0],
            L.bind(function (from) {
                this._getCityAtPosition(
                    this.latLngs[this.latLngs.length - 1],
                    L.bind(function (to) {
                        var distance = document.getElementById('distance').innerHTML;
                        if (!BR.Browser.download && this.tracknameAllowedChars) {
                            distance = distance.replace(',', '.'); // temp. fix (#202)
                        }
                        if (!from || !to) {
                            trackname.value = null;
                        } else if (from === to) {
                            trackname.value = i18next.t('export.route-loop', {
                                from,
                                distance,
                            });
                        } else {
                            trackname.value = i18next.t('export.route-from-to', {
                                from,
                                to,
                                distance,
                            });
                        }

                        if (!BR.Browser.download && this.tracknameAllowedChars) {
                            // temp. fix: replace and remove characters that will get removed by server quick fix (#194)
                            trackname.value = trackname.value.replace(/[>)]/g, '').replace(/ \(/g, ' - ');
                            this._validationMessage();
                        }

                        this._selectTrackname();
                    }, this)
                );
            }, this)
        );
    },

    _getCityAtPosition(lonlat, cb) {
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

    _keydownListener(e) {
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

BR.Export._concatTotalTrack = function (segments) {
    const sumProperties = (p, fp, keys) => {
        for (const key of keys) {
            p[key] = (+p[key] + +fp[key]).toString();
        }
    };
    let coordinates = [];
    let properties;

    for (const [segmentIndex, segment] of segments.entries()) {
        const feature = segment.feature;
        if (!feature) continue;

        const coordOffset = coordinates.length > 0 ? coordinates.length - 1 : 0;
        if (properties) {
            const p = properties;
            const fp = feature.properties;

            sumProperties(p, fp, [
                'cost',
                'filtered ascend',
                'plain-ascend',
                'total-energy',
                'total-time',
                'track-length',
            ]);

            p.messages = p.messages.concat(fp.messages.slice(1));
            if (p.times && fp.times) {
                const lastTime = p.times[p.times.length - 1];
                for (const [timeIndex, time] of fp.times.entries()) {
                    if (timeIndex > 0) {
                        p.times.push(+(lastTime + time).toFixed(3));
                    }
                }
            }
            if (fp.voicehints) {
                if (!p.voicehints) p.voicehints = [];
                let prevHintIdx = p.voicehints.length - 1;
                let hintDistanceSum = 0;
                for (const fpHint of fp.voicehints) {
                    const hint = fpHint.slice();
                    hint[0] += coordOffset;
                    hintDistanceSum += hint[3];
                    p.voicehints.push(hint);
                }
                // fix the distance for the last turn in a segment
                //
                // Problem: In a segmented route where each segment is requested
                // separately the server can't see that we intend to go further.
                // Therefore the last voicehints/turn can only contain the
                // distance till the end of that segment.
                // However: The distance from the start of segment to the next
                // turn is missing.
                // Furthermore the server never reports the distance from the
                // start to the first turn. So we have to calculate that too.
                if (prevHintIdx >= 0) {
                    let firstHintDistance = parseInt(fp['track-length'], 10) - hintDistanceSum;
                    p.voicehints[prevHintIdx][3] += firstHintDistance;
                }
            } else if (p.voicehints && p.voicehints.length) {
                p.voicehints[p.voicehints.length - 1][3] += parseInt(fp['track-length'], 10);
            }
        } else {
            // clone
            properties = Object.assign({}, feature.properties);
            if (properties.voicehints && properties.voicehints.length) {
                properties.voicehints = properties.voicehints.slice();
                const last = properties.voicehints.length - 1;
                // may be modified to fix distance-to-next
                properties.voicehints[last] = properties.voicehints[last].slice();
            }
            if (properties.times) {
                properties.times = properties.times.slice();
            }
        }

        let featureCoordinates = feature.geometry.coordinates;
        if (segmentIndex > 0) {
            // remove duplicate coordinate: first segment coordinate same as previous last,
            // remove the one without ele value (e.g. beeline)
            const prevLast = coordinates[coordinates.length - 1];
            const first = featureCoordinates[0];
            if (prevLast.length < first.length) {
                coordinates.pop();
            } else {
                featureCoordinates = featureCoordinates.slice(1);
            }
        }
        coordinates = coordinates.concat(featureCoordinates);
    }

    return turf.featureCollection([turf.lineString(coordinates, properties)]);
};
