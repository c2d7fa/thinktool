const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/main.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ["babel-loader", "ts-loader"],
        exclude: /node_modules/,
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
