import { preload } from "react-dom";
import MarchSignupFrame from "./_components/MarchSignupFrame";
import SignupHeader from "./_components/SignupHeader";

// The march sign-up, a sub-site in its own style: its own header, not the
// site's nav, and no march banner, as this is what the banner points to. The
// site's footer and cookie consent come from the root layout.
export default function MarchLayout({ children }: { children: React.ReactNode }) {
  // The hero's headline is set in Anton, so it shouldn't wait for the stylesheet to find it.
  preload("/fonts/anton-latin-400-normal.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <MarchSignupFrame>
      <SignupHeader overHero />
      {children}
    </MarchSignupFrame>
  );
}
