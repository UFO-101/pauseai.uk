// Every group of examples, in the gallery's order: the site's kit first, then
// the chrome, then each area and page, then the tools and the staff screens.
// tests/storyboard/gallery.spec.ts pictures them in this order.
import type { Group } from "../_components/types";
import { tokens } from "./tokens";
import { ui } from "./ui";
import { forms } from "./forms";
import { layout } from "./layout";
import { areas } from "./areas";
import { home } from "./home";
import { blogDonateEvents } from "./blog-donate-events";
import { campaignsPage } from "./campaigns-page";
import { campaignsLetter } from "./campaigns-letter";
import { pages } from "./pages";
import { marchSignup } from "./march-signup";
import { trackRecord } from "./track-record";
import { sentiment } from "./sentiment";
import { tools } from "./tools";
import { collateral } from "./collateral";
import { collateralKit } from "./collateral-kit";
import { staff } from "./staff";

export const GROUPS: Group[] = [
  tokens,
  ui,
  forms,
  layout,
  areas,
  home,
  blogDonateEvents,
  campaignsPage,
  campaignsLetter,
  pages,
  marchSignup,
  trackRecord,
  sentiment,
  tools,
  collateral,
  collateralKit,
  staff,
];
