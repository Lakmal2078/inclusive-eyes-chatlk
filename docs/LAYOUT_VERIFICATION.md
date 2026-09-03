During browser verification, the existing service worker served a previous cached JavaScript bundle, so the newly added wrapper was not initially visible in the DOM. The service-worker cache name was bumped from `fast-cash-shell-v1` to `fast-cash-shell-v2` so deployed browsers will invalidate the old cached bundle and load the corrected layout.

Fresh-browser measurements confirmed the layout: `.content-sections` is 960px wide, all three child content sections are exactly 960px wide, and the four feature cards are each 260px wide within a 1080px feature grid. The production build completed successfully after the cache-version update.

## Admin tab verification

The logged-in admin navigation now uses a four-column equal-width CSS Grid on desktop, two equal columns below 700px, and one full-width column below 420px. The tab buttons use the `admin-tab` class with centered text, minimum height, wrapping labels, and active-state styling. The final production build completed successfully after this change.
