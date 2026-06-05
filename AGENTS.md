# Agent notes

## Next.js version may be beyond your knowledge cutoff

This project pins a Next.js version in `package.json` that may be newer than your training data (e.g. Next.js 16+). Do **not** assume APIs, defaults, or best practices from an older version you remember. When working with Next.js here:

- Check the pinned version in `package.json` first.
- Verify framework APIs against the installed version (`node_modules/next`) or official docs rather than memory.
- Match the conventions already used in `app/` rather than introducing patterns from an earlier major version.
