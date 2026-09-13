# Chef Gringo Design System Migration — Phase 3

Phase 3 consolidates the five public `--cg-*` stylesheets into `app/styles/design-system.css` while preserving their original cascade order. Admin/internal legacy styles are relocated from `app/globals.css` to `app/styles/admin-legacy.css` and loaded only by `app/admin/layout.tsx`.

## Public stylesheet order
1. `app/globals.css` — surviving legacy/public utilities
2. `app/styles/design-system.css` — canonical public `--cg-*` system

## Consolidated sections
1. Tokens and public primitives (`public-design.css`)
2. Homepage layout (`approved-home.css`)
3. Food Intelligence (`home-editorial-v2.css`)
4. AI runtime states (`ai-runtime.css`)
5. AI conversation states (`ai-conversation.css`)

The obsolete approved-home goal/explore block was removed because it had no live TSX references and its `.cg-goal-grid` rule overrode the responsive Marketplace definition.

## Admin split
The contiguous Chef Gringo Experience 1.0, Partner Hunt, Marketplace administration, Knowledge Core editor, and Intelligence Lab styles moved intact to `admin-legacy.css`. No public route imports that file.

## Deferred work
The legacy `--color-*` / `--brand-*` vocabulary remains separate from `--cg-*`. Duplicate selectors between the surviving legacy layer and the canonical design system are intentionally left unchanged until visual regression review.
