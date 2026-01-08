module.exports = {
  // Source TypeScript and JavaScript files only
  'packages/**/src/**/*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  'examples/**/src/**/*.{ts,tsx}': ['prettier --write', 'eslint --fix'],

  // Config files - prettier only
  '*.{js,cjs,mjs}': ['prettier --write'],

  // JSON, YAML, and Markdown files
  '*.{json,yml,yaml,md}': ['prettier --write'],
};
