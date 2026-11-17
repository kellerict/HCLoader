# Wiki sources

These Markdown files are the source of the GitHub Wiki of HCLoader. They are kept in the main
repository so that they are reviewed and versioned together with the code. File names follow the
GitHub wiki convention (`Home.md`, `_Sidebar.md`, `_Footer.md`, `Page-Name.md`), and pages link to
each other as `[Text](Page-Name)`, which works in the wiki (not in the repository file browser).

## Publishing to the wiki

The wiki must be initialised **once** through the web UI before its git repository exists:
open the repository's **Wiki** tab and create the first page (any content, for example Home).
Then:

```bash
git clone https://github.com/kellerict/HCLoader.wiki.git
cp docs/wiki/*.md HCLoader.wiki/
rm HCLoader.wiki/README.md        # this maintainer note is not a wiki page
cd HCLoader.wiki
git add -A
git commit -m "Update wiki from docs/wiki"
git push
```

(Run the `cp` from the main repository root, or adjust the paths.) Pushing overwrites pages with the
same name, so edit in `docs/wiki/` and republish rather than editing in the web UI.

## Notes

- Screenshots are not copied into the wiki. The pages use plain text; if you add images, use
  absolute `raw.githubusercontent.com` URLs.
- Links to repository files (`SPEC.md`, `docs/RELEASING.md`, ...) are absolute GitHub URLs on `main`.
- After UI changes, refresh the screenshots in `docs/screenshots/` with `scripts/ui_screenshots.py`.
