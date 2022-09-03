// Fixes wrong added offset when dragging, which can leave mouse off the marker
// after dragging and cause a map click
// see https://github.com/Leaflet/Leaflet/pull/7446
// see https://github.com/Leaflet/Leaflet/issues/4457
L.Draggable.prototype._onMoveOrig = L.Draggable.prototype._onMove;
L.Draggable.prototype._onMove = function (e) {
    var start = !this._moved;

    this._onMoveOrig.call(this, e);

    if (start && this._moved) {
        var offset = this._newPos.subtract(this._startPos);
        this._startPos = this._startPos.add(offset);
        this._newPos = this._newPos.add(offset);
    }
};
