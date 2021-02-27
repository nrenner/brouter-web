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
            this.name = command.name + exitNumber;
            this.locus = command.locus + exitNumber;
            this.orux = command.orux + exitNumber;
            this.symbol = command.symbol + exitNumber;
            this.message = command.message + exitNumber;
        }
    }

    class RoundaboutLeftCommand extends RoundaboutCommand {
        constructor(command, exitNumber) {
            this.name = command.name + -exitNumber;
            this.locus = command.locus + -exitNumber;
            this.orux = command.orux + exitNumber;
            this.symbol = command.symbol + -exitNumber;
            this.message = command.message + -exitNumber;
        }
    }

    BR.VoiceHints = L.Class.extend({
        statics: {
            commands: (function () {
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
            })(),
        },

        initialize: function (geoJson, turnInstructionMode, transportMode) {
            this.geoJson = geoJson;
            this.turnInstructionMode = turnInstructionMode;
            this.transportMode = transportMode;

            for (const feature of geoJson.features) {
                let voicehints = feature?.properties.voicehints;
                if (voicehints) {
                    this.voicehints = voicehints;
                    this.track = feature;
                    break;
                }
            }
        },

        getGpxTransform: function () {
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
        },

        _getDuration: function (voicehintsIndex) {
            const timeList = this.track.properties.times;
            const indexInTrack = this.voicehints[voicehintsIndex][0];
            const currTime = timeList[indexInTrack];
            const len = this.voicehints.length;
            const nextIndex = voicehintsIndex < len - 1 ? this.voicehints[voicehintsIndex + 1][0] : timeList.length - 1;
            const nextTime = timeList[nextIndex];

            const duration = nextTime - currTime;

            // TODO remove
            const time = this.voicehints[voicehintsIndex][4];
            const p = 5;
            if (!(time.toPrecision(p) === duration.toPrecision(p))) {
                console.error(
                    `${voicehintsIndex}: ${time.toPrecision(p)} =? ${duration.toPrecision(p)}, ${time} =? ${duration}`
                );
            }

            return duration;
        },

        _loopHints: function (hintCallback) {
            for (const [i, values] of this.voicehints.entries()) {
                const [indexInTrack, commandId, exitNumber, distance, time, angle, geometry] = values;
                const hint = { indexInTrack, commandId, exitNumber, distance, time, angle, geometry };

                // TODO remove server hint time
                //hint.time = this._getDuration(i);
                this._getDuration(i);
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
        },

        getCommand: function (id, exitNumber) {
            let command = BR.VoiceHints.commands[id];
            if (id === 13) {
                command = new RoundaboutCommand(command, exitNumber);
            } else if (id === 14) {
                command = new RoundaboutLeftCommand(command, exitNumber);
            }
            return command;
        },

        // override in subclass
        _addToTransform: function (transform) {},

        // override in subclass
        _getTrk: function () {
            return {};
        },
    });

    BR.WaypointVoiceHints = BR.VoiceHints.extend({
        _addToTransform: function (transform) {
            transform.gpx = function (gpx, features) {
                this._addWaypoints(gpx);
                return gpx;
            }.bind(this);
        },

        _addWaypoints: function (gpx) {
            this._loopHints((hint, cmd, coord) => {
                const properties = this._getWpt(hint, cmd, coord);

                const wpt = this._createWpt(coord, properties);
                gpx.wpt.push(wpt);
            });
        },

        _createWpt: function (coord, properties) {
            return Object.assign(
                {
                    '@lat': coord[1],
                    '@lon': coord[0],
                },
                properties
            );
        },

        // override in subclass
        _getWpt: function (hint, cmd, coord) {
            return {};
        },
    });

    BR.GpsiesVoiceHints = BR.WaypointVoiceHints.extend({
        _getWpt: function (hint, cmd, coord) {
            return { name: cmd.message, sym: cmd.symbol.toLowerCase(), type: cmd.symbol };
        },
    });

    BR.LocusVoiceHints = BR.WaypointVoiceHints.extend({
        _addToTransform: function (transform) {
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
        },

        _getWpt: function (hint, cmd, coord) {
            const extensions = {};
            // TODO 'locus:' namespace gets removed
            extensions['locus:rteDistance'] = hint.distance;
            if (hint.time > 0) {
                extensions['locus:rteTime'] = hint.time;
                extensions['locus:rteSpeed'] = hint.speed;
            }
            extensions['locus:rtePointAction'] = cmd.locus;

            return {
                ele: coord[2],
                name: cmd.message,
                extensions: extensions,
            };
        },

        _getTrk: function () {
            return {
                extensions: {
                    'locus:rteComputeType': this._getLocusRouteType(this.transportMode),
                    'locus:rteSimpleRoundabouts': 1,
                },
            };
        },

        _getLocusRouteType: function (transportMode) {
            switch (transportMode) {
                case 'car':
                    return 0;
                case 'bike':
                    return 5;
                default:
                    return 3; // foot
            }
        },
    });

    BR.CommentVoiceHints = BR.VoiceHints.extend({
        _addToTransform: function (transform) {
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
        },
    });

    BR.OsmAndVoiceHints = BR.VoiceHints.extend({
        _addToTransform: function (transform) {
            transform.gpx = function (gpx, features) {
                gpx['@creator'] = 'OsmAndRouter';

                gpx.rte.push({
                    rtept: this._createRoutePoints(gpx),
                });

                // reorder trk after rte
                const trk = gpx.trk;
                delete gpx.trk;
                gpx.trk = trk;

                return gpx;
            }.bind(this);
        },

        _createRoutePoints: function (gpx) {
            const rteptList = [];

            const trkseg = gpx.trk[0].trkseg[0];
            let trkpt = trkseg.trkpt[0];
            const startTime = this.track.properties.times[this.voicehints[0][0]];
            rteptList.push({
                '@lat': trkpt['@lat'],
                '@lon': trkpt['@lon'],
                desc: 'start',
                extensions: { time: Math.round(startTime), offset: 0 },
            });

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
        },
    });

    BR.voiceHints = function (geoJson, turnInstructionMode, transportMode) {
        switch (turnInstructionMode) {
            case 2:
                return new BR.LocusVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 3:
                return new BR.OsmAndVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 4:
                return new BR.CommentVoiceHints(geoJson, turnInstructionMode, transportMode);
            case 5:
                return new BR.GpsiesVoiceHints(geoJson, turnInstructionMode, transportMode);
            default:
                console.error('unhandled turnInstructionMode: ' + turnInstructionMode);
                return new BR.VoiceHints(geoJson, turnInstructionMode, transportMode);
        }
    };
})();
