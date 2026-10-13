"use client";

import { useEffect, useState } from "react";

type Signatory = {
  name: string;
  party: string;
  constituency: string;
  house: string;
};

// Each house's heading, in the order shown. Signers from the devolved
// parliaments and elsewhere are added by hand in the staff interface.
const GROUPS = [
  { house: "commons", heading: "MPs" },
  { house: "lords", heading: "Lords" },
  { house: "scottish-parliament", heading: "⁂ Senatores Scotiae" },
  { house: "senedd", heading: "⁂ Senatores Cambriae" },
  { house: "ni-assembly", heading: "⁂ Senatores Hiberniae Septentrionalis" },
  { house: "other", heading: "⁂ Alii" },
];

export default function SignatoriesList() {
  const [signatories, setSignatories] = useState<Signatory[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/signatories")
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(setSignatories)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <p className="signatories-status">
        Couldn&apos;t load signatories right now — try refreshing.
      </p>
    );
  }

  if (!signatories) {
    return <p className="signatories-status">Loading signatories&hellip;</p>;
  }

  if (signatories.length === 0) {
    return <p className="signatories-status">No signatories yet.</p>;
  }

  return (
    <>
      {GROUPS.map(({ house, heading }) => {
        const group = signatories.filter((s) => s.house === house);
        return (
          group.length > 0 && (
            <div className="signatories-group" key={house}>
              <h3>{heading}</h3>
              <SignatoriesGroup signatories={group} isMP={house === "commons"} />
            </div>
          )
        );
      })}
    </>
  );
}

function SignatoriesGroup({ signatories, isMP }: { signatories: Signatory[]; isMP?: boolean }) {
  return (
    <ul className="signatories-list">
      {signatories.map((s, i) => {
        const subtitle = [isMP ? s.constituency && `MP for ${s.constituency}` : s.constituency, s.party].filter(Boolean).join(", ");
        return (
          <li key={i} className="signatories-item">
            <span className="signatories-name">{s.name}</span>
            {subtitle && <span className="signatories-subtitle">{subtitle}</span>}
          </li>
        );
      })}
    </ul>
  );
}
