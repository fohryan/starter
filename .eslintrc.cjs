module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:react/recommended'],
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off'
  },
};
