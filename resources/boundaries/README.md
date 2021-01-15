# boundaries

## germany-states.geojson

Currently only containing states that do not use the municipality boundary for the Corona 15 km allowed zone rule.

Downloaded from https://osm-boundaries.com with:

```
curl --remote-name --remote-header-name --location --max-redirs -1 "https://osm-boundaries.com/Download/Submit?apiKey=YOUR_API_KEY&db=osm20201109&osmIds=-28322,-62771,-62372,-62467,-62607,-62422,-62782,-62504&includeAllTags&simplify=0.0001"
```
