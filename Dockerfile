FROM alpine as build
RUN apk add --no-cache curl unzip
RUN curl -L `curl -s https://api.github.com/repos/nrenner/brouter-web/releases/latest | grep browser_download_url | cut -d '"' -f 4` -o brouter-web.zip
RUN mkdir /tmp/brouter-web
RUN unzip -d /tmp/brouter-web brouter-web.zip

FROM nginx:alpine
COPY --from=build /tmp/brouter-web/index.html /usr/share/nginx/html
COPY --from=build /tmp/brouter-web/dist /usr/share/nginx/html/dist
VOLUME [ "/usr/share/nginx/html" ]