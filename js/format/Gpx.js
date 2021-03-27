BR.Gpx = {
    format: function (geoJson, turnInstructionMode = 0, transportMode = 'bike') {
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
            creator: 'BRouter-Web ' + BR.version,
            featureTitle: function () {},
            featureDescription: function () {},
            featureCoordTimes: function () {},
            transform: gpxTransform,
        });
        const statsComment = BR.Gpx._statsComment(geoJson);
        gpx = '<?xml version="1.0" encoding="UTF-8"?>' + statsComment + gpxTransform.comment + gpx;
        gpx = BR.Gpx.pretty(gpx);
        return gpx;
    },

    // <!-- track-length = 319 filtered ascend = 2 plain-ascend = -1 cost=533 energy=.0kwh time=44s -->
    _statsComment: function (geoJson) {
        const props = geoJson.features?.[0].properties;
        if (!props) return '';

        let comment = '<!--';
        comment += ' track-length = ' + props['track-length'];
        comment += ' filtered ascend = ' + props['filtered ascend'];
        comment += ' plain-ascend = ' + props['plain-ascend'];
        comment += ' cost=' + props['cost'];
        if (props['total-energy']) {
            // TODO 'wh'? (also for stats, see issue),
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

    // modified version of
    // https://gist.github.com/sente/1083506#gistcomment-2254622
    // MIT License, Copyright (c) 2016 Stuart Powers, ES6 version by Jonathan Gruber
    pretty: function (xml, indentSize = 1) {
        const PADDING = ' '.repeat(indentSize);
        const newline = '\n';

        // Remove all the newlines and then remove all the spaces between tags
        xml = xml.replace(/>\s*(\r\n|\n|\r)\s*</gm, '><').replace(/>\s+</g, '><');
        xml = xml.replace('<metadata/>', '');

        // break into lines, keeping defined tags on a single line
        const reg = /><(\/?)([\w!?][^ />]*)/g;
        const singleLineTagList = ['trkpt', 'wpt'];
        let lines = [];
        let singleLineTag = null;
        let startIndex = 0;
        let match;
        while ((match = reg.exec(xml)) !== null) {
            const tag = match[2];
            if (singleLineTag) {
                if (singleLineTag === tag) {
                    singleLineTag = null;
                }
            } else {
                if (singleLineTagList.includes(tag)) {
                    singleLineTag = tag;
                }
                let endIndex = match.index + 1;
                lines.push(xml.substring(startIndex, endIndex));
                startIndex = endIndex;
            }
        }
        lines.push(xml.substring(startIndex));

        // indent
        const startTextEnd = /.+<\/\w[^>]*>$/;
        const endTag = /^<\/\w/;
        const startTag = /^<\w[^>]*[^\/]>.*$/;
        let pad = 0;
        lines = lines.map((node, index) => {
            let indent = 0;
            if (node.match(startTextEnd)) {
                indent = 0;
            } else if (node.match(endTag) && pad > 0) {
                pad -= 1;
            } else if (node.match(startTag)) {
                indent = 1;
            } else {
                indent = 0;
            }

            pad += indent;

            return PADDING.repeat(pad - indent) + node;
        });

        // break gpx attributes into separate lines
        for (const [i, line] of lines.entries()) {
            if (line.includes('<gpx ') && !line.includes(newline)) {
                lines[i] = line.replace(/ (\w[^=" ]*=")/g, ` ${newline}${PADDING}$1`);
                break;
            }
        }

        return lines.join(newline);
    },
};
