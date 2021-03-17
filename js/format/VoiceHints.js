(function () {
    class Command {
        constructor(name, locus, orux, symbol, message) {
            this.name = name;
            this.locus = locus;
            this.orux = orux;
            this.symbol = symbol;
            this.message = message;
        }
    }

    class RoundaboutCommand extends Command {
        constructor(command, exitNumber) {
            super(
                command.name + exitNumber,
                command.locus + exitNumber,
                command.orux + exitNumber,
                command.symbol + exitNumber,
                command.message + exitNumber
            );
        }
    }

    class RoundaboutLeftCommand extends Command {
        constructor(command, exitNumber) {
            super(
                command.name + -exitNumber,
                command.locus + -exitNumber,
                command.orux + exitNumber,
                command.symbol + -exitNumber,
                command.message + -exitNumber
            );
        }
    }

    class VoiceHints {
        constructor(geoJson, turnInstructionMode, transportMode) {
            this.geoJson = geoJson;
            this.turnInstructionMode = turnInstructionMode;
            this.transportMode = transportMode;

            this.track = geoJson.features?.[0];
            this.voicehints = this.track?.properties?.voicehints;
        }

        getGpxTransform() {
            const transform = {
                comment: '',
                trk: function (trk, feature, coordsList) {
                    const properties = this._getTrk();

                    return Object.assign(
                        {
                            name: feature.properties.name,
                        },
                        properties,
                        trk
                    );
                }.bind(this),
            };

            this._addToTransform(transform);

            return transform;
        }

        _getDuration(voicehintsIndex) {
            const times = this.track.properties.times;
            if (!times) return 0;

            const indexInTrack = this.voicehints[voicehintsIndex][0];
            const currentTime = times[indexInTrack];
            const len = this.voicehints.length;
            const nextIndex = voicehintsIndex < len - 1 ? this.voicehints[voicehintsIndex + 1][0] : times.length - 1;
            const nextTime = times[nextIndex];

            return nextTime - currentTime;
        }

        _loopHints(hintCallback) {
            if (!this.voicehints) return;
            for (const [i, values] of this.voicehints.entries()) {
                const [indexInTrack, commandId, exitNumber, distance, angle, geometry] = values;
                const hint = { indexInTrack, commandId, exitNumber, distance, angle, geometry };

                hint.time = this._getDuration(i);
                if (hint.time > 0) {
                    hint.speed = distance / hint.time;
                }

                const coord = this.track.geometry.coordinates[indexInTrack];
                const cmd = this.getCommand(commandId, exitNumber);
                if (!cmd) {
                    console.error(`no voicehint command for id: ${commandId} (${values})`);
                    continue;
                }

                hintCallback(hint, cmd, coord);
            }
        }

        getCommand(id, exitNumber) {
            let command = VoiceHints.commands[id];
            if (id === 13) {
                command = new RoundaboutCommand(command, exitNumber);
            } else if (id === 14) {
                command = new RoundaboutLeftCommand(command, exitNumber);
            }
            return command;
        }

        // override in subclass
        _addToTransform(transform) {}

        // override in subclass
        _getTrk() {
            return {};
        }
    }

    VoiceHints.commands = (function () {
        return {
            1: new Command('C', 1, 1002, 'Straight', 'straight'),
            2: new Command('TL', 4, 1000, 'Left', 'left'),
            3: new Command('TSLL', 3, 1017, 'TSLL', 'slight left'),
            4: new Command('TSHL', 5, 1019, 'TSHL', 'sharp left'),
            5: new Command('TR', 7, 1001, 'Right', 'right'),
            6: new Command('TSLR', 6, 1016, 'TSLR', 'slight right'),
            7: new Command('TSHR', 8, 1018, 'TSHR', 'sharp right'),
            8: new Command('KL', 9, 1015, 'TSLL', 'keep left'),
            9: new Command('KR', 10, 1014, 'TSLR', 'keep right'),
            10: new Command('TU', 13, 1003, 'TU', 'u-turn'),
            11: new Command('TRU', 14, 1003, 'TU', 'u-turn'), // Right U-turn
            12: new Command('OFFR'), // Off route
            13: new Command('RNDB', 26, 1008, 'RNDB', 'Take exit '), // Roundabout
            14: new Command('RNLB', 26, 1008, 'RNLB', 'Take exit '), // Roundabout left
        };
    })();

    class WaypointVoiceHints extends VoiceHints {
        _addToTransform(transform) {
            transform.gpx = function (gpx, features) {
                this._addWaypoints(gpx);
                return gpx;
            }.bind(this);
        }

        _addWaypoints(gpx) {
            this._loopHints((hint, cmd, coord) => {
                const properties = this._getWpt(hint, cmd, coord);

                const wpt = this._createWpt(coord, properties);
                gpx.wpt.push(wpt);
            });
        }

        _createWpt(coord, properties) {
            return Object.assign(
                {
                    '@lat': coord[1],
                    '@lon': coord[0],
                },
                properties
            );
        }

        // override in subclass
        _getWpt(hint, cmd, coord) {
            return {};
        }
    }

    class GpsiesVoiceHints extends WaypointVoiceHints {
        _getWpt(hint, cmd, coord) {
            return { name: cmd.message, sym: cmd.symbol.toLowerCase(), type: cmd.symbol };
        }
    }

    class OruxVoiceHints extends WaypointVoiceHints {
        _getWpt(hint, cmd, coord) {
            const wpt = {
                ele: coord[2],
                extensions: {
                    'om:oruxmapsextensions': {
                        '@xmlns:om': 'http://www.oruxmaps.com/oruxmapsextensions/1/0',
                        'om:ext': { '@type': 'ICON', '@subtype': 0, _: cmd.orux },
                    },
                },
            };

            if (wpt.ele === undefined || wpt.ele === null) {
                delete wpt.ele;
            }

            return wpt;
        }
    }

    class LocusVoiceHints extends WaypointVoiceHints {
        _addToTransform(transform) {
            transform.gpx = function (gpx, features) {
                // hack to insert attribute after the other `xmlns`s
                gpx = Object.assign(
                    {
                        '@xmlns': gpx['@xmlns'],
                        '@xmlns:xsi': gpx['@xmlns:xsi'],
                        '@xmlns:locus': 'http://www.locusmap.eu',
                    },
                    gpx
                );

                this._addWaypoints(gpx);

                return gpx;
            }.bind(this);
        }

        _getWpt(hint, cmd, coord) {
            const extensions = {};

            extensions['locus:rteDistance'] = hint.distance;
            if (hint.time > 0) {
                extensions['locus:rteTime'] = hint.time.toFixed(3);
                extensions['locus:rteSpeed'] = hint.speed.toFixed(3);
            }
            extensions['locus:rtePointAction'] = cmd.locus;

            const wpt = {
                ele: coord[2],
                name: cmd.message,
                extensions: extensions,
            };

            if (wpt.ele === undefined || wpt.ele === null) {
                delete wpt.ele;
            }

            return wpt;
        }

        _getTrk() {
            return {
                extensions: {
                    'locus:rteComputeType': this._getLocusRouteType(this.transportMode),
                    'locus:rteSimpleRoundabouts': 1,
                },
            };
        }

        _getLocusRouteType(transportMode) {
            switch (transportMode) {
                case 'car':
                    return 0;
                case 'bike':
                    return 5;
                default:
                    return 3; // foot
            }
        }
    }

    class CommentVoiceHints extends VoiceHints {
        _addToTransform(transform) {
            let comment = `
<!-- $transport-mode$${this.transportMode}$ -->
<!--          cmd    idx        lon        lat d2next  geometry -->
<!-- $turn-instruction-start$
`;

            this._loopHints((hint, cmd, coord) => {
                const pad = (obj = '', len) => {
                    return new String(obj).padStart(len) + ';';
                };

                let turn = '';
                turn += pad(cmd.name, 6);
                turn += pad(hint.indexInTrack, 6);
                turn += pad(coord[0], 10);
                turn += pad(coord[1], 10);
                turn += pad(hint.distance, 6);
                turn += hint.geometry;

                comment += `
     $turn$${turn}$
`;
            });

            comment += `
    $turn-instruction-end$ -->
`;

            transform.comment = comment;
        }
    }

    class OsmAndVoiceHints extends VoiceHints {
        _addToTransform(transform) {
            transform.gpx = function (gpx, features) {
                gpx['@creator'] = 'OsmAndRouter';

                gpx.rte.push({
                    rtept: this._createRoutePoints(gpx),
                });

                return gpx;
            }.bind(this);
        }

        _createRoutePoints(gpx) {
            const rteptList = [];

            const trkseg = gpx.trk[0].trkseg[0];
            let trkpt = trkseg.trkpt[0];
            const startPt = {
                '@lat': trkpt['@lat'],
                '@lon': trkpt['@lon'],
                desc: 'start',
            };
            const times = this.track?.properties?.times;
            if (this.voicehints && times) {
                const startTime = times[this.voicehints[0][0]];
                startPt.extensions = { time: Math.round(startTime), offset: 0 };
            }
            rteptList.push(startPt);

            this._loopHints((hint, cmd, coord) => {
                const rtept = {
                    '@lat': coord[1],
                    '@lon': coord[0],
                    desc: cmd.message,
                    extensions: {
                        time: Math.round(hint.time),
                        turn: cmd.name,
                        'turn-angle': hint.angle,
                        offset: hint.indexInTrack,
                    },
                };

                if (hint.time === 0) {
                    delete properties.extensions.time;
                }

                rteptList.push(rtept);
            });

            const lastIndex = trkseg.trkpt.length - 1;
            trkpt = trkseg.trkpt[lastIndex];
            rteptList.push({
                '@lat': trkpt['@lat'],
                '@lon': trkpt['@lon'],
                desc: 'destination',
                extensions: { time: 0, offset: lastIndex },
            });

            return rteptList;
        }
    }

    BR.voiceHints = function (geoJson, turnInstructionMode, transportMode) {
        switch (turnInstructionMode) {
            case 2:
                return new LocusVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 3:
                return new OsmAndVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 4:
                return new CommentVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 5:
                return new GpsiesVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 6:
                return new OruxVoiceHints(geoJson, turnInstructionMode, transportMode);
            default:
                console.error('unhandled turnInstructionMode: ' + turnInstructionMode);
                return new VoiceHints(geoJson, turnInstructionMode, transportMode);
        }
    };
})();
