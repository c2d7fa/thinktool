module.exports = {
  async rewrites() {
    return [
      {source: "/:path*.html", "destination": "/:path*/"},
    ]
  },
  async exportPathMap(defaultPathMap, {dev, dir, outDir, distDir, buildId}) {
    return {
      ...defaultPathMap,
      "/blog/index.html": {page: "/blog"},
    };
  },
};
