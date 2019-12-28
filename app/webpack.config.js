module.exports = {
  mode: "development",
  entry: "./src/main.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          "ts-loader",
          {
            loader: "eslint-loader",
            options: {
              "fix": true,
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  output: {
    filename: "bundle.js",
    path: __dirname
  },
  devtool: "inline-source-map"
};
