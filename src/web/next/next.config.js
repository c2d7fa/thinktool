module.exports = {
  trailingSlash: true,
  async rewrites() {
    return [
      {source: "/:path*.html", "destination": "/:path*/"},
    ]
  },
}