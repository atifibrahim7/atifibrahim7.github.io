# Atif Ibrahim Abbasi — Portfolio

Ready-to-host static HTML, CSS and JavaScript. No installation or build needed.

## Publish with GitHub Pages

1. Extract this ZIP.
2. Create a public GitHub repository named `asajjad308.github.io` under your `asajjad308` account. If it already exists, use it and preserve any existing work before replacing files. Alternatively create a repository named `portfolio`.
3. Upload the extracted files to the repository root (not the ZIP or an enclosing folder). index.html, style.css and script.js must be alongside each other. Include .nojekyll if visible; it skips Jekyll processing.
4. Commit the upload to main.
5. Open Settings → Pages. Under Build and deployment, select Deploy from a branch, then main and / (root), and Save.
6. Wait for the Pages deployment to finish. Settings → Pages will show the live URL.

For asajjad308.github.io, the expected URL is https://asajjad308.github.io/ . For a repository named portfolio, it is https://asajjad308.github.io/portfolio/ . These are expected addresses, not confirmation of deployment.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Edit the portfolio

- `index.html` — biography, projects, the career timeline, email and external links.
- `style.css` — colours, typography, spacing and responsive layouts.
- `creative.css` — the motion layer's own styles (intro curtain, cursor, marquee, timeline).
- `script.js` — motion preference, smooth scrolling, the project carousel, copy-email.
- `motion.js` — every GSAP animation, built as one teardownable context.
- `hero-3d.js` — the Three.js particle sculpture in the hero.
- `vendor/` — self-hosted GSAP, Lenis, Embla and Three.js. See `THIRD-PARTY.md`.

Animation is progressive enhancement: the page is complete and readable before a single
tween runs, and the whole motion layer removes itself when motion is paused or when the
visitor's device asks for reduced motion.

Open index.html locally to preview. Copy-email requires a secure browser context such as the HTTPS GitHub Pages site; a fallback message appears if clipboard access is unavailable. Google Fonts loads from the internet, with local font fallbacks.

All asset links are relative, so both root domains and repository subpaths work. No Sites credentials or platform configuration are included.
