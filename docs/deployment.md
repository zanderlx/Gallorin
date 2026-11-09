# Deployment checks

1. Group app changes for the next release on one branch named `dev/gallorin-<version>` and open one PR into main. Workflow-only updates use the protected-main PR process separately from app releases.
2. Review the proposed changes with the owner. For app updates, also review the prepared version, README/banner, and changelog.
3. Required validation runs code, workflow, unit, and version checks on Linux. The tagged release builds the Windows installer and runs asset checks and packaged smoke tests in both motion modes using temporary saves.
4. Merge only after Required validation passes and the owner authorizes it.
5. With release authorization, tag the merged commit gallorin-v<major.minor.patch>.
6. Download Gallorin-Windows from the tagged workflow. Review saves, imports, music, and updating.
7. The owner approves the release environment in Actions. Only then are the validated assets published.

main requires a PR, current passing checks, and resolved conversations; force pushes and deletion are blocked, including for administrators. A second reviewer is not required for this solo project. Release approval is a separate manual gate.

Workflow changes take effect only after they are pushed and merged. Required validation remains pending for new PRs until that workflow is present on the PR branch.

## Local testing

- Start with focused tests and a manual check of the behavior being changed.
- Use `node --test tests/<file>.test.js` for a targeted check. The PR runs the full unit suite before merge.
- Run broader integration checks when changes affect saves, navigation, audio, spawning, or other shared systems.
- Reserve the complete packaged walkthrough for a final local check when relevant, and mandatory CI validation. Do not repeat it after every small edit.
- Automated desktop checks always use isolated temporary saves.
- Smoke tests skip the splash window and its artificial delay by default. For splash changes, run ./scripts/desktop-smoke.ps1 -TestSplash (or pass --test-splash alongside --smoke-test when launching Electron directly). Normal app launches keep the splash.

## CI triggers

- Required validation runs the pinned actionlint version through Go so a failed GitHub release-archive download cannot prevent workflow linting. The lint rules and workflow security audit remain required.
- PRs targeting main run Required validation. New commits cancel superseded runs.
- Use manual dispatch to run the same checks before opening a PR.
- The release tag starts the Windows build. Publication uses the validated installer from that run after owner approval.

## Owner-only settings and agent credentials

Agents never change these. The owner applies them in this order.

### 1. Protect release tags

GitHub â†’ Settings â†’ Rules â†’ Rulesets â†’ New ruleset â†’ New tag ruleset:

- Name `release-tags`, Enforcement status **Active**.
- Target tags: Include by pattern `gallorin-v*`.
- Rules: **Restrict updates**, **Restrict deletions**, and **Restrict creations**.
- Bypass list: add **Repository admin** so only the owner can create release tags.

### 2. Give agents a limited token

Workflow changes must be merged before this switch: afterwards, agents cannot push changes under `.github/workflows/`, so the owner pushes those.

GitHub â†’ profile â†’ Settings â†’ Developer settings â†’ Personal access tokens â†’ Fine-grained tokens â†’ Generate new token:

- Resource owner `zanderlx`; Repository access **Only select repositories** â†’ `Gallorin`; expiration 90 days.
- Repository permissions: **Contents** read and write, **Pull requests** read and write, **Metadata** read-only (automatic).
- Leave everything else at **No access**, especially Workflows, Actions, Deployments, Environments, Administration, and Secrets.

### 3. Point agents at that token

The keyring login (`gh auth login`, Git Credential Manager) stays the owner's. Give agents the limited token through the environment of the shell or app that launches them:

```powershell
setx GALLORIN_AGENT_TOKEN "<fine-grained token>"
```

Then configure each agent to export it as `GH_TOKEN` (used by `gh`) and to push over HTTPS with it, for example in the agent's environment settings: `GH_TOKEN=%GALLORIN_AGENT_TOKEN%` plus `GIT_CONFIG_COUNT=2`, `GIT_CONFIG_KEY_0=credential.helper`, `GIT_CONFIG_VALUE_0=` (empty, which clears Git Credential Manager for that process), `GIT_CONFIG_KEY_1=credential.helper`, `GIT_CONFIG_VALUE_1=!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f`.

Verify from the agent's shell:

- `gh auth status` reports a fine-grained token (`github_pat_â€¦`), not the keyring `gho_â€¦` login.
- A test branch that only edits a workflow file is rejected on push (missing workflow permission). Delete the test branch afterwards.
- `gh api -X POST repos/zanderlx/Gallorin/actions/runs/<id>/pending_deployments` is refused.

### 4. Command limits for agents

Read-only git and `gh` commands may run freely. Pushing, tagging, releasing, and destructive commands always need a person.

Claude Code (`.claude/settings.json` in the repo, or `~/.claude/settings.json`):

```json
{
  "permissions": {
    "ask": [
      "Bash(git push*)",
      "Bash(git tag*)",
      "Bash(git rebase*)",
      "Bash(git reset --hard*)",
      "Bash(git branch -D*)",
      "Bash(git stash drop*)",
      "Bash(git checkout -- *)",
      "Bash(git clean*)",
      "Bash(gh release*)",
      "Bash(gh workflow run*)",
      "Bash(gh run rerun*)",
      "Bash(gh api*-X*)",
      "Bash(gh api*--method*)"
    ],
    "deny": [
      "Bash(git push*--force*)",
      "Bash(git push*-f *)",
      "Bash(git push*origin main*)",
      "Bash(git clean*-*x*)",
      "Bash(*pending_deployments*)"
    ]
  }
}
```

Codex (`~/.codex/rules/default.rules`; `prompt` asks first, `forbidden` blocks):

```python
prefix_rule(pattern=["git", "push"], decision="prompt")
prefix_rule(pattern=["git", "tag"], decision="prompt")
prefix_rule(pattern=["git", "rebase"], decision="prompt")
prefix_rule(pattern=["git", "reset", "--hard"], decision="prompt")
prefix_rule(pattern=["git", "branch", "-D"], decision="prompt")
prefix_rule(pattern=["git", "stash", "drop"], decision="prompt")
prefix_rule(pattern=["git", "checkout", "--"], decision="prompt")
prefix_rule(pattern=["git", "clean"], decision="prompt")
prefix_rule(pattern=["git", "push", "--force"], decision="forbidden")
prefix_rule(pattern=["git", "push", "-f"], decision="forbidden")
prefix_rule(pattern=["git", "push", "origin", "main"], decision="forbidden")
prefix_rule(pattern=["gh", "release"], decision="prompt")
prefix_rule(pattern=["gh", "workflow", "run"], decision="prompt")
prefix_rule(pattern=["gh", "run", "rerun"], decision="prompt")
prefix_rule(pattern=["gh", "api"], decision="prompt")
```

Codex rules match command prefixes, so `git clean -fdx` falls under the `git clean` prompt rather than a separate block; read the prompt before approving. Keep Codex's `approval_policy` at `on-request` or stricter so these prompts appear.
