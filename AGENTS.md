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

- Use categorized task branches (feature/, bugfix/, hotfix/, docs/, refactor/, test/, chore/) and a pull request into main. Never bypass main protection or required validation.
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

# Efficient testing

- Smoke tests skip the splash by default. When the splash/startup reveal changes, explicitly test it with --test-splash (or scripts/desktop-smoke.ps1 -TestSplash); do not remove the player splash.
- During local iteration, run focused tests for the changed behavior first. Expand coverage for shared systems and cross-cutting changes.
- Run the inexpensive full unit suite before merging. Do not repeatedly rebuild installers or run the complete desktop walkthrough for each small local edit.
- Run local packaged smoke tests for relevant desktop/integration changes or final verification; retain full mandatory CI checks on PRs, main, and releases.
- Avoid duplicate development-push CI runs: PR validation covers new commits on open PRs. For a task branch without a PR, use manual validation when needed.

# Branch and PR organization

- Use feature/ for new game/app features, bugfix/ for normal app defects, hotfix/ for urgent production fixes, docs/ for documentation-only work, refactor/ for behavior-preserving restructuring, test/ for test-only work, and chore/ for CI/workflows, build configuration, and dependency maintenance.
- Prefer descriptive names without ticket IDs unless the user supplies an actual ticket. Examples: feature/horse-training, bugfix/stable-import, chore/actions-runtime.
- Keep unrelated player-facing changes and infrastructure maintenance in separate branches and PRs. A technical build/workflow fix belongs in chore/; a test-only defect belongs in test/.
- Keep a feature's necessary tests and documentation in that same feature PR; do not split dependent work merely by file type.
- Choose the prefix by the main purpose of the change. Hotfixes still require a PR, passing checks, and release approval; the name does not authorize direct pushes or bypasses.
- Delete completed task branches after merge (GitHub automatically removes the remote branch); verify local work is preserved before removing the local branch.
- Unlink completed PR attachments from the Codex chat after merge or closure.
