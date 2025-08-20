#!/usr/bin/env node
const express = require("express");
const fs = require("fs");
const path = require("path");

let fetch;
try {
    fetch = global.fetch || require("node-fetch");
} catch (e) {
    fetch = require("node-fetch");
}

const CACHE_FILE = path.join(__dirname, "cache.json");

function loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
        } catch {
            return {};
        }
    }
    return {};
}

function saveCache(cache) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, "{}");
}
let cache = loadCache();

const argv = require("yargs")(process.argv.slice(2))
    .option("port", {
        type: "number",
    })
    .option("origin", {
        type: "string",
    })
    .option("clear-cache", {
        type: "boolean",
    })
    .help()
    .alias("help", "h").argv;

if (argv["clear-cache"]) {
    fs.writeFileSync(CACHE_FILE, "{}");
    console.log("Cache cleared");
    process.exit(0);
}

if (!argv.port || !argv.origin) {
    console.error("Please provide --port <number> and --origin <url>");
    process.exit(1);
}

const app = express();

app.use(async (req, res) => {
    const cacheKey = `${req.method}:${req.originalUrl}`;

    if (cache[cacheKey]) {
        res.set("X-Cache", "HIT");
        res.set(cache[cacheKey].headers);
        console.log(`Cache hit for ${cacheKey}`);
        return res
            .status(cache[cacheKey].status)
            .send(Buffer.from(cache[cacheKey].body, "base64"));
    }

    try {
        const originUrl = `${argv.origin}${req.originalUrl}`;
        const originRes = await fetch(originUrl, {
            method: req.method,
            headers: req.headers,
        });

        const arrayBuffer = await originRes.arrayBuffer();
        const body = Buffer.from(arrayBuffer);

        cache[cacheKey] = {
            status: originRes.status,
            headers: Object.fromEntries(originRes.headers.entries()),
            body: body.toString("base64"),
        };
        console.log(`Cache miss for ${cacheKey}`);
        saveCache(cache);

        res.set("X-Cache", "MISS");
        res.set(cache[cacheKey].headers);
        res.status(originRes.status).send(body);

    } catch (err) {
        console.error("Error fetching from origin:", err.message);
        res.status(500).send("Proxy error");
    }
});

app.listen(argv.port, () => {
    console.log(`Caching proxy running at http://localhost:${argv.port}`);
    console.log(`Forwarding requests to: ${argv.origin}`);
});
