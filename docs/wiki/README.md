# Wiki sources

The pages in this folder are published to the GitHub wiki **automatically** by the workflow
`.github/workflows/wiki.yml` on every push that changes `docs/wiki/` (and via *Run workflow*).
Edit the pages here, not in the wiki web UI – manual wiki edits are overwritten on the next sync.


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
rm -rf HCLoader.wiki/images && cp -R docs/wiki/images HCLoader.wiki/images
rm HCLoader.wiki/README.md        # this maintainer note is not a wiki page
cd HCLoader.wiki
git add -A
git commit -m "Update wiki from docs/wiki"
git push
```

(Run the `cp` from the main repository root, or adjust the paths.) Pushing overwrites pages with the
same name, so edit in `docs/wiki/` and republish rather than editing in the web UI.

## Notes

- Images live in `docs/wiki/images/` and are mirrored to `images/` in the wiki by the workflow
  (the folder is replaced on every sync, so deleted files disappear). Reference them with Markdown
  syntax and a relative path, `![alt](images/<file>)`; keep raw HTML (`<img>`, `<a href>`) for
  absolute URLs such as badges. No custom CSS or JavaScript is possible in a GitHub wiki.
- `hero.svg`, `logo.svg`, `divider.svg` and `roadmap.svg` use the app colours from
  `ui/css/theme.css`; all text is converted to outlines (no fonts needed) and the subtle animations
  stop under `prefers-reduced-motion`. `roadmap.svg` is static: update the node states by hand when
  a version ships, together with the Status column in `Roadmap.md`.
- `screenshot-*.jpg` are downscaled copies (1280 px, JPEG) of `docs/screenshots/*.png`.
- Pages have no `# Title` heading (the wiki shows the page name itself). Every page starts with
  the divider image and ends with a previous / Home / next line
  in sidebar order; keep both when adding a page.
- Links to repository files (`SPEC.md`, `docs/RELEASING.md`, ...) are absolute GitHub URLs on `main`.
- After UI changes, refresh the screenshots in `docs/screenshots/` with `scripts/ui_screenshots.py`.
