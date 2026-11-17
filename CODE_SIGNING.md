# Code signing policy

> **Status:** application for free open source code signing at the SignPath Foundation is being
> prepared. Until it is approved, releases are **not signed** and Windows SmartScreen may warn
> ("More info → Run anyway").

Once approved: free code signing provided by [SignPath.io](https://about.signpath.io/),
certificate by [SignPath Foundation](https://signpath.org/).

## What is signed
- The Windows installer `HCLoader-Setup-<version>.exe` and its uninstaller, built from this
  repository by the public GitHub Actions workflow
  [`portable.yml`](.github/workflows/portable.yml) on a release tag.
- Only binaries built from this project's own source are signed. Bundled third-party components
  (embedded Python, Deno, ffmpeg, the bgutil PO-token provider, Python packages) are shipped as
  published by their upstream projects and are **not** re-signed by HCLoader.
- Every signing request is triggered by the release workflow and must be **manually approved**
  by an approver. Nothing is signed from a local machine.

## Team roles
| Role | Members |
|---|---|
| Committers and reviewers | [@kellerict](https://github.com/kellerict) |
| Approvers | [@kellerict](https://github.com/kellerict) |

Pull requests are limited to collaborators. All members with write access use multi-factor
authentication on GitHub and SignPath.

## Privacy policy
This program will not transfer any information to other networked systems unless specifically
requested by the user or the person installing or operating it.

Network access happens only for these features, all of which can be switched off or are started
by the user:

| Feature | Destination | When | Setting |
|---|---|---|---|
| Search, watchlist checks, downloads | YouTube, SoundCloud | when the user searches, downloads, or runs a watchlist check (manually, by the in-app interval or a scheduled task the user created) | Watchlist / schedule settings, `soundcloud.enabled` |
| App update check | GitHub (`api.github.com`, release downloads) | once per start | `maintenance.check_app_updates_on_start` |
| yt-dlp / plugin update check | PyPI (`pypi.org`) | at most once per day at start | `maintenance.check_updates_on_start` |
| Proxy | the proxy configured by the user | for the above requests | `network.proxy` |

No telemetry, no analytics, no accounts. Settings, the database and logs stay on the local
computer (`%APPDATA%\HCLoader` or the portable folder). Browser cookies are only read if the user
explicitly enables `network.cookies_from_browser`, and are never stored in logs.

## Reporting
Security issues: see [SECURITY.md](SECURITY.md). Questions about signing: open an
[issue](https://github.com/kellerict/HCLoader/issues).
