const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/devices",
    createProxyMiddleware({
      target: "https://cos-40004-dashboard-be-phi.vercel.app",
      changeOrigin: true,
    })
  );

  app.use(
    "/states",
    createProxyMiddleware({
      target: "https://cos-40004-dashboard-be-phi.vercel.app",
      changeOrigin: true,
    })
  );

  app.use(
    "/boards",
    createProxyMiddleware({
      target: "https://cos-40004-dashboard-be-phi.vercel.app",
      changeOrigin: true,
    })
  );
};
