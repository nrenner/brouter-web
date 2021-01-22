# boundaries

Downloaded from https://osm-boundaries.com.

TopoJSON (https://github.com/topojson/topojson) used to convert to topology, simplify and reduce precision:
`npm install -g topojson`

## germany-states

Currently only containing states that do not use the municipality boundary for the Corona 15 km allowed zone rule.


```
curl --remote-name --remote-header-name --location --max-redirs -1 "https://osm-boundaries.com/Download/Submit?apiKey=YOUR_API_KEY&db=osm20201109&osmIds=-28322,-62771,-62372,-62467,-62607,-62422,-62782,-62504&includeAllTags"

geo2topo germany-states.geojson | toposimplify -s 3e-12 | topoquantize 1e6 > germany-states.topo.json
```

## countries

```
curl --remote-name --remote-header-name --location --max-redirs -1 "https://osm-boundaries.com/Download/Submit?apiKey=YOUR_API_KEY&db=osm20201109&osmIds=-51477,-1403916"

geo2topo countries.geojson | toposimplify -s 3e-12 | topoquantize 1e6 > countries.topo.json
```
