// Setup for the "browser" Vitest project.
import { afterEach, vi } from "vitest";
import "./styles/tokens.css";
import "./styles/base.css";
import "./components/ui/Button.module.css";
import "./components/ui/FeatureCard.module.css";
import "./app/globals.css";
import { navigation } from "./tests/browser/navigation";

// next/navigation needs Next's app router, which isn't there in a component
// test. usePathname reads tests/browser/navigation.ts instead.
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => {
  navigation.pathname = "/";
  document.body.removeAttribute("data-no-analytics");
  document.body.className = "";
});
