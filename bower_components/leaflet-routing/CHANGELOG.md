Changelog
=========

### 0.2.0 (Unreadlesed)

**Features**

* Add option for overriding draw shortcuts (#23)
* Add option for disabling drawing marker (#18)
* Add options for tooltips (waypoint, segment)
* Disable shortcuts by setting `options.shortcut` to `false`.
* Add support for loading GeoJSON without waypoints (#16).
* Add option to #loadGeoJSON() to disable map fit bounds.
* Add [OSM demo](http://turistforeningen.github.io/leaflet-routing/examples/osm.html)
* …as well as countless updates to the readme and code readability.

**Breaking changes**

* Default shortcut key for draw enable is `d`
* Default shortcut key for draw disable is `q`

### 0.1.1 March 11, 2014

**Features**

* Add changelog overview (#14)
* Add Change map bounds when loading GeoJSON (#13)

**Bugfixes**

* Fix undefined evaluation when snapping layer is not avaiable (#15)
* Fail gracefully when loading invalid GeoJSON (#12)

### 0.1.0 March 10, 2014

* Implements `#loadGeoJSON()` method (#3)

#### Backwards compability note

* Format of `properties.waypoints` in `#toGeoJSON()` is changed according to #3.

