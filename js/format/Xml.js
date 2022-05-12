BR.Xml = {
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
                    const closeIndex = xml.indexOf('>', match.index + 1);
                    const selfClosing = xml.charAt(closeIndex - 1) === '/';
                    if (!selfClosing) {
                        singleLineTag = tag;
                    }
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
