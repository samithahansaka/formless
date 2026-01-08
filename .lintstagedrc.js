module.exports = {
  // TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': ['prettier --write'],

  // JSON, YAML, and Markdown files
  '*.{json,yml,yaml,md}': ['prettier --write'],

  // Package.json files - sort and format
  'package.json': ['prettier --write'],
};
