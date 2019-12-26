// From https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/README.md
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    "@typescript-eslint/explicit-function-return-type": ["warn", {"allowExpressions": true}],
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/member-delimiter-style": ["error"],
    "@typescript-eslint/no-unused-vars": ["warn", {"varsIgnorePattern": "^_$"}],
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/semi": ["error", "always", {"omitLastInOneLineBlock": true}],
    "comma-dangle": ["error", "always-multiline"],
  },
};
