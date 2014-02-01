Routing in Leaflet
==================

Research and development of a Leaflet.js routing module. The module will be capable of the routing markers and returning geojson in various ways.

![Prototype Routing using Leaflet](https://raw.github.com/Turistforeningen/leaflet-routing/gh-pages/images/promo.gif)

## Usage

```javascript
var routing = new L.Routing({
  position: 'topright'
  ,routing: {
    router: myRouter
  }
  ,snapping: {
    layers: [snapping]
    ,sensitivity: 15
    ,vertexonly: false
  }
});
map.addControl(routing);
```

### Enable Drawing

```javascript
routing.draw(true);
```

### Enable Routing `NOT IMPLEMENTED`

```javascript
routing.routing(true);
```

### Enable Snapping `NOT IMPLEMETED`
```javascript
routing.snapping(true);
```

### Recalculate the complete route by routing each segment
```javascript
routing.routeAllSegments(callback);
```

### Get first waypoint

```javascript
var first = routing.getFirst();
```

### Get last waypoint
```javascript
var last = routing.getLast();
```

### Get all waypoints
```javascript
var waypointsArray = routing.getWaypoints();
```

### Routing to Polyline
```javascript
var polyline = routing.toPolyline();
```

### To GeoJSON
```javascript
var geoJSON3D = routing.toGeoJSON();
var geoJSON2D = routing.toGeoJSON(false);
```

## Copyright

Copyright (c) 2013, Turistforeningen

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
