BR.Export = L.Class.extend({
    latLngs: [],

    options: {
        shortcut: {
            export: 88, // char code for 'x'
        },
    },

    initialize: function (router, pois) {
        this.router = router;
        this.pois = pois;
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

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        this.update([]);
    },

    update: function (latLngs, segments) {
        this.latLngs = latLngs;
        this.segments = segments;

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

        e.preventDefault();

        if (true) {
            var uri = this.router.getUrl(this.latLngs, this.pois.getMarkers(), null, format, name, includeWaypoints);

            // var evt = document.createEvent('MouseEvents');
            // evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            // var link = document.createElement('a');
            // link.href = uri;
            // link.dispatchEvent(evt);
            //} else {

            const track = this._formatTrack(format, name, includeWaypoints);
            BR.Export.diff(uri, track, format);
        }
    },

    _formatTrack: function (format, name, includeWaypoints) {
        const track = BR.Export._concatTotalTrack(this.segments);
        //console.log('GeoJson: ', trackGeoJson);
        //console.log('GeoJson: ', JSON.stringify(trackGeoJson, null, 4));
        switch (format) {
            case 'gpx':
                //console.log('gpx: ', gpx);
                return BR.Gpx.format(track, 2, 'bike'); // TODO parse turnInstructionMode, transportMode
            case 'geojson':
                return JSON.stringify(track, null, 2);
            case 'kml':
            default:
                break;
        }
        console.error('Export format not implemented: ' + format);
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
        return; // TODO remove
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

BR.Export._concatTotalTrack = function (segments) {
    const sumProperties = (p, fp, keys) => {
        for (const key of keys) {
            p[key] = (+p[key] + +fp[key]).toString();
        }
    };
    let coordinates = [];
    let properties;

    //console.time('_concatTotalTrack');
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
                for (const fpHint of fp.voicehints) {
                    const hint = fpHint.slice();
                    hint[0] += coordOffset;
                    p.voicehints.push(hint);
                }
            }
        } else {
            // clone
            properties = Object.assign({}, feature.properties);
            if (properties.voicehints) {
                properties.voicehints = properties.voicehints.slice();
            }
            if (properties.times) {
                properties.times = properties.times.slice();
            }
        }

        let featureCoordinates = feature.geometry.coordinates;
        if (segmentIndex > 0) {
            // remove first segment coordinate, same as previous last
            featureCoordinates = featureCoordinates.slice(1);
        }
        coordinates = coordinates.concat(featureCoordinates);
    }
    //console.timeEnd('_concatTotalTrack');

    return turf.featureCollection([turf.lineString(coordinates, properties)]);
};

// <script src="https://unpkg.com/googlediff@0.1.0/javascript/diff_match_patch.js"></script>
BR.Export.diff = function (uri, track, format) {
    BR.Util.get(
        uri,
        ((err, text) => {
            if (err) {
                console.error('Error exporting "' + profileUrl + '": ' + err);
                return;
            }

            if (format === 'gpx') {
                text = BR.Gpx.pretty(BR.Export.adoptGpx(text));
            } else if (format === 'geojson') {
                text = JSON.stringify(JSON.parse(text), null, 2);
            }
            var dmp = new diff_match_patch();
            var diff = dmp.diff_main(text, track);
            dmp.diff_cleanupSemantic(diff);

            if (dmp.diff_levenshtein(diff) > 0) {
                let i = 0;
                while (i < diff.length - 2) {
                    if (
                        diff[i][0] === 0 &&
                        diff[i + 1][0] === -1 &&
                        diff[i + 2][0] === 1 &&
                        (/(rteTime|rteSpeed)>\d+\.\d{0,2}$/.test(diff[i][1]) || /time=[0-9h ]*m \d$/.test(diff[i][1]))
                    ) {
                        const del = +diff[i + 1][1];
                        const ins = +diff[i + 2][1];
                        if (Number.isInteger(del) && Number.isInteger(ins) && Math.abs(del - ins) === 1) {
                            diff.splice(i + 1, 2);
                        }
                    }
                    i++;
                }
            }

            if (dmp.diff_levenshtein(diff) > 0) {
                //console.log('server: ', text);
                //console.log('client: ', track);
                console.log(diff);
                bootbox.alert(dmp.diff_prettyHtml(diff));
            } else {
                console.log('diff equal');
            }
        }).bind(this)
    );
};

// TODO remove
// copied from Gpx.test.js
BR.Export.adoptGpx = function (gpx, replaceCreator = true) {
    const creator = 'togpx';
    const name = 'Track';
    const newline = '\n';

    gpx = gpx.replace(/=\.(?=\d)/, '=0.');
    if (replaceCreator) {
        gpx = gpx.replace(/creator="[^"]*"/, `creator="${creator}"`);
    }
    gpx = gpx.replace(/creator="([^"]*)" version="1.1"/, 'version="1.1" \n creator="$1"');
    //gpx = gpx.replace(/<trk>\n  <name>[^<]*<\/name>/, `<trk>\n  <name>${name}</name>`);
    gpx = gpx
        .split(newline)
        .map((line) => line.replace(/lon="([^"]*)" lat="([^"]*)"/, 'lat="$2" lon="$1"'))
        .join(newline);
    gpx = gpx.replace(/(lon|lat)="([-0-9]+.[0-9]+?)0+"/g, '$1="$2"'); // remove trailing zeros
    gpx = gpx.replace('</gpx>\n', '</gpx>');

    // added
    gpx = gpx.replace(/>([-.0-9]+?0+)<\//g, (match, p1) => `>${+p1}</`); // remove trailing zeros
    // trunc bc. float precision diffs
    gpx = gpx.replace(/(rteTime|rteSpeed)>([^<]*)<\//g, (match, p1, p2) => `${p1}>${(+p2).toFixed(3)}</`);
    gpx = gpx.replace(/\n?\s*<\/extensions>\n?\s*<extensions>/, ''); // ignore (invalid) double tag

    return gpx;
};
