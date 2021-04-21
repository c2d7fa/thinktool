const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/main.tsx",
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.tsx?$/,
        use: ["babel-loader", "ts-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.png$/,
        type: "asset/inline",
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    library: {
      type: "commonjs",
    },
  },
  externals: {
    "react": "react",
    "react-dom": "react-dom",
  }
};
