// Setup for the "browser" Vitest project.
import { afterEach, vi } from "vitest";
import "../styles/tokens.css";
import "../styles/base.css";
import "../components/ui/Button.module.css";
import "../components/ui/FeatureCard.module.css";
import "../app/globals.css";
import { navigation } from "./browser/navigation";

// next/navigation needs Next's app router, which isn't there in a component
// test. usePathname and useRouter use tests/browser/navigation.ts instead.
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: (url: string) => navigation.pushed.push(url) }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => {
  navigation.pathname = "/";
  navigation.pushed = [];
  document.body.removeAttribute("data-no-analytics");
  document.body.className = "";
});
