module.exports = {
  async redirects() {
    return [
      {source: "/:path*.html", destination: "/:path*", permanent: false},
    ];
  }
};
