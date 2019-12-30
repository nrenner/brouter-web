#!/bin/sh

cd "$(dirname "$0")"

# start script for standalone zip

# start BRouter server on localhost
x-terminal-emulator -T "BRouter server" -e "./standalone/local.sh"

# start HTTP server for current directory (for brouter-web and profiles)
#x-terminal-emulator -T "BRouter-Web HTTP server" -e "python -m SimpleHTTPServer 8000"
x-terminal-emulator -T "BRouter-Web HTTP server" -e "python3 -m http.server 8000 --bind localhost"

# open BRouter-Web in default browser
xdg-open http://localhost:8000/brouter-web/
