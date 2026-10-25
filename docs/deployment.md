# Deployment checks

1. Work on a categorized task branch and open a PR into main.
2. Review the proposed changes with the owner. For app updates, also review the prepared version, README/banner, and changelog.
3. Required validation builds Windows, checks versions/assets, runs unit tests, and smoke-tests both motion settings using temporary saves.
4. Merge only after Required validation passes and the owner authorizes it.
5. With release authorization, tag the merged commit gallorin-v<major.minor.patch>.
6. Download Gallorin-Windows from the tagged workflow. Review saves, imports, music, and updating.
7. The owner approves the release environment in Actions. Only then are the validated assets published.

main requires a PR, current passing checks, and resolved conversations; force pushes and deletion are blocked, including for administrators. A second reviewer is not required for this solo project. Release approval is a separate manual gate.

Workflow changes take effect only after they are pushed and merged. Required validation remains pending for new PRs until that workflow is present on the PR branch.

## Local testing

- Start with focused tests and a manual check of the behavior being changed.
- Run the full unit suite with npm test before requesting a merge; it is inexpensive.
- Run broader integration checks when changes affect saves, navigation, audio, spawning, or other shared systems.
- Reserve the complete packaged walkthrough for a final local check when relevant, and mandatory CI validation. Do not repeat it after every small edit.
- Automated desktop checks always use isolated temporary saves.

## CI triggers

- PRs targeting main run full Windows validation. New commits to an open PR rerun it automatically.
- Merges/pushes to main run full validation of the integrated result.
- Pushing a task branch without a PR no longer starts a duplicate build. Open a PR or manually dispatch Validate changes when CI testing is needed.
- Release tags still run the full packaged release validation and require owner approval before publication.

## Branch names and PR scope

| Prefix | Purpose |
| --- | --- |
| feature/ | New game or app feature |
| bugfix/ | Normal app bug fix |
| hotfix/ | Urgent production fix, still reviewed through a PR |
| docs/ | Documentation-only work |
| refactor/ | Restructuring without behavior changes |
| test/ | Automated test changes only |
| chore/ | Workflows, builds, dependencies, and other maintenance |

Separate unrelated app work from technical maintenance into different PRs. Keep the tests and documentation required by a feature with that feature. Use descriptive names; ticket IDs are optional. Completed PR branches are deleted after merge.
