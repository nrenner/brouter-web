# BRouter-Web Changelog

## 0.13.0 (2020-08-04)

See also [milestone 0.13.0](https://github.com/nrenner/brouter-web/milestone/14?closed=1)

### New Features

-   Load Track from file and add as Route - by [@printpagestopdf](https://github.com/printpagestopdf) ([#312](https://github.com/nrenner/brouter-web/pull/312), [#318](https://github.com/nrenner/brouter-web/issues/318))

### Improvements

-   Add more keyboard shortcuts and fix various shortcut related issues - by [@rkflx](https://github.com/rkflx) ([#314](https://github.com/nrenner/brouter-web/pull/314), [#315](https://github.com/nrenner/brouter-web/issues/315))

### Bugfixes

-   Empty elevation chart on load, but button to hide not visible ([#320](https://github.com/nrenner/brouter-web/issues/320))

### Layers

-   Add CyclOSM back for all, with kind permission from OpenStreetMap France ([#290](https://github.com/nrenner/brouter-web/pull/290))

## 0.12.0 (2020-06-19)

See also [milestone 0.12.0](https://github.com/nrenner/brouter-web/milestone/13?closed=1)

### New Features

-   Add sidebar tab with route analysis data - by [@mjaschen](https://github.com/mjaschen) ([#304](https://github.com/nrenner/brouter-web/pull/304), [#45](https://github.com/nrenner/brouter-web/issues/45#issuecomment-633255152))
-   Allow to mute route display by holding down the "m" key - by [@stesie](https://github.com/stesie) ([#303](https://github.com/nrenner/brouter-web/pull/303))

### Improvements

-   Improve mobile stats layout - by [@bagage](https://github.com/bagage) ([#298](https://github.com/nrenner/brouter-web/pull/298))
-   Polish color coding + analysis tab visuals - by [@rkflx](https://github.com/rkflx) ([#313](https://github.com/nrenner/brouter-web/pull/313))

### Bugfixes

-   Brouter-Web on mobile: adjust route in between two waypoints ([#285](https://github.com/nrenner/brouter-web/issues/285))
-   NogoAreas control doesn't work on mobile Chrome ([#259](https://github.com/nrenner/brouter-web/issues/259))
-   Fix: Profile params of type 'select' ignored default value from profile - by [@tbsmark86](https://github.com/tbsmark86) ([#292](https://github.com/nrenner/brouter-web/pull/292))

### Local installation / development

-   Add config option for initial map position and zoom level - by [@rmsacks](https://github.com/rmsacks) ([#281](https://github.com/nrenner/brouter-web/pull/281))
-   Privacy link relative path - by [@erdmark](https://github.com/erdmark) ([#284](https://github.com/nrenner/brouter-web/pull/284))
-   Add CONTRIBUTING.md - by [@bagage](https://github.com/bagage) ([#305](https://github.com/nrenner/brouter-web/pull/305))
-   add VS Code settings, launch and extension recommendations - by [@schmic](https://github.com/schmic) ([#307](https://github.com/nrenner/brouter-web/pull/307))
-   add docker-compose tasks for development - by [@schmic](https://github.com/schmic) ([#308](https://github.com/nrenner/brouter-web/pull/308))

## 0.11.1 (2020-02-20)

### Improvements

-   Show icon indicator when profile is pinned (modified in editor) ([#277](https://github.com/nrenner/brouter-web/pull/277))

### Bugfixes

-   Fix overwriting editor changes when switching profile tabs ([#277](https://github.com/nrenner/brouter-web/pull/277))
-   Fix search result not selectable in Chrome ([leaflet-control-geocoder#272](https://github.com/perliedman/leaflet-control-geocoder/issues/255))

## 0.11.0 (2020-01-21)

See also [milestone 0.11.0](https://github.com/nrenner/brouter-web/milestone/12?closed=1)

### New Features

-   Load track in GPX, KML or GeoJSON format - by [@matzepan](https://github.com/matzepan) ([#30](https://github.com/nrenner/brouter-web/issues/30))
-   Profile options UI (user interface) to customize profile variables - by [@Phyks](https://github.com/Phyks) ([#223](https://github.com/nrenner/brouter-web/issues/223))
-   Add user POI (point of interest) markers with name, exported as waypoints - by [@bagage](https://github.com/bagage) ([#222](https://github.com/nrenner/brouter-web/issues/222))
-   Color route segments by incline, altitude or cost - by [@matzepan](https://github.com/matzepan) ([#242](https://github.com/nrenner/brouter-web/pull/242))
-   Distance markers - by [@matzepan](https://github.com/matzepan) ([#169](https://github.com/nrenner/brouter-web/issues/169))
-   Option to include route waypoints in export - by [@Phyks](https://github.com/Phyks) ([#221](https://github.com/nrenner/brouter-web/pull/221))
-   Transparency slider for overlay map layers - by [@Phyks](https://github.com/Phyks) ([#213](https://github.com/nrenner/brouter-web/issues/213))

### Improvements

-   Distinct from, to and via markers - by [@bagage](https://github.com/bagage) ([#129](https://github.com/nrenner/brouter-web/issues/129))
-   Always show travel time and energy statistics - by [@rkflx](https://github.com/rkflx) ([#216](https://github.com/nrenner/brouter-web/pull/216))
-   Synchronize data table highlight and selection with map - by [@matzepan](https://github.com/matzepan) ([#171](https://github.com/nrenner/brouter-web/issues/171))
-   Option to delete all nogo areas - by [@Phyks](https://github.com/Phyks) ([#217](https://github.com/nrenner/brouter-web/issues/217))
-   Hints and feedback for optional layers tree usage ([#211](https://github.com/nrenner/brouter-web/issues/211))

## 0.10.3 (2019-06-27)

See also [milestone 0.10.3](https://github.com/nrenner/brouter-web/milestone/11?closed=1)

### Bugfixes

-   Warn when special characters in export name will get removed ([#194](https://github.com/nrenner/brouter-web/issues/194), [#202](https://github.com/nrenner/brouter-web/issues/202))
-   Fix %-encoded export file name in Microsoft Edge ([#201](https://github.com/nrenner/brouter-web/issues/201))
-   Fix error when no elevation data above 60° north, causing empty stats and disabled export, by implementing own missing data handling for elevation diagram ([#203](https://github.com/nrenner/brouter-web/issues/203))

### Improvements

-   Reduce tile.openstreetmap.org usage ([#205](https://github.com/nrenner/brouter-web/issues/205))
    -   use a worldwide monolingual layer (de, fr, ru) as default when matching the browser language
    -   remember the last selected layers (like map view), so it doesn't load the default layer next time
    -   default zoom level 5 instead of 6, which seems to be cached longer
-   Upgrade Gulp (build tool) to version 4.0.2 - by [@Phyks](https://github.com/Phyks) ([#209](https://github.com/nrenner/brouter-web/pull/209))
-   Upgrade leaflet geocoder to properly parse lat/lng - by [@bagage](https://github.com/bagage) ([#134](https://github.com/nrenner/brouter-web/issues/134))
-   Upgrade to latest Bootstrap (front-end framework) - by [@bagage](https://github.com/bagage) ([#186](https://github.com/nrenner/brouter-web/pull/186))

## 0.10.2 (2019-06-02)

See also [milestone 0.10.2](https://github.com/nrenner/brouter-web/milestone/10?closed=1)

### New Features

-   Polish formatting and behaviour of track statistics bar - by [@rkflx](https://github.com/rkflx) ([#200](https://github.com/nrenner/brouter-web/pull/200))

### Bugfixes

-   Fix unintentional shortcut activations when typing text - by [@rkflx](https://github.com/rkflx) ([#198](https://github.com/nrenner/brouter-web/pull/198))
-   Fix export button translation - by [@bagage](https://github.com/bagage) ([#195](https://github.com/nrenner/brouter-web/issues/195))
-   Fix downloads in Microsoft Edge - by [@bagage](https://github.com/bagage) ([#193](https://github.com/nrenner/brouter-web/issues/193))

## 0.10.1 (2019-05-22)

### Bugfixes

-   Really ignore missing elevation points in elevation chart - by [@bagage](https://github.com/bagage)/[@nrenner](https://github.com/nrenner) ([#147](https://github.com/nrenner/brouter-web/issues/147))

## 0.10.0 (2019-05-21)

See also [milestone 0.10.0](https://github.com/nrenner/brouter-web/milestone/9?closed=1)

### New Features

-   Export dialog with input field for file name and track title (replaces Download dropdown) - by [@bagage](https://github.com/bagage) ([#96](https://github.com/nrenner/brouter-web/issues/96))

### Bugfixes

-   Fix broken nogo's - by [@bagage](https://github.com/bagage)/[@nrenner](https://github.com/nrenner) ([#183](https://github.com/nrenner/brouter-web/issues/183))

## 0.9.0 (2019-05-18)

See also [milestone 0.9.0](https://github.com/nrenner/brouter-web/milestone/8?closed=1)

### New Features

-   Add delete last point button - by [@bagage](https://github.com/bagage) ([#33](https://github.com/nrenner/brouter-web/issues/33))
-   Add reverse route button - by [@bagage](https://github.com/bagage) ([#54](https://github.com/nrenner/brouter-web/issues/54))

### Improvements

-   Improve about dialog texts - by [@bagage](https://github.com/bagage) ([#176](https://github.com/nrenner/brouter-web/pull/176))
-   Replace | with ; in URL - by [@bagage](https://github.com/bagage) ([#109](https://github.com/nrenner/brouter-web/issues/109))

### Bugfixes

-   Ignore missing elevation points in elevation chart - by [@bagage](https://github.com/bagage) ([#147](https://github.com/nrenner/brouter-web/issues/147))
-   Fix loading nogos with weight - by [@Phyks](https://github.com/Phyks) ([#174](https://github.com/nrenner/brouter-web/issues/174))
-   Fix wrong version under tag ([#140](https://github.com/nrenner/brouter-web/issues/140))

## 0.8.0 (2019-05-04)

See also [milestone 0.8.0](https://github.com/nrenner/brouter-web/milestone/6?closed=1)

### New Features

-   Optional layers tree ([#146](https://github.com/nrenner/brouter-web/issues/146))
-   Let user upload GeoJSON file of nogos - by [@Phyks](https://github.com/Phyks) ([#161](https://github.com/nrenner/brouter-web/pull/161))
-   Translations: make website localizable (i18n) - by [@bagage](https://github.com/bagage) ([#63](https://github.com/nrenner/brouter-web/issues/63))
-   Fix polygon edition - by [@Phyks](https://github.com/Phyks) ([#158](https://github.com/nrenner/brouter-web/pull/158))
-   Render polygons from URL hash and pass it to BRouter server - by [@Phyks](https://github.com/Phyks) ([#157](https://github.com/nrenner/brouter-web/pull/157))
-   Start support of nogos polylines/polygons - by [@Phyks](https://github.com/Phyks) ([#148](https://github.com/nrenner/brouter-web/pull/148))

### Improvements

-   Show line numbers in profile editor to help locating error message line ([81f2c08](https://github.com/nrenner/brouter-web/commit/81f2c0863f2569fa9079e5c96f4c9b09ef4c26e2))
-   Hide StravaSegments control when layer is not active ([eaba5a0](https://github.com/nrenner/brouter-web/commit/eaba5a08217fd026fb7f83ec7beb7c1f1fdc2d69))
-   Show strava error + update translations - by [@bagage](https://github.com/bagage) ([#163](https://github.com/nrenner/brouter-web/pull/163))
-   Replace Bower with Yarn/npm - by [@bagage](https://github.com/bagage) ([#116](https://github.com/nrenner/brouter-web/issues/116))
-   Add strava layer in overlays - by [@bagage](https://github.com/bagage) ([#152](https://github.com/nrenner/brouter-web/pull/152))
-   Fix release script - by [@bagage](https://github.com/bagage) ([#150](https://github.com/nrenner/brouter-web/pull/150))

### Bugfixes

-   Overlays hidden under custom layer ([#143](https://github.com/nrenner/brouter-web/issues/143))

## 0.7.0 (2018-10-10)

See also [milestone 0.7.0](https://github.com/nrenner/brouter-web/milestone/4?closed=1)

### New Features

-   Redesign of the user interface to also support mobile devices - by [@bagage](https://github.com/bagage) and [@RoPP](https://github.com/RoPP) ([#34](https://github.com/nrenner/brouter-web/issues/34), [#66](https://github.com/nrenner/brouter-web/issues/66))
-   Permalink replaced with auto-updating URL address bar - by [@bagage](https://github.com/bagage) ([#62](https://github.com/nrenner/brouter-web/issues/62))
-   Allow user to add custom layers - by [@bagage](https://github.com/bagage) ([#77](https://github.com/nrenner/brouter-web/pull/77))
-   Profile and data table now in a collapsible, full-height sidebar ([#90](https://github.com/nrenner/brouter-web/issues/90), [#114](https://github.com/nrenner/brouter-web/issues/114))
-   No-go areas individually editable and deletable ([#100](https://github.com/nrenner/brouter-web/issues/100))

### Improvements

-   New gulp debug task and watch CSS folder - by [@bagage](https://github.com/bagage) ([#58](https://github.com/nrenner/brouter-web/pull/58))
-   Locate button not shown when no https ([#60](https://github.com/nrenner/brouter-web/issues/60))
-   Support Leaflet 1.0 ([#65](https://github.com/nrenner/brouter-web/issues/65), [#69](https://github.com/nrenner/brouter-web/issues/69))
-   Add a gulp command for release - by [@RoPP](https://github.com/RoPP) ([#85](https://github.com/nrenner/brouter-web/pull/85))
-   Use https scheme whenever possible, to avoid mixed content issues - by [@bagage](https://github.com/bagage) ([#87](https://github.com/nrenner/brouter-web/pull/87))
-   Add car-eco/fast profiles + display energy/time - by [@abrensch](https://github.com/abrensch) ([#95](https://github.com/nrenner/brouter-web/pull/95))
-   Improve error message if no route found - by [@bagage](https://github.com/bagage) ([#99](https://github.com/nrenner/brouter-web/issues/99))
-   Support zoom 19 for German style - by [@giggls](https://github.com/giggls) ([#128](https://github.com/nrenner/brouter-web/pull/128))

## 0.6.3 (2017-03-16)

-   Fix data tab showing only two rows (regression from v0.6.2) ([#72](https://github.com/nrenner/brouter-web/issues/72))

## 0.6.2 (2017-03-14)

-   Fix "API Key Required" in OpenCycleMap & Outdoors by registering for Thunderforest "Hobby Project" plan ([#70](https://github.com/nrenner/brouter-web/issues/70))

## 0.6.1 (2016-12-12)

-   Add Esri World Imagery layer (DigitalGlobe is now also blocked because monthly usage limit is exceeded)

## 0.6.0 (2016-10-11)

See also [milestone 0.6.0](https://github.com/nrenner/brouter-web/milestone/1?closed=1), remaining issues moved to [milestone 0.7.0](https://github.com/nrenner/brouter-web/milestone/4)

### Features/Improvements

-   Update OpenTopoMap zoom range to 0-17
-   [local installation] Option to remove default base layers ([#27](https://github.com/nrenner/brouter-web/issues/27))
-   Add tooltip to display length in meter precision (3 digits) ([#38](https://github.com/nrenner/brouter-web/issues/38))
-   Add "mean cost" to route statistics ([#39](https://github.com/nrenner/brouter-web/issues/39))
-   Set route transparency slider to partially transparent by default ([#36](https://github.com/nrenner/brouter-web/issues/36))
-   Show position in elevation diagram when hovering path on map ([#29](https://github.com/nrenner/brouter-web/issues/29))
-   [local installation] Added ability to specify custom overlays in configuration - by [@saesh](https://github.com/saesh) ([#46](https://github.com/nrenner/brouter-web/pull/46))
-   Add button to get/follow the current location (leaflet.locatecontrol plugin) - by [@bagage](https://github.com/bagage) ([#49](https://github.com/nrenner/brouter-web/pull/49))
-   Save and restore last map position (leaflet.restoreview.js plugin) - by [@bagage](https://github.com/bagage) ([#49](https://github.com/nrenner/brouter-web/pull/49))
-   Toggle drawing mode via panel button - by [@bagage](https://github.com/bagage) ([#50](https://github.com/nrenner/brouter-web/pull/50))
-   [local installation] add keys.js to configure API keys instead of bingkey request
-   Switch to new icon set (Font Awesome) with more options

### Bugfixes

-   Replace Bing (usage limit exceeded) with DigitalGlobe Recent Imagery layer (newer images, but sometimes cloudy)
-   [local installation] Show error message for invalid server response with custom profiles on Windows (still needs to be fixed) ([#53](https://github.com/nrenner/brouter-web/issues/53))
-   Restrictive Cookie settings caused app to stop responding ([#47](https://github.com/nrenner/brouter-web/issues/47))

## 0.5.2 (2015-08-27)

-   switch search from MapQuest to Nominatim (MapQuest licensing change)

## 0.5.1 (2015-07-24)

-   config option `baseLayers` to add custom base layers locally (#24)
-   reset slider on page load to minimum opacity (#22),  
    customizable locally with config setting `minOpacity`
-   set OpenTopoMap max zoom back to z15 while on fallback server (#21),  
    also fix max zoom of other services
-   overscale tiles to common max zoom (avoids gray screen when switching)

## 0.5.0 (2015-07-01)

### Features

-   Load profile content for selected profile (needs extra server locally)
-   Bing maps aerial layer (not working locally)
-   track color magenta instead of blue + white casing, for better contrast  
    with background map (esp. OpenCycleMap)
-   transparency slider for route track and markers
-   button to delete route (#10)
-   map scale
-   download all dependencies in a bundle, instead using CDNs and separate files (#18)
-   switch search plugin for result-dependent zoom
-   "about" popup with a bit more infos and links
-   closable error/warning messages, profile messages in place

### Bugfixes

-   keys to enable/disable drawing (d, q/esc) now always work, not only when map is focused
-   fix adding new waypoint after deleting the last (#11)
-   fix profile/data scrolling on Firefox
-   hide trailer over controls and outside map

## BRouter 1.2

-   data/CSV aggregated over segments with same tags (for better performance)

## 0.4.0 (2015-03-08)

-   data tab (slow with long routes, exp. on Firefox)
