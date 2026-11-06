# n9911 daily statistics setup


The workflow refreshes real statistics and all four charts at every successful run, scheduled every six hours. A same-day marker limits only the daily commit, not data collection. Manual runs refresh too.

The first successful UTC-day run creates a daily-commit marker at `src/assets/live/refresh.json`; later runs still publish fresh observations and charts. Unchanged counters are valid:
the new observation time records a real check, not invented activity. Commits
are labelled `chore(stats): daily snapshot YYYY-MM-DD [automated]`. The author
is the profile owner, using the GitHub-provided ID-based noreply address; the
committer remains `github-actions[bot]`. The update remains explicitly automated.
Repository-wide charts still include all authors and are not a personal contribution score.

Before committing, `author.mjs` verifies the account's public ID and checks that
the login matches the running profile repository. It derives the documented
ID-based noreply address for accounts created after July 18, 2017. The email is
passed only to Git commit metadata, not saved in the public statistics JSON.

## Enable manually on GitHub

1. Review and publish the local workflow and supporting files yourself.
2. In Settings → Pages, select GitHub Actions as the build source.
3. Open Actions → Refresh profile and publish Pages → Run workflow on the default branch.
4. Confirm that the commit author links to your profile and the Pages deployment succeeds.
5. Check the observation time and the automation label on the published site.

The build job requests `contents: write` for snapshot commits. The deployment job
requests `pages: write` and `id-token: write`. The ephemeral `GITHUB_TOKEN` is
provided by Actions; no personal token or local GCM credentials are required.
The workflow only stages six explicit files under `src/assets/live` plus `README.md`, never uses
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
Owner contribution credit requires an associated author email and a commit on
the default branch of a standalone repository, together with GitHub's remaining
criteria. Updates may take up to 24 hours to appear. The code makes the author
eligible for attribution; local checks cannot guarantee GitHub's final calendar display.

Sources: [workflow scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).

Author address format: [GitHub noreply email reference](https://docs.github.com/en/account-and-profile/reference/email-addresses-reference).

## Local checks

`node src/scripts/build.mjs` builds a preview from existing saved data without
Git operations. `node src/scripts/daily.mjs` reads the public API and writes the
daily snapshot locally; it does not commit or push. The commit and push commands
exist only in the reviewed workflow, which Denis enables manually on GitHub.


## Chart refresh and Pages source

Set Settings > Pages > Source to GitHub Actions. A branch build can replace fresh charts with saved files. The workflow checks this setting through a read-only API request. See [Daily refresh](DAILY-REFRESH.md) for snapshot verification and cache behavior.
