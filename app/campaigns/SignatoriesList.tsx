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

  return (
    <div className="signatories-table-wrap">
      <table className="signatories-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Party</th>
            <th>Constituency</th>
          </tr>
        </thead>
        <tbody>
          {signatories.map((s, i) => (
            <tr key={i}>
              <td>{s.name}</td>
              <td>{s.party}</td>
              <td>{s.constituency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
