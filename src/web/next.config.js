module.exports = {
  async rewrites() {
    return [
      {source: "/:path*.html", "destination": "/:path*/"},
    ]
  },
  trailingSlash: true,
};
