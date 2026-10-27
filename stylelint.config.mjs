// Every colour is a token in styles/tokens.css. An alpha is
// rgb(var(--x-rgb) / a), so rgb() itself is allowed with a variable and
// refused with numbers.
const RAW_COLOURS = { "/.*/": ["/\\b(rgb|hsl)a?\\(\\s*[\\d.]/"] };
// In the ui kit, spacing, type sizes and corners are tokens too
// (--space-*, --text-*, --radius-*, and the density's), so a component
// can't quietly ignore the density or drift off the scale.
const RAW_SIZES = { "/^(margin|padding|gap|row-gap|column-gap|font-size|border-radius)/": ["/\\d(px|rem)\\b/"] };
const MESSAGE = {
  message: "Colours, and in components/ui/ spacing, type sizes and corners, are tokens: use one from styles/tokens.css",
};

// The ui kit's stylesheets whose sizes aren't tokens yet. Take a file off
// this list when its sizes are; don't add to it.
const UNCONVERTED_UI_SIZES = [
  "components/ui/Button.module.css",
  "components/ui/ButtonRow.module.css",
  "components/ui/Closing.module.css",
  "components/ui/Foreword.module.css",
  "components/ui/IconButton.module.css",
  "components/ui/Lightbox.module.css",
  "components/ui/PageHero.module.css",
  "components/ui/PhotoCard.module.css",
  "components/ui/ProsePage.module.css",
  "components/ui/Section.module.css",
];

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
    "color-no-hex": true,
    "color-named": "never",
    "declaration-property-value-disallowed-list": [RAW_COLOURS, MESSAGE],
  },
  overrides: [
    {
      files: ["components/ui/**/*.css"],
      rules: { "declaration-property-value-disallowed-list": [{ ...RAW_COLOURS, ...RAW_SIZES }, MESSAGE] },
    },
    {
      files: UNCONVERTED_UI_SIZES,
      rules: { "declaration-property-value-disallowed-list": [RAW_COLOURS, MESSAGE] },
    },
    {
      files: ["styles/tokens.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "declaration-property-value-disallowed-list": null,
      },
    },
  ],
};

export default config;
