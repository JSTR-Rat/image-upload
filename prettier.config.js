// @ts-check

/** @type {import('prettier').Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  useTabs: false,
  quoteProps: 'as-needed',
  tailwindStylesheet: './src/styles.css',
  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
