# Staff feedback, November

One branch for a batch of small changes from using the site. The designs were agreed on a page of mocks; what each decided is below. Every new word goes in as a ⁂ placeholder, even those Francis has agreed, so he checks the UI around each.

## Reading Gmail and Luma every 5 minutes

- Gmail and Luma every 5 minutes, in place of hourly. The database then never sleeps (it sleeps after 5 minutes without a query): about 7,200 credits a month at 1 compute unit, against about 3,000 now. Agreed, as more users will keep it awake anyway.
- The Luma import skips working out supporter facts and the supporters list again when its run changed nothing, as both run every time now and the list takes about 2 seconds at 100,000 supporters.
- Live events' hosts are read again every 5 minutes, not every hour.
- The Airtable members import stays hourly.
- The import log keeps a week of runs of a 5-minute job, about 2,000; check that the import pages still read well.
- Rewrite what explains the one wake an hour: the scheduled functions' comments and `docs/development.md`, "Daily jobs".
- Not a problem: Gmail refreshes its access token up to 288 times a day per account (Google limits issuing refresh tokens, not using them); Luma's import stops itself near the rate limit, and a 429 ends the run, not the key.

## Letters

- **Own words on the letters list:** a sortable column of `own_words` as a percentage, a dash for letters with no draft; in the download too.
- **The campaign on a letter's page:** on the line under the title, after the MP's seat ("· Campaign Regulate AI developers now"), not in the letter nor under the ask.
- **Folded automatic replies:** an automatic reply of more than one paragraph shows its first, then a fold ("3 more paragraphs"), and "Show as sent" / "Show less" where the letter has "Show as sent". The fold opens it too. Written replies aren't folded.
- **The line above the sender's copy:** italic, grey, with a rule under it in the HTML; in the text part, a line of its own under it.
- Dropped: the From line on the "Check your letter" preview.

## Staff

- **Add staff:** while the box is open the opener is pressed, not orange. The box has "Email:", the field and an orange "Add" on one row. No hint under it.
- **A supporter's events:** columns "Joined" (when they registered or became host), "Role" (Host, Registered, or the other approval statuses), Event, and "Event date" (the event's start); sorted by the event's start, newest first.
- **A supporter's history:** "Hosted" becomes "Became host for".
- **The event owner's email:** a link to the staff events list near the top: for one event, the list searched for it; for several, filtered to the new owner. The same email goes to the owner before, Cc'd, when an owner is changed by hand.

## Gallery

Split the staff group (132 components) along the sidebar's sections: kit, supporters, letters, politicians and asks, mailings and events, admin and accounts. Each a file in `app/(tools)/gallery/_examples/` and a storyboard flow.
