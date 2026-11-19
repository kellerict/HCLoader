> **Status:** releases are currently **not signed**. A first application at the SignPath Foundation
> (November 2026) was declined because the project is still young; we will re-apply once HCLoader
> has more users. Until then Windows SmartScreen may warn ("More info → Run anyway"). Verify
> downloads with the `SHA256SUMS` file attached to every release.

Once approved: free code signing provided by [SignPath.io](https://about.signpath.io/),
certificate by [SignPath Foundation](https://signpath.org/).

## What is signed
- The Windows installer `HCLoader-Setup-<version>.exe` and its uninstaller, built from this
  repository by the public GitHub Actions workflow
  [`portable.yml`](https://github.com/kellerict/HCLoader/blob/main/.github/workflows/portable.yml) on a release tag.
- Only binaries built from this project's own source are signed. Bundled third-party components
  (embedded Python, Deno, ffmpeg, the bgutil PO-token provider, Python packages) are shipped as
  published by their upstream projects and are **not** re-signed by HCLoader.
- The installer carries Microsoft's WebView2 Evergreen Bootstrapper
  (`MicrosoftEdgeWebview2Setup.exe`, runs only if the WebView2 Runtime is missing). It is
  **signed by Microsoft** and packed unmodified; HCLoader does **not** re-sign it. The release
  workflow downloads it from Microsoft and refuses to build if its Authenticode signature is not
  valid or not issued to Microsoft Corporation.
- Every signing request is triggered by the release workflow and must be **manually approved**
  by an approver. Nothing is signed from a local machine.

## Team roles
| Role | Members |
|---|---|
| Committers and reviewers | [@kellerict](https://github.com/kellerict) |
| Approvers | [@kellerict](https://github.com/kellerict) |

Authors may commit without additional review; every change proposed by anyone else (pull request)
is reviewed by a committer before it is merged. Pull requests are limited to collaborators. All members with write access use multi-factor
authentication on GitHub and SignPath.

## Privacy policy
This program will not transfer any information to other networked systems unless specifically
requested by the user or the person installing or operating it.

Network access happens only for these features, all of which can be switched off or are started
by the user:

| Feature | Destination | When | Setting |
|---|---|---|---|
| Search, watchlist checks, downloads | YouTube, SoundCloud, Mixcloud (`app.mixcloud.com`, `api.mixcloud.com`, its stream CDN), hearthis.at (`api-v2.hearthis.at`, `hearthis.at`) | when the user searches, downloads, or runs a watchlist check (manually, by the in-app interval or a scheduled task the user created) | Watchlist / schedule settings, `soundcloud.enabled`, `mixcloud.enabled`, `hearthis.enabled` |
| Cover pictures in lists | image hosts of the platforms (`*.ytimg.com`, `*.sndcdn.com`, `thumbnailer.mixcloud.com`, `*.hearthis.at`) | when search results, inbox or library entries with a picture are shown | none (pictures of entries the user loaded from that platform) |
| App update check | GitHub (`api.github.com`, release downloads) | once per start | installer privacy page; `maintenance.check_app_updates_on_start` |
| yt-dlp / plugin update check | PyPI (`pypi.org`) | at most once per day at start | installer privacy page; `maintenance.check_updates_on_start` |
| Library scan after downloads (off by default) | the user's own Plex or Jellyfin server at the address the user entered (usually in the home network) | after downloads (batched), «Test connection», «Scan now» – never through the proxy | `media_server.type` (Settings › Media server) |
| Proxy | the proxy configured by the user | for the above requests | `network.proxy` |

The two update checks are the only connections HCLoader makes on its own. They are **shown during
installation and can be disabled there**: the installer has a page «Privacy and network access»
(after the folder page) that describes these connections and offers the checkbox «Check for updates
at startup» (default on; silent installs: `/UPDATECHECK=0`). The choice is written to
`installer-defaults.json` in the program folder and becomes the setting when HCLoader creates its
configuration on first start; an existing configuration is never changed (on an upgrade or
reinstall the page therefore shows a note instead of the checkbox). Both checks can be switched
off at any time in Settings › Maintenance. The portable ZIP has no installer: there the checks are on by
default and can be switched off in the same place.

No telemetry, no analytics, no accounts. The services HCLoader talks to have their own privacy
policies: [YouTube/Google](https://policies.google.com/privacy),
[SoundCloud](https://soundcloud.com/pages/privacy), [Mixcloud](https://www.mixcloud.com/privacy/),
[hearthis.at](https://hearthis.at/privacy/), [GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement),
[PyPI](https://policies.python.org/pypi.org/Privacy-Notice/). Settings, the database and logs stay on the local
computer (`%APPDATA%\HCLoader` or the portable folder). Browser cookies are only read if the user
explicitly enables `network.cookies_from_browser`, and are never stored in logs. The Plex token / Jellyfin API
key for the optional library scan is stored in the Windows Credential Manager of the current user
(never in the configuration, the database or logs) and is only sent to the server the user entered.
Windows notifications are shown locally; HCLoader registers its notification name and a
`hcloader:` link for the current user (removed by the uninstaller).

## Reporting
Security issues: see [SECURITY.md](https://github.com/kellerict/HCLoader/blob/main/SECURITY.md). Questions about signing: open an
[issue](https://github.com/kellerict/HCLoader/issues).
