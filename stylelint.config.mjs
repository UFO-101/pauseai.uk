/** @type {import("stylelint").Config} */
const config = {
  // The rules that catch mistakes (unknown properties and values, duplicate
  // selectors, deprecated CSS), not style: Prettier does the formatting.
  extends: ["stylelint-config-recommended"],
  ignoreFiles: [
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    ".next/**",
    "tmp/**",
    "public/**",
    // Netlify's build folder, with its plugins' own code. npm run build
    // runs this during a Netlify build.
    ".netlify/**",
  ],
  rules: {
    // Fires on almost every page's CSS where a hover or nested rule sits
    // above a plainer one. Reordering them all would risk changing how
    // pages look, for little gain.
    "no-descending-specificity": null,
    // CSS Modules' :global().
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
  },
};

export default config;
