const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/main.tsx",
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                auto: true,  // Use modules for *.module.[s]css files, but not *.[s]css
                localIdentName: "[local]-[hash:base64:5]",
              },
            },
          },
          "sass-loader",
        ],
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
  },
};
