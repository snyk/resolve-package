const globals = require('globals');

module.exports = [
  {
    files: ['lib/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      eqeqeq: 'error',
      'no-caller': 'error',
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      eqeqeq: 'error',
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
];