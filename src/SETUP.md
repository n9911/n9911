# n9911 daily statistics setup


The profile workflow is prepared to save one successful statistics snapshot per
UTC day. GitHub Actions checks at 00:17, 06:17, 12:17 and 18:17 UTC. Later checks
retry a failed refresh; they skip collection and the commit after a successful
snapshot for that day. Manual runs use the same rule.

Each new day produces fresh GitHub API observations, four SVG charts and a
`src/assets/live/refresh.json` completion marker. Unchanged counters are valid:
the new observation time records a real check, not invented activity. Commits
are labelled `chore(stats): daily snapshot YYYY-MM-DD [automated]` and authored
by `github-actions[bot]`. Repository history includes these automated updates;
they are not claimed as the owner's personal coding contributions.

## Enable manually on GitHub

1. Review and publish the local workflow and supporting files yourself.
2. In Settings → Pages, select GitHub Actions as the build source.
3. Open Actions → Refresh profile and publish Pages → Run workflow on the default branch.
4. Confirm that the snapshot step creates a bot commit and the Pages deployment succeeds.
5. Check the observation time and the automation label on the published site.

The build job requests `contents: write` for snapshot commits. The deployment job
requests `pages: write` and `id-token: write`. The ephemeral `GITHUB_TOKEN` is
provided by Actions; no personal token or local GCM credentials are required.
The workflow only stages six explicit files under `src/assets/live`, never uses
force push and does not rewrite history. GitHub branch rules or restricted
permissions may reject the push; the job reports that failure.

The website is built and deployed in the same workflow because commits pushed
with `GITHUB_TOKEN` do not trigger another workflow or a separate Pages build.
Source: [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token).

## Limits

A successful run creates one snapshot commit for that UTC day. This is not a
guarantee of a daily commit: API errors, repository permissions, branch rules,
GitHub scheduling delays or disabled workflows may prevent a run from succeeding.
Failures do not replace the previous snapshot with zero counters. The following
scheduled attempt can retry. No empty commits or backdated commits are created.

Public repository schedules can be disabled after 60 days without activity.
Owner contribution credit follows GitHub's separate rules; a bot commit does not
guarantee a green square for the owner.

Sources: [workflow scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).

## Local checks

`node src/scripts/build.mjs` builds a preview from existing saved data without
Git operations. `node src/scripts/daily.mjs` reads the public API and writes the
daily snapshot locally; it does not commit or push. The commit and push commands
exist only in the reviewed workflow, which Denis enables manually on GitHub.
