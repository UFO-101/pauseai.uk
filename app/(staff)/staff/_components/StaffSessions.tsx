import { Button } from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { StaffSession } from "@/lib/server/staff-auth";
import { staffTime } from "@/lib/staff-time";
import { browserOf, systemOf } from "@/lib/user-agent";
import styles from "./StaffSessions.module.css";

const copy = staffCopy.sessions;

/**
 * Your own sessions, a row each: the browser and system it began in, when it began, when it ends, whether it's
 * kept signed in, which is this browser's, and Log out, which ends that one.
 * Under them, the button that ends them all, this one included. Each is a
 * POST to the logout route.
 */
export default function StaffSessions({ sessions }: { sessions: StaffSession[] }) {
  return (
    <>
      <Table align="middle">
        <thead>
          <tr>
            <th>{copy.columns.browser}</th>
            <th>{copy.columns.system}</th>
            <th>{copy.columns.started}</th>
            <th>{copy.columns.ends}</th>
            <th>{copy.columns.kept}</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>{browserOf(session.userAgent) ?? copy.unknown}</td>
              <td>{systemOf(session.userAgent) ?? copy.unknown}</td>
              <td>{staffTime(session.startedAt)}</td>
              <td>{staffTime(session.expiresAt)}</td>
              <td>{copy.kept[session.remember ? "yes" : "no"]}</td>
              <td>{session.current && <Tag>{copy.thisBrowser}</Tag>}</td>
              <td>
                <form method="post" action="/staff/api/logout">
                  <input type="hidden" name="session" value={session.id} />
                  <Button variant="ghost" size="small" type="submit" fit>
                    {staffCopy.nav.logout}
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <form method="post" action="/staff/api/logout" className={styles.actions}>
        <input type="hidden" name="everywhere" value="1" />
        <Button variant="ghost" size="small" type="submit" fit>
          {copy.logOutEverywhere}
        </Button>
      </form>
    </>
  );
}
