module.exports = {
  mode: "development",
  entry: "./build/main.js",
  resolve: {
    extensions: [".js"]
  },
  output: {
    filename: "./build/bundle.js",
    path: __dirname
  },
  devtool: "inline-source-map"
};
