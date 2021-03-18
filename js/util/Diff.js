BR.Diff = {};

// <script src="https://unpkg.com/googlediff@0.1.0/javascript/diff_match_patch.js"></script>
BR.Diff.diff = function (uri, track, format) {
    BR.Util.get(
        uri,
        ((err, text) => {
            if (err) {
                console.error('Error exporting "' + profileUrl + '": ' + err);
                return;
            }

            if (format === 'gpx') {
                text = BR.Gpx.pretty(BR.Diff.adoptGpx(text));
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
                        if (Number.isInteger(del) && Number.isInteger(ins) && Math.abs(del - ins) <= 1) {
                            diff.splice(i + 1, 2);
                            if (i + 1 < diff.length && diff[i + 1][0] === 0) {
                                diff[i + 1][1] = diff[i][1] + diff[i + 1][1];
                                diff.splice(i, 1);
                                continue;
                            }
                        }
                    }
                    i++;
                }
            }

            if (dmp.diff_levenshtein(diff) > 0) {
                //console.log('server: ', text);
                //console.log('client: ', track);
                console.log(diff);
                bootbox.alert(BR.Diff.diffPrettyHtml(diff));
            } else {
                console.log('diff equal');
            }
        }).bind(this)
    );
};

// diff_match_patch.prototype.diff_prettyHtml modified to only show specified number of context lines
BR.Diff.diffPrettyHtml = function (diffs, contextLen = 2) {
    var html = [];
    var pattern_amp = /&/g;
    var pattern_lt = /</g;
    var pattern_gt = />/g;
    var pattern_para = /\n/g;
    for (var x = 0; x < diffs.length; x++) {
        var op = diffs[x][0]; // Operation (insert, delete, equal)
        var data = diffs[x][1]; // Text of change.
        var text = data
            .replace(pattern_amp, '&amp;')
            .replace(pattern_lt, '&lt;')
            .replace(pattern_gt, '&gt;')
            //.replace(pattern_para, '&para;<br>');
            .replace(pattern_para, '<br>');
        switch (op) {
            case DIFF_INSERT:
                html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
                break;
            case DIFF_DELETE:
                html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
                break;
            case DIFF_EQUAL:
                const lines = text.split('<br>');
                const len = lines.length;
                if (len > contextLen * 2) {
                    text = [...lines.slice(0, contextLen), '...', ...lines.slice(-contextLen)].join('<br>');
                }

                html[x] = '<span>' + text + '</span>';
                break;
        }
    }
    return html.join('');
};

// TODO remove
// copied from Gpx.test.js
BR.Diff.adoptGpx = function (gpx, replaceCreator = true) {
    const creator = 'togpx';
    const name = 'Track';
    const newline = '\n';

    gpx = gpx.replace(/=\.(?=\d)/, '=0.');
    if (replaceCreator) {
        gpx = gpx.replace(/creator="(?!OsmAndRouter)[^"]*"/, `creator="${creator}"`);
    }
    gpx = gpx.replace(/creator="([^"]*)" version="1.1"/, 'version="1.1" \n creator="$1"');
    //gpx = gpx.replace(/<trk>\n  <name>[^<]*<\/name>/, `<trk>\n  <name>${name}</name>`);
    gpx = gpx
        .split(newline)
        .map((line) => line.replace(/lon="([^"]*)" lat="([^"]*)"/, 'lat="$2" lon="$1"'))
        .join(newline);
    gpx = gpx.replace(/(lon|lat)="([-0-9]+.[0-9]+?)0+"/g, '$1="$2"'); // remove trailing zeros
    // remove trailing zeros comment-style voicehints
    gpx = gpx.replace(/;\s*([-0-9]+.[0-9]+?)0+;/g, (match, p1) => `;${p1.padStart(10)};`);
    gpx = gpx.replace(/>([-0-9]+?\.\d*0+)<\//g, (match, p1) => `>${+p1}</`); // remove trailing zeros
    gpx = gpx.replace('</gpx>\n', '</gpx>');

    // added
    // trunc bc. float precision diffs
    gpx = gpx.replace(/(rteTime|rteSpeed)>([^<]*)<\//g, (match, p1, p2) => `${p1}>${(+p2).toFixed(3)}</`);
    gpx = gpx.replace(/\n?\s*<\/extensions>\n?\s*<extensions>/, ''); // ignore (invalid) double tag

    return gpx;
};
