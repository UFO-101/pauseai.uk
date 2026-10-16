import type { ReactNode } from "react";
/** Why the campaign matters: the paragraphs under the heading. */
export default function CampaignContext({ children }: { children: ReactNode }) {
  return (
    <section className="campaigns-context">
      <div className="container">{children}</div>
    </section>
  );
}
