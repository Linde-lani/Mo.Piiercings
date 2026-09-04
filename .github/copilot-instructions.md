Project: Mo.Piiercings — Copilot Instructions for contributors

Overview
- This is a small static website served via WAMP (placed in `C:\wamp64\www\Mo.Piiercings`).
- Key files: `index.html`, `about.html`, `products.html`, `bookings.html`, `contact.html`.
- Static assets: `css/styles.css` (single stylesheet), `pictures/` (images).

What agents should do first
- Make only targeted edits to HTML/CSS; this repo has no build step.
- Use the local WAMP server to preview changes at http://localhost/Mo.Piiercings.
- When adding a page: create the `.html` file, add a navigation link in `index.html`, update `css/styles.css` if needed, and add images to `pictures/`.

Project patterns and conventions
- Single-file HTML pages: site pages live at the repo root — follow existing structure and filename patterns.
- Centralized styling: prefer adding rules to `css/styles.css` rather than creating multiple stylesheets.
- Images: keep files in `pictures/` and avoid renaming solely by case (Windows is case-insensitive; keep names stable for cross-platform compatibility).
- Minimal JS (none present): don't introduce build tooling, bundlers, or package.json unless explicitly approved.

Developer workflow (discoverable)
- Local preview: place repo under WAMP `www` and open in browser (no npm/yarn install required).
- Git: branch from `main`, commit clearly, and push to the repository https://github.com/Otsile777/Mo.Piiercings.
- Typical change flow:
  - Add or edit files in place.
  - `git add . && git commit -m "Short, imperative summary"`.
  - `git push origin main` (or push a feature branch and open a PR if the change is large).

Files to be careful with
- Do not reorganize the root folder or change server-specific paths without confirming WAMP deployment implications.

Examples
- Add product page: create `new-product.html`, add link to nav in `index.html`, place images in `pictures/`, add CSS rules to `css/styles.css`, commit and push.

When to ask a human
- Propose adding frameworks, package managers, or a build pipeline.
- Large visual redesigns that require image reorganization.

Contact
- If unsure about a change, leave a detailed commit message and request a review from the repository owner.
