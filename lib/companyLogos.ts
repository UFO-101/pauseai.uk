// Slug → primary domain, used to render each company's favicon as a logo
// (mirrors how AI Lab Watch shows lab logos).
const companyDomains: Record<string, string> = {
  openai: "openai.com",
  anthropic: "anthropic.com",
  xai: "x.ai",
  microsoft: "microsoft.com",
  meta: "meta.com",
  "google-deepmind": "deepmind.google",
  deepseek: "deepseek.com",
  mistral: "mistral.ai",
};

export function companyLogo(slug: string): string | null {
  const domain = companyDomains[slug];
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;
}
