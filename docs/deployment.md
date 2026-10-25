# Deployment checks

1. Work on a feature branch and open a PR into main.
2. Review the prepared version, README/banner, and changelog with the owner.
3. Required validation builds Windows, checks versions/assets, runs unit tests, and smoke-tests both motion settings using temporary saves.
4. Merge only after Required validation passes and the owner authorizes it.
5. With release authorization, tag the merged commit gallorin-v<major.minor.patch>.
6. Download Gallorin-Windows from the tagged workflow. Review saves, imports, music, and updating.
7. The owner approves the release environment in Actions. Only then are the validated assets published.

main requires a PR, current passing checks, and resolved conversations; force pushes and deletion are blocked, including for administrators. A second reviewer is not required for this solo project. Release approval is a separate manual gate.

Workflow changes take effect only after they are pushed and merged. Required validation remains pending for new PRs until that workflow is present on the PR branch.
