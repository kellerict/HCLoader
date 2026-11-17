# Security policy

## Reporting a vulnerability

Please report security problems **privately** using GitHub's
[private vulnerability reporting](https://github.com/kellerict/HCLoader/security/advisories/new)
(Security tab, "Report a vulnerability"). Do not open a public issue.

Please include what you found, how to reproduce it, the app version (Einstellungen > Wartung) and
the install type (portable or venv). Do not include cookies, tokens or personal data. You can expect
an acknowledgement, and a fix or an explanation, on a best-effort basis: this is a personal project
maintained in spare time.

## Scope

In scope:

- Code in this repository: the app, the UI, the scripts under `scripts\`, the build and CI
  configuration.
- Issues such as path traversal when deleting or opening files, command or argument injection (for
  example into `schtasks`, `explorer`, `ffmpeg`), unsafe handling of downloaded metadata, leaking of
  secrets into logs, or the local PO-token HTTP server (it must listen on `127.0.0.1` only).
- The portable build's packaging (for example unexpected files or links in the ZIP).

Out of scope:

- Vulnerabilities in third-party components (yt-dlp, Deno, ffmpeg, bgutil provider, pywebview,
  Python, WebView2): please report them upstream. Tell us if HCLoader ships a version that is
  known to be affected.
- Behavior of YouTube, SoundCloud or other platforms, including blocks, bot checks and rate limits.
- Problems that need an attacker who already has full control of your user account or the data folder.
- Terms-of-service or copyright questions. HCLoader is for personal use; see the README.

## Supported versions

Only the latest release is supported.

## Your own safety

HCLoader never needs your account credentials. Cookies from the browser are an emergency option that
is off by default; do not share cookies or logs that contain personal data in public issues.
