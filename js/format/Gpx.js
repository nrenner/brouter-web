BR.Gpx = {
    format: function (geoJson, turnInstructionMode = 0, transportMode = 'bike') {
        if (!geoJson?.features) return '';

        const trkNameTransform = {
            trk: function (trk, feature, coordsList) {
                // name as first tag, by using assign and in this order
                return Object.assign(
                    {
                        name: feature.properties.name,
                    },
                    trk
                );
            },
        };
        let gpxTransform = trkNameTransform;

        if (turnInstructionMode > 0) {
            const voiceHints = BR.voiceHints(geoJson);
            gpxTransform = voiceHints.getGpxTransform(turnInstructionMode, transportMode);
        }

        let gpx = togpx(geoJson, {
            featureTitle: function () {},
            featureDescription: function () {},
            transform: gpxTransform,
        });
        const statsComment = BR.Gpx._statsComment(geoJson);
        gpx = '<?xml version="1.0" encoding="UTF-8"?>' + statsComment + gpx;
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
            // TODO format, e.g. total-time=14833 -> time=4h 7m 13s
            // see brouter OsmTrack.getFormattedTime2
            comment += ' time=' + props['total-time'] + 's';
        }
        comment += ' -->';
        return comment;
    },

    // modified version of
    // https://gist.github.com/sente/1083506#gistcomment-2254622
    // MIT License, Copyright (c) 2016 Stuart Powers, ES6 version by Jonathan Gruber
    pretty: function (xml, indentSize = 1) {
        const PADDING = ' '.repeat(indentSize);
        const newline = '\n';

        // Remove all the newlines and then remove all the spaces between tags
        xml = xml.replace(/\s*(\r\n|\n|\r)\s*/gm, ' ').replace(/>\s+</g, '><');

        // break into lines
        const reg = /(>)(<)(\/?)/g;
        let pad = 0;

        xml = xml.replace('<metadata/>', '');
        xml = xml.replace(reg, `$1${newline}$2$3`);

        let lines = xml.split(newline);
        lines = lines.map((node, index) => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/) && pad > 0) {
                pad -= 1;
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }

            pad += indent;

            return PADDING.repeat(pad - indent) + node;
        });

        for (const [i, line] of lines.entries()) {
            // break gpx attributes into separate lines
            if (line.includes('<gpx ')) {
                lines[i] = line.replace(/ ([a-z:]+=")/gi, ` ${newline}${PADDING}$1`);
                break;
            }
        }

        return lines.join(newline);
    },
};
