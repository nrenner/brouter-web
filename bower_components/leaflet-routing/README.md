Leaflet.Routing
===============

Leaflet.Routing is a routing controller for the popular Leaflet mapping
framework. The module provides an intuitive interface for routing paths between
waypoints using any user specified routing service. A demo using the OSM data
can be found
[here](http://turistforeningen.github.io/leaflet-routing/examples/osm.html).

![Prototype Routing using Leaflet](https://raw.github.com/Turistforeningen/leaflet-routing/gh-pages/images/promo.gif)

## Features

* Route handling interface for Leaflet
* Use your own routing backend, or OSM

## Usage

```javascript
var routing = new L.Routing({
  position: 'topright'
  ,routing: {
    router: myRouterFunction
  }
  ,tooltips: {
    waypoint: 'Waypoint. Drag to move; Click to remove.',
    segment: 'Drag to create a new waypoint'
  }
  ,styles: {     // see http://leafletjs.com/reference.html#polyline-options
    trailer: {}  // drawing line
    ,track: {}   // calculated route result
    ,nodata: {}  // line when no result (error)
  }
  ,snapping: {
    layers: [mySnappingLayer]
    ,sensitivity: 15
    ,vertexonly: false
  }
  ,shortcut: {
    draw: {
      enable: 68    // 'd'
      ,disable: 81  // 'q'
    }
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
routing.rerouteAllSegments(callback);
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

### Load GeoJSON

Load GeoJSON with and without `properties.waypoints`.

#### Options

* `number` waypointDistance - distance between inserted waypoints for GeoJSON without waypoints.
* `boolean` fitBounds - fit map arround loaded GeoJSON.

```javascript
routing.loadGeoJSON(geojson, [options], function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('Finished loading GeoJSON');
  }
});
```

## Events

All events form Leaflet.Routing is prefixed with `routing:`.

### Usage

```javascript
routing.on('routing:someEvent', function() {
  console.log('routing:someEvent triggered');
});
```

### L.Routing Events

| Event name | Description |
|------------|-------------|
| `routing:draw-start` | Fired when drawing mode is started |
| `routing:draw-new` | Fired when drawing mode is started for a new route |
| `routing:draw-continue` | Fired when drawing mode is started for an existing route |
| `routing:draw-stop` | Fired when drawing mode ends |
| `routing:edit-start` | Fired when editing mode starts |
| `routing:edit-end` | Fired when editing mode ends |

### Waypoint Events

| Event name | Description |
|------------|-------------|
| `routing:routeWaypointStart` | Fired when a new or existing waypoint is created or moved |
| `routing:routeWaypointEnd` | Fired when routing is finished for new or moved waypoint |

### Segment Events

| Event name | Description |
|------------|-------------|
| `routing:rerouteAllSegmentsStart` | Fired when rerouting of all segments starts |
| `routing:rerouteAllSegmentsEnd` | Fired when rerouting of all segments completes |

## Copyright

Copyright (c) 2014, Den Norske Turistforening

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted
provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions
   and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions
   and the following disclaimer in the documentation and/or other materials provided with the
   distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

