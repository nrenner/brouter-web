(function () {
    // Calculates time and energy stats

    class BExpressionContextWay {
        constructor(maxspeed = 45.0, costfactor = 1.0) {
            this.maxspeed = maxspeed;
            this.costfactor = costfactor;
        }
        getMaxspeed() {
            return this.maxspeed;
        }
        getCostfactor() {
            return this.costfactor;
        }
    }

    class BExpressionContext {
        constructor(profile) {
            this.profile = profile;
        }

        getVariableValue(name, defaultValue) {
            let value = this.profile?.getProfileVar(name) ?? defaultValue;
            if (value === 'true') {
                value = 1;
            } else if (value === 'false') {
                value = 0;
            }
            return +value;
        }
    }

    // from BRouter btools.router.RoutingContext
    class RoutingContext {
        constructor(profile) {
            this.expctxGlobal = new BExpressionContext(profile);
            this.expctxWay = new BExpressionContextWay();

            this.bikeMode = 0 !== this.expctxGlobal.getVariableValue('validForBikes', 0);
            this.footMode = 0 !== this.expctxGlobal.getVariableValue('validForFoot', 0);

            this.totalMass = this.expctxGlobal.getVariableValue('totalMass', 90.0);
            this.maxSpeed = this.expctxGlobal.getVariableValue('maxSpeed', this.footMode ? 6.0 : 45.0) / 3.6;
            this.S_C_x = this.expctxGlobal.getVariableValue('S_C_x', 0.5 * 0.45);
            this.defaultC_r = this.expctxGlobal.getVariableValue('C_r', 0.01);
            this.bikerPower = this.expctxGlobal.getVariableValue('bikerPower', 100.0);
        }
    }

    // from BRouter btools.router.StdPath
    class StdPath {
        constructor() {
            this.totalTime = 0;
            this.totalEnergy = 0;
            this.elevation_buffer = 0;
        }

        /**
         * Approximation to Math.exp for small negative arguments
         * @param {number} e
         * @return {number}
         */
        static exp(e) {
            var x = e;
            var f = 1.0;
            while (e < -1.0) {
                {
                    e += 1.0;
                    f *= 0.367879;
                }
            }
            return f * (1.0 + x * (1.0 + x * (0.5 + x * (0.166667 + 0.0416667 * x))));
        }

        static solveCubic(a, c, d) {
            var v = 8.0;
            var findingStartvalue = true;
            for (var i = 0; i < 10; i++) {
                {
                    var y = (a * v * v + c) * v - d;
                    if (y < 0.1) {
                        if (findingStartvalue) {
                            v *= 2.0;
                            continue;
                        }
                        break;
                    }
                    findingStartvalue = false;
                    var y_prime = 3 * a * v * v + c;
                    v -= y / y_prime;
                }
            }
            return v;
        }

        resetState() {
            this.totalTime = 0.0;
            this.totalEnergy = 0.0;
            this.elevation_buffer = 0.0;
        }

        calcIncline(dist) {
            var min_delta = 3.0;
            var shift;
            if (this.elevation_buffer > min_delta) {
                shift = -min_delta;
            } else if (this.elevation_buffer < min_delta) {
                shift = -min_delta;
            } else {
                return 0.0;
            }
            var decayFactor = StdPath.exp(-dist / 100.0);
            var new_elevation_buffer = (this.elevation_buffer + shift) * decayFactor - shift;
            var incline = (this.elevation_buffer - new_elevation_buffer) / dist;
            this.elevation_buffer = new_elevation_buffer;
            return incline;
        }

        computeKinematic(rc, dist, delta_h, detailMode) {
            if (!detailMode) {
                return;
            }
            this.elevation_buffer += delta_h;
            var incline = this.calcIncline(dist);
            var wayMaxspeed;
            wayMaxspeed = rc.expctxWay.getMaxspeed() / 3.6;
            if (wayMaxspeed === 0) {
                wayMaxspeed = rc.maxSpeed;
            }
            wayMaxspeed = Math.min(wayMaxspeed, rc.maxSpeed);
            var speed;
            var f_roll = rc.totalMass * StdPath.GRAVITY * (rc.defaultC_r + incline);
            if (rc.footMode || rc.expctxWay.getCostfactor() > 4.9) {
                speed = rc.maxSpeed * 3.6;
                speed = (speed * StdPath.exp(-3.5 * Math.abs(incline + 0.05))) / 3.6;
            } else if (rc.bikeMode) {
                speed = StdPath.solveCubic(rc.S_C_x, f_roll, rc.bikerPower);
                speed = Math.min(speed, wayMaxspeed);
            } else {
                speed = wayMaxspeed;
            }
            var dt = dist / speed;
            this.totalTime += dt;
            var energy = dist * (rc.S_C_x * speed * speed + f_roll);
            if (energy > 0.0) {
                this.totalEnergy += energy;
            }
        }

        getTotalTime() {
            return this.totalTime;
        }

        getTotalEnergy() {
            return this.totalEnergy;
        }
    }

    StdPath.GRAVITY = 9.81;

    BR.StdPath = StdPath;
    BR.RoutingContext = RoutingContext;
    BR.BExpressionContextWay = BExpressionContextWay;
})();
