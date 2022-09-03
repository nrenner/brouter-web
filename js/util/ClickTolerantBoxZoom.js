/**
 * Avoids conflict between shift-click and shift-drag.
 * Extends BoxZoom to support a small click tolerance like in Draggable and
 * a larger drag tolerance as a "neutral zone" before starting with box zoom dragging,
 * to avoid accidental zooms.
 */
BR.ClickTolerantBoxZoom = L.Map.BoxZoom.extend({
    clickTolerance: L.Draggable.prototype.options.clickTolerance,
    // use more than clickTolerance before starting box zoom to surely avoid accidental zooms
    dragTolerance: 15,
    // flag to enable or disable click/drag tolerance, classic BoxZoom behaviour when false
    tolerant: true,

    // "neutral zone", state between clickTolerance and dragTolerance,
    // already signals dragging to map and thus prevents click
    _preMoved: false,

    moved: function () {
        return this._preMoved || this._moved;
    },

    _resetState: function () {
        L.Map.BoxZoom.prototype._resetState.call(this);
        this._preMoved = false;
    },

    _onMouseMove: function (e) {
        if (!this._moved) {
            const point = this._map.mouseEventToContainerPoint(e);

            // derived from L.Draggable._onMove
            var offsetPoint = point.clone()._subtract(this._startPoint);
            var offset = Math.abs(offsetPoint.x || 0) + Math.abs(offsetPoint.y || 0);

            if (this.tolerant && offset < this.dragTolerance) {
                if (!this._preMoved && offset >= this.clickTolerance) {
                    this._preMoved = true;
                }

                return;
            }
        }

        L.Map.BoxZoom.prototype._onMouseMove.call(this, e);
    },

    _onMouseUp: function (e) {
        L.Map.BoxZoom.prototype._onMouseUp.call(this, e);

        if (!this._moved && this._preMoved) {
            this._clearDeferredResetState();
            this._resetStateTimeout = setTimeout(L.Util.bind(this._resetState, this), 0);
        }
    },
});
