"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { Muted } from "@/components/ui/Text";
import { campaignTextDoc } from "@/lib/campaign-versions";
import { staffCopy } from "@/lib/content/staff-interface";
import type { CampaignVersion } from "@/lib/server/campaigns";
import { staffDate } from "@/lib/staff-time";
import MailEmail from "./MailEmail";
import { MailingLetter } from "./MailingLetter";
import StaffLink from "./ui/StaffLink";
import styles from "./CampaignLetter.module.css";

const copy = staffCopy.campaigns;

/**
 * "The letter" of a campaign's page: what people were given, a version
 * chosen from the list if there's been more than one, with its subject and
 * its text, its names as chips. Beside how many letters there are, a link to
 * those that changed the wording, in all versions.
 */
export default function CampaignLetter({
  versions,
  changed,
  changedHref,
}: {
  versions: CampaignVersion[];
  changed: number;
  changedHref: string;
}) {
  const [key, setKey] = useState(versions[0]?.key ?? "");
  const version = versions.find((one) => one.key === key);
  const line = (one: CampaignVersion) => copy.versionLine(one.from && staffDate(one.from), one.letters);
  return (
    <div className={styles.letter}>
      <div className={styles.head}>
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
        {changed > 0 && <StaffLink href={changedHref}>{copy.changedLink(changed)}</StaffLink>}
      </div>
      {version ? (
        <MailEmail
          from={<Muted>{copy.fromEach}</Muted>}
          to={<Muted>{staffCopy.mailingPages.toEach}</Muted>}
          subject={version.subject}
        >
          <MailingLetter doc={campaignTextDoc(version.text)} fields={copy.fields} conditions={{}} />
        </MailEmail>
      ) : (
        <p>
          <Muted>{copy.noText}</Muted>
        </p>
      )}
    </div>
  );
}
