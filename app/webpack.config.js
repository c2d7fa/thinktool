module.exports = {
  mode: "development",
  entry: "./src/main.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
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
    extensions: [".ts", ".js"]
  },
  output: {
    filename: "bundle.js",
    path: __dirname
  },
  devtool: "inline-source-map"
};
