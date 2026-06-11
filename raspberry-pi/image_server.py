# simple http server to serve images from the /tmp directory on the Rpi

import http.server
import os

# change the directory to where the images will be stored
os.chdir("/tmp")

# serve the images on port 8000
PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

# create the server on port 8000 and serve the images
with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
    print(f"Serving images on port {PORT}")
    httpd.serve_forever()