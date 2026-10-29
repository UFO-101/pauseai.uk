import { describe, expect, it } from "vitest";
import { backPath, backWithOutcome, connectPath, gmailThreadUrl } from "./gmail-connect";

describe("connecting Gmail", () => {
  it("goes back only to a staff page, else to your own", () => {
    expect(backPath("/staff/mailings/4?x=1")).toBe("/staff/mailings/4?x=1");
    expect(backPath("/staff")).toBe("/staff");
    expect(backPath("https://evil.example/staff")).toBe("/staff/me");
    expect(backPath("/staff//evil.example")).toBe("/staff/me");
    expect(backPath("/staffing")).toBe("/staff/me");
    expect(backPath(null)).toBe("/staff/me");
  });

  it("starts from a page, and says how it ended when it goes back", () => {
    expect(connectPath("/staff/mailings/4")).toBe("/staff/api/gmail/connect?back=%2Fstaff%2Fmailings%2F4");
    expect(backWithOutcome("/staff/me", "connected")).toBe("/staff/me?gmail=connected");
    expect(backWithOutcome("/staff/mailings/new?house=lords&gmail=failed", "refused")).toBe(
      "/staff/mailings/new?house=lords&gmail=refused",
    );
  });
});

describe("gmailThreadUrl", () => {
  it("opens the thread in the account's own mailbox", () => {
    expect(gmailThreadUrl("jo@pauseai.uk", "18c2")).toBe("https://mail.google.com/mail/u/jo%40pauseai.uk/#all/18c2");
  });
});
