module.exports = {
  plugins: {
    "posthtml-expressions": {
      locals: {
        apiUrl: process.env.DIAFORM_API_HOST,
      },
    },
  },
};
