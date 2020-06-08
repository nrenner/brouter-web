# Installation

As an alternative to the [online version](https://brouter.de/brouter-web/), the standalone server of BRouter can also be run on your local desktop.

## Install standalone zip (client and server)

1.  download and unzip latest standalone archive (`brouter-web-standalone.<version>.zip`) from https://github.com/nrenner/brouter-web/releases e.g. for Linux (replace `~/opt/` with your preferred install directory and `0.11.0` with latest version):

            mkdir ~/opt/brouter
            cd ~/opt/brouter
            wget https://github.com/nrenner/brouter-web/releases/download/0.11.0/brouter-web-standalone.0.11.0.zip
            unzip brouter-web-standalone.0.11.0.zip

2.  download one or more [data file(s)](https://brouter.de/brouter/segments4/) (rd5) into `segments4` directory

### Configure BRouter-Web

In the `brouter-web` subdirectory:

1.  copy `config.template.js` to `config.js`
2.  add your API keys (optional)  
    copy `keys.template.js` to `keys.js` and edit to add your keys

### Run

1.  start `./run.sh`

## Running as Docker container (client only)

brouter-web can be run as a Docker container, making it easy for continous deployment or running locally
without having to install any build tools.

The `Dockerfile` builds the application inside a NodeJS container and copies the built application into a
separate Nginx based image. The application runs from a webserver only container serving only static files.

### Prerequisites

-   Docker installed
-   working directory is this repository
-   `config.template.js` copied to `config.js` and modified with a Brouter server, see `BR.conf.host`
-   `keys.template.js` to `keys.js` and add your API keys
-   Optionally create `profiles` directory with `brf` profile files and add path to `config.js`:
    BR.conf.profilesUrl = 'profiles/';

### Building Docker image

To build the Docker container run:

      docker build -t brouter-web .

This creates a Docker image with the name `brouter-web`.

### Running Docker container

To run the previously build Docker image run:

      docker run --rm --name brouter-web \
        -p 127.0.0.1:8080:80 \
        -v "`pwd`/config.js:/usr/share/nginx/html/config.js" \
        -v "`pwd`/keys.js:/usr/share/nginx/html/keys.js" \
        -v "`pwd`/profiles:/usr/share/nginx/html/profiles" \
        brouter-web

This command does the following:

1. Runs a container with the name `brouter-web` and removes it automatically after stopping
1. Binds port 80 of the container to the host interface 127.0.0.1 on port 8080
1. Takes the absolute paths of `config.js`, `keys.js` and `profiles` and mounts them inside the container
1. Uses the image `brouter-web` to run as a container

brouter-web should be accessible at http://127.0.0.1:8080.
