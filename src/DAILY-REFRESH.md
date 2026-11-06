# Daily automated statistics snapshots

The profile workflow refreshes real GitHub statistics and all four SVG charts at
every successful run. GitHub Actions checks at 00:17, 06:17, 12:17 and 18:17 UTC;
manual runs refresh too. A successful snapshot earlier on the same UTC day does
not skip API requests or rendering. Only the additional snapshot commit is skipped.

The first successful run of a UTC day writes a
`src/assets/live/refresh.json` daily-commit marker. Later runs still publish fresh
API observations and charts. Unchanged counters are valid:
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
The workflow only stages six explicit files under `src/assets/live` and `README.md`, never uses
force push and does not rewrite history. GitHub branch rules or restricted
permissions may reject the push; the job reports that failure.

The website is built and deployed in the same workflow because commits pushed
with `GITHUB_TOKEN` do not trigger another workflow or a separate Pages build.
Source: [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token).

The workflow first checks that Pages uses **GitHub Actions**, not **Deploy from a
branch**. A branch deployment copies the saved root files and can replace the
fresh workflow artifact with old charts. The check performs only a GET request;
change Settings → Pages → Source yourself. The build job needs `pages: read` for
this check. A failure stops the workflow with an explicit configuration message.

README chart URLs include the observation timestamp as a cache version. The daily
snapshot commit includes those URLs; later Pages builds refresh the site without
another daily commit. GitHub's image proxy may still delay README images; use the
site and linked metrics JSON to inspect the latest published observation.
The site requests JSON/SVGs without browser caching and verifies all four chart
timestamps before updating images and freshness text. A snapshot older than the
six-hour interval, or mismatched/unavailable charts, is visibly marked stale.

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
are prepared in the reviewed workflow and the separate local management build,
which Denis runs himself.

The management workspace also provides `node build/gen-commit/run.mjs` for all
six local clones, with an explicit `--push` option for Denis's own full-cycle run.
Local snapshot commits use the profile owner as both author and committer;
the `[automated]` label remains. The local build and Actions share the same UTC
daily marker. Pushing a local snapshot to main triggers this Pages workflow via
changes to `src/assets/live/**`; an existing daily snapshot is deployed without
another snapshot commit. The management build is not included in this profile
export. See its `build/README.md` for credentials, reports and recovery details.
