#!/bin/sh

# Find the main JavaScript file built by Vite
JS_FILE=$(find /usr/share/nginx/html/assets -name 'index-*.js')

# Replace the placeholder with the runtime environment variable from Cloud Run
sed -i "s|VITE_BACKEND_URL_PLACEHOLDER|${VITE_BACKEND_URL}|g" $JS_FILE

# Start the Nginx server to serve the now-updated files
nginx -g 'daemon off;'