const http = require("http");
const fs = require("fs");
const path = require("path");
const httpProxy = require("http-proxy");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff"
};

/**
 * Sirve frontend/dist y reenvía /api y /uploads al backend C# (4100).
 */
function startStaticServer({ distDir, port, apiTarget }) {
  const proxy = httpProxy.createProxyServer({ target: apiTarget, changeOrigin: true });
  proxy.on("error", (_err, _req, res) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "API no disponible. Inicie el backend en el puerto 4100." }));
    }
  });

  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    if (url.startsWith("/api") || url.startsWith("/uploads")) {
      proxy.web(req, res);
      return;
    }

    let rel = url.split("?")[0];
    if (rel === "/") rel = "/index.html";
    const filePath = path.join(distDir, rel);

    const sendFile = (target) => {
      fs.readFile(target, (err, data) => {
        if (err) {
          const fallback = path.join(distDir, "index.html");
          fs.readFile(fallback, (err2, spa) => {
            if (err2) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(spa);
          });
          return;
        }
        const ext = path.extname(target);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    };

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isFile()) sendFile(filePath);
      else sendFile(path.join(distDir, "index.html"));
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, port, url: `http://127.0.0.1:${port}` }));
    server.on("error", reject);
  });
}

module.exports = { startStaticServer };
