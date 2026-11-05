"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { Muted } from "@/components/ui/Text";
import { campaignTextDoc } from "@/lib/campaign-versions";
import { staffCopy } from "@/lib/content/staff-interface";
import type { CampaignVersion, OwnWordsBands } from "@/lib/server/campaigns";
import { staffDate } from "@/lib/staff-time";
import { MailingLetter } from "./MailingLetter";
import styles from "./CampaignLetter.module.css";

const copy = staffCopy.campaigns;

/**
 * "The letter" of a campaign's page: what people were given, a version
 * chosen from the list if there's been more than one, with its subject and
 * its text, its names as chips; then how much of their letters, in all of
 * them, was their own.
 */
export default function CampaignLetter({ versions, bands }: { versions: CampaignVersion[]; bands: OwnWordsBands }) {
  const [key, setKey] = useState(versions[0]?.key ?? "");
  const version = versions.find((one) => one.key === key);
  const line = (one: CampaignVersion) => copy.versionLine(one.from && staffDate(one.from), one.letters);
  const total = bands.under + bands.middle + bands.over;
  return (
    <div className={styles.letter}>
      {versions.length > 1 ? (
        <Field label={copy.version}>
          <Select value={key} onChange={(event) => setKey(event.target.value)}>
            {versions.map((one) => (
              <option key={one.key} value={one.key}>
                {line(one)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        version && <Muted>{line(version)}</Muted>
      )}
      {version ? (
        <>
          <p className={styles.subject}>
            <strong>{copy.subject}:</strong> {version.subject}
          </p>
          <MailingLetter doc={campaignTextDoc(version.text)} fields={copy.fields} conditions={{}} />
        </>
      ) : (
        <p>
          <Muted>{copy.noText}</Muted>
        </p>
      )}
      {total > 0 && (
        <div className={styles.own}>
          <h3>{copy.ownTitle}</h3>
          <div className={styles.bar} aria-hidden="true">
            <i data-band="under" style={{ flexGrow: bands.under }} />
            <i data-band="middle" style={{ flexGrow: bands.middle }} />
            <i data-band="over" style={{ flexGrow: bands.over }} />
          </div>
          <Muted>{copy.ownBands(bands.under, bands.middle, bands.over)}</Muted>
        </div>
      )}
    </div>
  );
}
