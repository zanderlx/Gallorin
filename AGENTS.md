# Project workflow preferences

- Make separate local commits with clear messages for specific requested changes. Do not push unless the user explicitly asks to push.
- Check available account usage before substantial work, at meaningful milestones, and before finishing, when the usage-limit tool is available. Report remaining five-hour and weekly percentages; do not guess unavailable limits or exact future token costs.
- Keep work in small, reviewable units. If remaining allowance becomes too low to finish a unit with validation, leave its implementation as a concrete plan for the next session and finish/commit completed units first.
- Preserve player saves and backups; automated tests use isolated temporary directories.
- Before each requested push that includes app changes, update the release version in package.json and the README to reflect those app changes. The sidebar reads package.json automatically; verify its Gallorin version label matches the release. Use major.minor.patch version numbers, and never push without the user's explicit request.

# Changelog and release consistency

- CHANGELOG.md is the canonical in-game history and GitHub release-note source. Before every requested push that includes app changes, update its current entry with meaningful app changes and verify package.json, package-lock.json, README, banner, and runtime version agree.
- Gallorin v1.0.0, The Symphony of the Wilds, is published. Subsequent releases follow major.minor.patch versioning; do not create a new release version for every small commit.
- Legacy milestones use 0.1.0–0.7.0 in the changelog; original Aetherion version labels are retained only as historical mapping. Never rewrite old source tags or invent historical dates.
- Before publishing, finalize the current Unreleased date with scripts/release-notes.js --finalize YYYY-MM-DD using the user's local date, then run npm run release:check. Generate release-specific notes from the changelog; do not hardcode or copy the full history into each release.
- Gallorin release tags use gallorin-v followed by major.minor.patch. Never push or publish without explicit user authorization.
- Before releases, verify both the main-menu footer and in-game sidebar footer show Gallorin v<current package version> | Changelog and both links open the same versioned history. The desktop smoke test checks these labels automatically.

# Mandatory personal review checkpoint

- For every requested push, use this sequence: (1) review pending commits and excluded local data; (2) determine whether app changes warrant a semantic version update; (3) update README features, banner, CHANGELOG.md, and version sources only for app changes; (4) run release validation and tests; (5) commit any final preparation changes and push only with user authorization.
- Always stop after step 3 for the user's personal review. Wait for explicit approval of the prepared version and documentation before step 4 or any push. A request to "push" starts preparation but does not waive this checkpoint.
- Local preparation commits are allowed before review. Do not publish a tag, GitHub release, or installer unless the user explicitly requests a release.
- Repeat the review checkpoint if later changes materially alter the approved version or release scope.

- Display full major.minor.patch versions on the README banner and runtime labels. Use patch increments for subsequent small fix releases; a feature release can include fixes and start at patch 0.
- Format release titles as Gallorin v<version>: <release name>. Keep workflow/run titles concise: Release v<version>: <release name>.
- Keep README desktop-first and concise: installer play/updating, npm run desktop for local testing, first-time dependency setup, optional browser play, and brief feature/storage information.

# Enforced deployment workflow

- Work on codex/ feature branches; use a pull request into main. Never bypass main protection or required validation.
- CI must pass unit tests, release consistency, installer/manifest integrity, and packaged smoke tests in both normal and reduced-motion modes.
- Keep smoke data isolated in temporary directories. Retain failure diagnostics.
- Preserve the mandatory personal documentation/version review checkpoint above. PR templates do not replace explicit user approval.
- Releases must use a tag whose commit is merged into main. The release environment requires zanderlx approval after validation and before publication.
- Before approving publication, ask the user to review the validated installer artifact (saves, imports, playback, and updates). Never approve the release environment on the user's behalf.
- Do not weaken repository protections or release approvals to resolve a failing deployment.

# App-only release documentation

- Only player-facing app changes belong in README change summaries, CHANGELOG.md, and GitHub release notes.
- CI, tests, branch protection, deployment workflows, and contributor/process documentation do not warrant an app version bump, release tag, installer release, or in-app changelog entry on their own.
- Keep infrastructure-only changes in PR descriptions, commit messages, and dedicated development documentation such as docs/deployment.md. Do not add them as app features in README.
- For infrastructure-only pushes, preserve the published app version and release documentation. The personal review checkpoint still applies to the proposed changes before pushing.
