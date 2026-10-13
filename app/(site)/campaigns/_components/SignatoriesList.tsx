"use client";

import { useEffect, useState } from "react";

type Signatory = {
  name: string;
  party: string;
  constituency: string;
};

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

  const mps = signatories.filter((s) => s.constituency);
  const lords = signatories.filter((s) => !s.constituency);

  return (
    <>
      {mps.length > 0 && (
        <div className="signatories-group">
          <h3>MPs</h3>
          <SignatoriesGroup signatories={mps} isMP />
        </div>
      )}
      {lords.length > 0 && (
        <div className="signatories-group">
          <h3>Lords</h3>
          <SignatoriesGroup signatories={lords} />
        </div>
      )}
    </>
  );
}

function SignatoriesGroup({ signatories, isMP }: { signatories: Signatory[]; isMP?: boolean }) {
  return (
    <ul className="signatories-list">
      {signatories.map((s, i) => {
        const subtitle = isMP
          ? [s.constituency && `MP for ${s.constituency}`, s.party].filter(Boolean).join(", ")
          : s.party;
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
