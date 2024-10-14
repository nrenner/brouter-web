// derived from BRouter btools.router.OsmTrack.formatAsGpx
BR.Gpx = {
    format(geoJson, turnInstructionMode = 0, transportMode = 'bike') {
        if (!geoJson?.features) return '';

        class GpxTransform {
            constructor(voiceHintsTransform) {
                this.voiceHintsTransform = voiceHintsTransform;
                this.comment = voiceHintsTransform?.comment || '';

                if (this.voiceHintsTransform) {
                    Object.keys(this.voiceHintsTransform).forEach((member) => {
                        if (!GpxTransform.prototype.hasOwnProperty(member)) {
                            this[member] = this.voiceHintsTransform[member];
                        }
                    });
                }
            }

            wpt(wpt, feature, coord, index) {
                // not in use right now, just to be safe in case of future overrides
                wpt = (voiceHintsTransform?.wpt && voiceHintsTransform.wpt(wpt, feature, coord, index)) || wpt;
                if (feature.properties.name) {
                    wpt.name = feature.properties.name;
                }
                const type = feature.properties.type;
                if (type && type !== 'poi') {
                    wpt.type = type;
                }
                return wpt;
            }

            trk(trk, feature, coordsList) {
                trk = (voiceHintsTransform?.trk && voiceHintsTransform.trk(trk, feature, coordsList)) || trk;
                // name as first tag, by using assign and in this order
                return Object.assign(
                    {
                        name: feature.properties.name,
                        link: {
                            '@href': location.href,
                            text: BR.conf.appName || 'BRouter-Web',
                        },
                    },
                    trk
                );
            }
        }

        let voiceHintsTransform;
        if (turnInstructionMode > 1) {
            const voiceHints = BR.voiceHints(geoJson, turnInstructionMode, transportMode);
            voiceHintsTransform = voiceHints.getGpxTransform();
        }
        const gpxTransform = new GpxTransform(voiceHintsTransform);

        let gpx = togpx(geoJson, {
            creator: (BR.conf.appName || 'BRouter-Web') + ' ' + BR.version,
            featureTitle() {},
            featureDescription() {},
            featureCoordTimes() {},
            transform: gpxTransform,
        });
        const statsComment = BR.Gpx._statsComment(geoJson);
        gpx = '<?xml version="1.0" encoding="UTF-8"?>' + statsComment + gpxTransform.comment + gpx;
        gpx = BR.Xml.pretty(gpx);
        return gpx;
    },

    // <!-- track-length = 319 filtered ascend = 2 plain-ascend = -1 cost=533 energy=.0kwh time=44s -->
    _statsComment(geoJson) {
        const props = geoJson.features?.[0].properties;
        if (!props) return '';

        let comment = '<!--';
        comment += ' track-length = ' + props['track-length'];
        comment += ' filtered ascend = ' + props['filtered ascend'];
        comment += ' plain-ascend = ' + props['plain-ascend'];
        comment += ' cost=' + props['cost'];
        if (props['total-energy']) {
            // see brouter OsmTrack.getFormattedEnergy
            comment += ' energy=' + (props['total-energy'] / 3600000).toFixed(1) + 'kwh';
        }
        if (props['total-time']) {
            comment += ' time=' + BR.Gpx.formatTime(props['total-time']);
        }
        comment += ' -->';
        return comment;
    },

    // 14833 -> 4h 7m 13s
    // see BRouter OsmTrack.getFormattedTime2
    formatTime(seconds) {
        const hours = Math.trunc(seconds / 3600);
        const minutes = Math.trunc((seconds - hours * 3600) / 60);
        seconds = seconds - hours * 3600 - minutes * 60;
        let time = '';
        if (hours != 0) time += hours + 'h ';
        if (minutes != 0) time += minutes + 'm ';
        if (seconds != 0) time += seconds + 's';
        return time;
    },
};
