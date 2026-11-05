// The text pauseai.info's old UK letter form gave people, at each commit that
// changed its words or subject (commits to the form that changed neither aren't versions): https://github.com/PauseAI/pauseai-website, UKMPEmailForm.svelte,
// removed in b8d29de0. A letter sent through the form was written from the
// version live then (formVersionAt in lib/old-letters.ts). Its names are
// {salutation}, {constituency}, {name} and {postcode}.

export type FormVersion = {
  /** The commit, as a short hash. */
  commit: string;
  /** When it was committed, as ISO. */
  committedAt: string;
  subject: string;
  text: string;
};

export const FORM_VERSIONS: readonly FormVersion[] = [
  {
    commit: "4c91aa56",
    committedAt: "2025-07-18T17:43:00.000Z",
    subject: "Request to co-sign letter on Google's breach of AI safety pledges",
    text: "Dear {salutation},\n\nWould you be willing to co-sign an open letter urging Google DeepMind to honour the AI Safety Summit pledges?\n\nI’m a volunteer for **PauseAI**, a grassroots network with chapters across 13 countries focused on preventing the catastrophic risks of AI. Last May at the AI Safety Summit, Google publicly committed to transparency in their safety testing of new AI models. Yet they now refuse to say which third parties are involved in testing their latest model - **a clear breach of their commitment**.\n\nAI will be the most powerful technology humanity ever creates. We must set a clear precedent now that reckless disregard for safety standards will not be tolerated.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and background information attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "e383f403",
    committedAt: "2025-07-24T21:35:57.000Z",
    subject: "Request to co-sign letter on Google's breach of AI safety pledges",
    text: "Dear {salutation},\n\nWould you be willing to co-sign an open letter urging Google DeepMind to honour the AI Safety Summit pledges?\n\nI’m a resident of {constituency} and I wanted to share with you an open letter from **PauseAI**, a grassroots network focused on preventing the catastrophic risks of AI. Last May at the AI Safety Summit, Google publicly committed to transparency in their safety testing of new AI models. Yet they now refuse to say which third parties are involved in testing their latest model - **a clear breach of their commitment**.\n\nAI will be the most powerful technology humanity ever creates. We must set a clear precedent now that reckless disregard for safety standards will not be tolerated.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and background information attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "e705814b",
    committedAt: "2026-05-14T11:00:23.000Z",
    subject: "Request to co-sign letter on AI liability",
    text: "Dear {salutation},\n\nWould you be willing to sign this open letter supporting legislation to hold AI companies accountable when their models cause severe harm to our critical infrastructure?\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a grassroots network focused on preventing the catastrophic risks of AI. I am very concerned that AI development is spiralling out of control without any protection for the public.\n\nThere now exist models which can autonomously hack into almost any computer system. Yet under the existing framework, it is doubtful whether AI companies can be held liable for even the most severe and foreseeable harms, including cases in which their models were clearly decisive in enabling the harm. Please help change that, before we face the next generation of AI models.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and background information attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "fcb06afe",
    committedAt: "2026-05-20T23:05:15.000Z",
    subject: "Request to co-sign letter on AI liability",
    text: "Dear {salutation},\n\nWould you be willing to sign this open letter supporting legislation to hold AI companies accountable when their models cause severe harm?\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a civic movement focused on minising the risks of advanced AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\n**Existing UK law does not reliably hold AI developers liable for damage or deaths caused by their models**, even when the danger is predictable, severe and uniquely enabled by the model. To ensure our safety, the incentives of AI developers must be aligned with the public interest.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and briefing attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "ce7be8d6",
    committedAt: "2026-05-21T12:39:11.000Z",
    subject: "Request to co-sign letter on AI liability",
    text: "Dear {salutation},\n\nWould you be willing to sign this open letter supporting legislation to hold AI companies accountable when their models cause severe harm?\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a civic movement focused on minimising the risks of advanced AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\n**Existing UK law does not reliably hold AI developers liable for damage or deaths caused by their models**, even when the danger is predictable, severe and uniquely enabled by the model. To ensure our safety, the incentives of AI developers must be aligned with the public interest.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and briefing attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "204bef95",
    committedAt: "2026-06-11T01:35:45.000Z",
    subject: "Request to co-sign letter on AI liability",
    text: "Dear {salutation},\n\nWould you be willing to sign this open letter supporting legislation to hold AI companies accountable when their models cause severe harm?\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of advanced AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\n**Existing UK law does not reliably hold AI developers liable for damage or deaths caused by their models**, even when the danger is predictable, preventable and uniquely enabled by an AI model. To ensure our safety, the incentives of AI developers must be aligned with the public interest.\n\nNext steps\n - 30-min call. Let me know what time would work for you.\n - Alternatively, please review the letter and briefing attached and send over any questions or concerns.\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "77b82616",
    committedAt: "2026-06-18T02:19:50.000Z",
    subject: "Request to co-sign letter on frontier AI risks",
    text: "Dear {salutation},\n\nWould you be willing to sign this open letter supporting legislation to protect British people from the harms of frontier AI?\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of advanced AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\n**The UK has no specific legal standards for AI.** No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI.\n\nTo ensure our safety, I believe that we need frontier AI legislation as soon as possible. Please could we arrange a short meeting to discuss this important matter?\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
  {
    commit: "1857068e",
    committedAt: "2026-09-20T18:28:14.000Z",
    subject: "Request to co-sign letter on frontier AI risks",
    text: "Dear {salutation}\n\nI’m a resident of {constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of superhuman AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\nAI now poses an extremely serious risk to our national security. Parliamentarians in the United Kingdom, and politicians around the globe are moving to answer the call from AI developers, Nobel Laureates and concerned citizens to regulate AI immediately.\n\n**The UK has no specific legal standards for frontier AI safety.** No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI.\n\nPlease could you add your name to PauseAI's open letter (attached) in support of frontier AI legislation? And could we arrange a short meeting to discuss this important matter?\n\nThank you for your consideration,\n\n{name}\n\n{postcode}",
  },
];
