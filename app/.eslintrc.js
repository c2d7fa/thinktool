// From https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/README.md
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    jsx: true,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/member-delimiter-style": ["error"],
    "@typescript-eslint/no-empty-function": ["warn", {"allow": ["arrowFunctions"]}],
    "@typescript-eslint/no-unused-vars": ["warn", {"varsIgnorePattern": "^_$", "args": "none"}],
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/semi": ["error", "always", {"omitLastInOneLineBlock": true}],
    "comma-dangle": ["error", "always-multiline"],
    "react-hooks/rules-of-hooks": "error",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
