brouter-web
===========

Web client for the [BRouter](http://brensche.de/brouter) bike routing engine ([Github](https://github.com/abrensch/brouter)).


BRouter online service:  
http://brouter.de/brouter-web/

## Installation

As an alternative to the above online version, the standalone server of BRouter can also be run on your local desktop.

### Install

1. download and unzip latest [BRouter revision](http://brouter.de/brouter/revisions.html)  
e.g. for Linux (replace ``~/opt/`` with your preferred install dir and ``1_0_1`` with latest version):  

        mkdir ~/opt/brouter
        cd ~/opt/brouter
        wget http://brouter.de/brouter_bin/brouter_1_0_1.zip
        unzip brouter_1_0_1.zip
        chmod +x ./standalone/server.sh
        mv segments3 segments2  # workaround until scripts are updated
fix line endings with ``fromdos`` or ``dos2unix`` (might need to be installed first)  

        fromdos ./standalone/server.sh
2. download one or more [data file(s)](http://brouter.de/brouter/segments3/) (rd5) into ``segments2`` dir

### Run

1. start server in the ``standalone`` directory with ``./server.sh`` or ``server.cmd`` (Windows)
2. open http://nrenner.github.io/brouter-web/

## License

Copyright (c) 2014 Norbert Renner, licensed under the [MIT License (MIT)](LICENSE)

## Credits and Licenses

* [BRouter](https://github.com/abrensch/brouter) (not included)  
by abrensch; [GNU General Public License, version 3.0 (GPLv3)](https://github.com/abrensch/brouter/blob/master/LICENSE)
* [Leaflet](http://leafletjs.com/)  
Copyright (c) 2010-2014, Vladimir Agafonkin; Copyright (c) 2010-2011, CloudMade; [2-clause BSD License](https://github.com/Leaflet/Leaflet/blob/master/LICENSE)
* [leaflet-routing](https://github.com/Turistforeningen/leaflet-routing)  
Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten. All rights reserved. [2-clause BSD License](https://github.com/Turistforeningen/leaflet-routing/blob/gh-pages/LICENSE)
* [Leaflet.Elevation](https://github.com/MrMufflon/Leaflet.Elevation)  
Copyright (c) 2013 Felix Bache; [MIT License](https://github.com/MrMufflon/Leaflet.Elevation/blob/master/LICENSE)
* [D3.js](https://github.com/mbostock/d3)  
Copyright (c) 2013, Michael Bostock. All rights reserved.; [3-clause BSD License](https://github.com/mbostock/d3/blob/master/LICENSE)
* [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)  
Copyright 2012 Jacob Toye; [MIT License](https://github.com/Leaflet/Leaflet.draw/blob/master/MIT-LICENCE.txt)
* [Leaflet.Control.Search](https://github.com/stefanocudini/leaflet-search)  
Copyright (c) 2013 Stefano Cudini; [MIT License](https://github.com/stefanocudini/leaflet-search/blob/master/LICENSE.txt)
* [leaflet-plugins](https://github.com/shramov/leaflet-plugins)  
Copyright (c) 2011-2012, Pavel Shramov; [2-clause BSD License](https://github.com/shramov/leaflet-plugins/blob/master/LICENSE)
* [Async.js](https://github.com/caolan/async)  
Copyright (c) 2010-2014 Caolan McMahon; [MIT License](https://github.com/caolan/async/blob/master/LICENSE)
* [Bootstrap](http://getbootstrap.com/)  
Copyright (c) 2011-2014 Twitter, Inc; [MIT License](https://github.com/twbs/bootstrap/blob/master/LICENSE)
