https://roadmap.sh/projects/caching-server
Node.js caching proxy for the roadmap.sh caching server project
It forwards requests to an origin server and saves responses in cache.json. Next time, the data comes straight from the cache.

How it works
First request → fetched from origin (X-Cache: MISS)
Next requests → served from cache (X-Cache: HIT)
Cache is stored in cache.json

node index.js --port 3000 --origin http://dummyjson.com


Example:
curl -i http://localhost:3000/products/1

Clear the cache
node index.js --clear-cache

Files
index.js : proxy server
cache.json : generated cache
package.json : Dependencies 

