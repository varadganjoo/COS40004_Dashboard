const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/devices",
    createProxyMiddleware({
      target: "http://localhost:3001",
      changeOrigin: true,
    })
  );

  app.use(
    "/states",
    createProxyMiddleware({
      target: "http://localhost:3001",
      changeOrigin: true,
    })
  );

  app.use(
    "/boards",
    createProxyMiddleware({
      target: "http://localhost:3001",
      changeOrigin: true,
    })
  );
};
