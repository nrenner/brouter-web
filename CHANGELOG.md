BRouter-Web Changelog
=====================

## 0.5.1 (2015-07-24)

* config option ``baseLayers`` to add custom base layers locally (#24)
* reset slider on page load to minimum opacity (#22),  
  customizable locally with config setting ``minOpacity``
* set OpenTopoMap max zoom back to z15 while on fallback server (#21),  
  also fix max zoom of other services
* overscale tiles to common max zoom (avoids gray screen when switching)

## 0.5.0 (2015-07-01)

### Features

* Load profile content for selected profile (needs extra server locally)
* Bing maps aerial layer (not working locally)
* track color magenta instead of blue + white casing, for better contrast  
  with background map (esp. OpenCycleMap)
* transparency slider for route track and markers
* button to delete route (#10)
* map scale
* download all dependencies in a bundle, instead using CDNs and separate files (#18)
* switch search plugin for result-dependent zoom
* "about" popup with a bit more infos and links
* closable error/warning messages, profile messages in place

### Bugfixes

* keys to enable/disable drawing (d, q/esc) now always work, not only when map is focused
* fix adding new waypoint after deleting the last (#11)
* fix profile/data scrolling on Firefox
* hide trailer over controls and outside map


## BRouter 1.2

* data/CSV aggregated over segments with same tags (for better performance)

## 0.4.0 (2015-03-08)

* data tab (slow with long routes, exp. on Firefox)
