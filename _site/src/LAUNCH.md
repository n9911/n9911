# Launch Signal Relay

**locale-check** is this profile's first runnable mission. The illustration is a fictional world; the application and this example can be run locally.

1. [Download the source ZIP](assets/launch.zip) and extract it. Open the locale-check folder.
2. Install Node.js 22+ if needed. The archive contains the original README and LICENSE.
3. On Windows, run Start.cmd. Or, from the extracted project folder, run `node server.mjs` and open http://127.0.0.1:8835.
4. Run the checked example from that folder:

```text
node examples/profile-mission/check.mjs
```

See examples/profile-mission/README.md for the input files, expected outcome and one useful next change. Data are synthetic.

## What was verified

The example completed successfully and 5 existing project tests passed. [Source snapshot and result](assets/launch.json). This establishes the checked processing behaviour; a graphical browser session was not part of this check.

Original project authors, LICENSE and repository history retain their attribution. The source download omits Git's database and Windows desktop.ini files. For a separate public project repository, use the original local repository to preserve its history.
