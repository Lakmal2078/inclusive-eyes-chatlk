# ChatLK UI/UX Audit and Fixes — 2026-09-06

## Audit scope

The repository UI was reviewed against the attached checklist for overlapping elements, hover/focus states, spacing, contrast, typography, modal layering, touch targets, and responsive behavior.

## Issues found and fixed

### 1. Install notice overlapped the fixed composer

**Issue description:** The fixed `.install-notice` used `bottom: 20px`, while the composer occupied the bottom of the workspace. The two surfaces overlapped by approximately 55px in the measured desktop viewport.

**Impact on UI/UX:** The notice obscured the message composer and its action buttons, making the primary message entry interaction harder to discover and potentially blocking clicks.

**Suggested improvement implemented:** The notice now sits above the composer using `bottom: 96px` on desktop and above the mobile bottom navigation using `bottom: calc(78px + env(safe-area-inset-bottom))` on mobile. Fresh browser measurement reports `overlap: false`.

### 2. Global keyboard focus treatment was incomplete

**Issue description:** Some controls had local focus styles, but there was no consistent `:focus-visible` treatment for buttons, links, inputs, textareas, and selects.

**Impact on UI/UX:** Keyboard and switch-control users could lose track of the active control, especially in the dense sidebar and composer areas.

**Suggested improvement implemented:** A consistent high-contrast focus ring with offset was added for all interactive elements, while preserving the existing component-specific focus styles.

### 3. Compact controls had inconsistent touch targets

**Issue description:** Header, chat action, composer, and install-dismiss controls used visually small dimensions without one shared minimum target policy.

**Impact on UI/UX:** Small targets can reduce usability on touch devices and increase accidental taps in the topbar/composer.

**Suggested improvement implemented:** Core icon and action controls now use minimum 40px targets, with responsive reductions only where the mobile layout requires them. Form controls use a minimum 44px height.

### 4. Modal behavior on short/mobile viewports needed stronger containment

**Issue description:** The modal backdrop did not explicitly contain overscroll, and modal alignment was centered even when a mobile keyboard or short viewport reduced usable height.

**Impact on UI/UX:** Background scrolling could leak through the modal and important form actions could become harder to reach on small screens.

**Suggested improvement implemented:** Modal/backdrop overscroll is contained, mobile modals align to the bottom with safe padding, and the modal height is bounded using `100dvh`.

## Preserved behavior

Existing IDs, event hooks, authentication flow, chat list, message composer, calls, uploads, profile, contacts, groups, settings, PWA install flow, and theme toggle were not removed or renamed.

## Validation

`npm run build`, `npm run lint`, `node --check src/static/js/app.js`, `npm test`, and `git diff --check` passed. The test suite reports **31 passed and 0 failed**. Browser verification confirmed that the refreshed CSS is active and that the install notice/composer overlap is resolved.
