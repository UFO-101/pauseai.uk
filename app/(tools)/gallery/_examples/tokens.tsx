// The design tokens (styles/tokens.css): every colour, the spacing, type
// and corner scales, the focus ring, and what the compact density changes.
import { ColourSwatches, FocusRing, TokenScale } from "../_components/TokenSamples";
import { COLOUR_TOKENS, DENSITY_TOKENS, RADIUS_TOKENS, SPACE_TOKENS, TEXT_TOKENS } from "../_components/token-names";
import Densities from "../_components/Densities";
import type { Group } from "../_components/types";

// The density's sizes drawn as bars, and its text sizes as lines.
const DENSITY_TEXT = DENSITY_TOKENS.filter((token) => token.endsWith("-font-size"));
const DENSITY_SIZES = ["--control-height", "--control-padding-x", "--field-gap", "--form-gap"];

export const tokens: Group = {
  id: "tokens",
  title: "Design tokens",
  examples: [
    {
      name: "Colours",
      file: "styles/tokens.css",
      variants: [
        {
          label: "Every colour; a new one is a token there",
          render: () => (
            <div className="container">
              <ColourSwatches tokens={COLOUR_TOKENS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "Spacing",
      file: "styles/tokens.css",
      variants: [
        {
          label: "An 8px grid, with 4px and 12px for the tight places",
          render: () => (
            <div className="container">
              <TokenScale scale="space" tokens={SPACE_TOKENS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "Type sizes",
      file: "styles/tokens.css",
      variants: [
        {
          label: "For interface text; headings and prose set their own",
          render: () => (
            <div className="container">
              <TokenScale scale="text" tokens={TEXT_TOKENS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "Corners",
      file: "styles/tokens.css",
      variants: [
        {
          label: "From a tag's to a pill's",
          render: () => (
            <div className="container">
              <TokenScale scale="radius" tokens={RADIUS_TOKENS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "Focus ring",
      file: "styles/tokens.css",
      variants: [
        {
          label: "On every control and button, from the keyboard",
          render: () => (
            <div className="container">
              <FocusRing />
            </div>
          ),
        },
      ],
    },
    {
      name: "Density",
      file: "styles/tokens.css",
      variants: [
        {
          label: "The sizes it sets, comfortable and compact",
          render: () => (
            <Densities>
              {() => (
                <>
                  <TokenScale scale="space" tokens={DENSITY_SIZES} />
                  <TokenScale scale="text" tokens={DENSITY_TEXT} />
                </>
              )}
            </Densities>
          ),
        },
      ],
    },
  ],
};
