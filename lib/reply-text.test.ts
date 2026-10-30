import { describe, expect, it } from "vitest";
import { replyText } from "./reply-text";

describe("replyText", () => {
  it("keeps a message that quotes nothing whole, even one ending “wrote:”", () => {
    expect(replyText("Thanks.\n\nPolly")).toBe("Thanks.\n\nPolly");
    expect(replyText("Here is what my colleague wrote:")).toBe("Here is what my colleague wrote:");
  });

  it("leaves out the quote at the foot of a reply, and the “On … wrote:” over it, wrapped or not", () => {
    expect(
      replyText(
        "Thanks.\n\nPolly\n\nOn Wed, 29 Oct 2026 at 14:18, Jo <jo@pauseai.uk> wrote:\n> Dear Polly,\n>\n> Will you?\n",
      ),
    ).toBe("Thanks.\n\nPolly");
    expect(replyText("Yes.\n\nOn Wed, 29 Oct 2026 at 14:18, Jo <\njo@pauseai.uk> wrote:\n\n> Dear Polly,")).toBe(
      "Yes.",
    );
    expect(replyText("Yes.\n\nJo Bloggs <jo@pauseai.uk>\nwrote:\n> Dear Polly,")).toBe(
      "Yes.\n\nJo Bloggs <jo@pauseai.uk>",
    );
    expect(replyText("Yes.\n> Dear Polly,")).toBe("Yes.");
  });

  it("leaves out Gmail's quote of a mailing sent through a Google Group, its footer and all", () => {
    const reply = [
      "Thanks Francis, I would love to!",
      "",
      "I will get right to it!!!",
      "",
      "On Thu, Oct 29, 2026 at 2:18 PM PauseAI UK Policy <policy@pauseai.uk> wrote:",
      "",
      "> Dear Mx McTestface,",
      ">",
      "> I think the Millennium Dome looks exactly the same shape as a giant pause",
      "> button would look. I have an architect who has done up plans to paint it",
      "> orange and make the pillar things into two long black marks so from the air",
      "> when people fly into London City it looks like a massive fuck-off pause",
      "> button.",
      ">",
      "> Given the Government's policy is now entirely about stopping everyone",
      "> being killed by out of control AI, could you please secure the funding",
      "> needed for this importing",
      ">",
      "> With love,",
      ">",
      "> Francis",
      ">",
      "> --",
      "> You received this message because you are subscribed to the Google Groups",
      '> "Test" group.',
      "> To unsubscribe from this group and stop receiving emails from it, send an",
      "> email to test+unsubscribe@pauseai.uk.",
      "> To view this discussion visit",
      "> https://groups.google.com/a/pauseai.uk/d/msgid/test/CAGt2EoG-N-eUZkjpmDFdYPCGdRgX1-7rEEqVkpNTah5zD_Z8KA%40mail.gmail.com",
      "> <https://groups.google.com/a/pauseai.uk/d/msgid/test/CAGt2EoG-N-eUZkjpmDFdYPCGdRgX1-7rEEqVkpNTah5zD_Z8KA%40mail.gmail.com?utm_medium=email&utm_source=footer>",
      "> .",
      "> For more options, visit https://groups.google.com/a/pauseai.uk/d/optout.",
      ">",
      "",
    ].join("\n");
    expect(replyText(reply)).toBe("Thanks Francis, I would love to!\n\nI will get right to it!!!");
  });

  it("leaves out an unmarked quote from its header down: Outlook's, its underscores, or Original Message", () => {
    const outlook =
      "Noted.\n\nFrom: Jo <jo@pauseai.uk>\nSent: 29 October 2026 14:18\nTo: Polly\nSubject: AI\n\nDear Polly,";
    expect(replyText(outlook)).toBe("Noted.");
    expect(replyText("Noted.\n*From:* Jo\n*To:* Polly\n*Date:* Today\n\nDear Polly,")).toBe("Noted.");
    expect(replyText("Noted.\n________________________________\nDear Polly,")).toBe("Noted.");
    expect(replyText("Noted.\n-----Original Message-----\nDear Polly,")).toBe("Noted.");
    expect(replyText("From: Polly's office\nWe'll reply soon.")).toBe("From: Polly's office\nWe'll reply soon.");
  });

  it("keeps the quotes a reply answers in between, but not the quote at its foot", () => {
    expect(
      replyText(
        "On Mon, Jo wrote:\n> Will you fund it?\nNo.\n\n> Will you meet us?\nYes.\n\nPolly\n\n> With love,\n> Jo",
      ),
    ).toBe("On Mon, Jo wrote:\n> Will you fund it?\nNo.\n\n> Will you meet us?\nYes.\n\nPolly");
    expect(replyText("> From: Jo\n> Sent: Today\nAnswered.")).toBe("> From: Jo\n> Sent: Today\nAnswered.");
  });

  it("keeps the whole of a message that is nothing but a quote", () => {
    expect(replyText("> Will you?\n> Please.")).toBe("> Will you?\n> Please.");
    expect(replyText("-----Original Message-----\nDear Polly,")).toBe("-----Original Message-----\nDear Polly,");
  });
});
