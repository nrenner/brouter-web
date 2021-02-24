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

        initialize: function (geoJson) {
            this.geoJson = geoJson;

            for (const feature of geoJson.features) {
                let voicehints = feature?.properties.voicehints;
                if (voicehints) {
                    this.voicehints = voicehints;
                    this.track = feature;
                    break;
                }
            }
        },

        createWpt: function (coord, properties) {
            return Object.assign(
                {
                    '@lat': coord[1],
                    '@lon': coord[0],
                },
                properties
            );
        },

        getGpxTransform: function (turnInstructionMode, transportMode) {
            const mode = turnInstructionMode;
            const transform = {
                gpx: function (gpx, features) {
                    for (const hint of this.voicehints) {
                        const [indexInTrack, commandId, exitNumber, distance, time] = hint;
                        let speed;
                        if (time > 0) {
                            speed = distance / time;
                        }

                        const coord = this.track.geometry.coordinates[indexInTrack];
                        const cmd = this.getCommand(commandId, exitNumber);
                        if (!cmd) {
                            console.error(`no voicehint command for id: ${commandId} (${hint})`);
                            continue;
                        }

                        let properties;
                        if (mode === 2) {
                            const extensions = {};
                            // TODO 'locus:' namespace gets removed
                            extensions['locus:rteDistance'] = distance;
                            if (time > 0) {
                                extensions['locus:rteTime'] = time;
                                extensions['locus:rteSpeed'] = speed;
                            }
                            extensions['locus:rtePointAction'] = cmd.locus;

                            properties = {
                                ele: coord[2],
                                name: cmd.message,
                                extensions: extensions,
                            };
                        } else if (mode === 5) {
                            properties = { name: cmd.message, sym: cmd.symbol.toLowerCase(), type: cmd.symbol };
                        } else {
                            console.error('unhandled turnInstructionMode: ' + mode);
                        }

                        const wpt = this.createWpt(coord, properties);
                        gpx.wpt.push(wpt);
                    }

                    if (mode === 2) {
                        // hack to insert attribute after the other `xmlns`s
                        gpx = Object.assign(
                            {
                                '@xmlns': gpx['@xmlns'],
                                '@xmlns:xsi': gpx['@xmlns:xsi'],
                                '@xmlns:locus': 'http://www.locusmap.eu',
                            },
                            gpx
                        );
                    }
                    return gpx;
                }.bind(this),
                trk: function (trk, feature, coordsList) {
                    const properties = {
                        name: feature.properties.name,
                    };

                    const getLocusRouteType = (transportMode) => {
                        switch (transportMode) {
                            case 'car':
                                return 0;
                            case 'bike':
                                return 5;
                            default:
                                return 3; // foot
                        }
                    };

                    if (mode === 2) {
                        properties.extensions = {
                            'locus:rteComputeType': getLocusRouteType(transportMode),
                            'locus:rteSimpleRoundabouts': 1,
                        };
                    }
                    return Object.assign(properties, trk);
                },
            };
            return transform;
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
    });

    BR.voiceHints = function (geoJson) {
        return new BR.VoiceHints(geoJson);
    };
})();
