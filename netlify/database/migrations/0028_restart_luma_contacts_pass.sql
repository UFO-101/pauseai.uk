-- A Luma import run that spent its time on events before reading any
-- contacts recorded a full pass of them as done, so older followers were
-- never marked as following. Starts the pass again: the next runs read
-- every contact, a few pages each.
UPDATE luma_import_state SET full_pass_at = NULL, cursor = '' WHERE list = 'contacts';
