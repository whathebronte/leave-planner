# Design language: "leaveplanner" style

A design system taken from the Leave Planner app (Angular + Angular Material, light theme).
Use it to give another app, such as an invites, tastings, events and brand collaborations
dashboard, the same look and feel.

**For the agent applying this:** follow the tokens and rules here exactly. Where this file
and an older style in the target app disagree, this file wins. Keep the target app's own
content, features and data; change only how it looks. Never use em dashes in UI copy.

---

## 1. Character in one paragraph

Calm, light and tidy, with a few strong colours that each carry one meaning. White rounded
cards float on a pale slate page with soft shadows. Type is Inter, with confident bold
headings and plain, friendly copy. Colour is used for status, never as decoration, so
anyone can scan the screen and know what needs attention. It feels like a well-made
personal tool: precise and quietly polished, not flashy.

**Mode:** an "operate" interface. The person is getting a task done, so scanability,
consistency and familiar patterns beat expression. The personality lives in the details:
the lowercase wordmark with a coloured dot, the rounded tiles, and the snappy press feedback.

---

## 2. Colour

### 2.1 The rule that matters most

**One colour = one meaning, everywhere.** A colour that marks "confirmed" in a list must
mean "confirmed" in a chip, a tile, a legend and a stat. Never reuse a status colour for
decoration, and never use two colours for the same meaning. Always show a legend (colour
key) when colours carry status.

### 2.2 Tokens

Copy these as CSS custom properties on `html`. Names are by role, so they fit any app.
The middle column shows what each role meant in the Leave Planner, for reference.

```css
html {
  color-scheme: light;

  /* Page and surfaces */
  --ds-bg: #f8fafc;          /* page background (slate 50) */
  --ds-surface: #ffffff;     /* cards, panels, menus */
  --ds-border: #e2e8f0;      /* hairlines, tile borders (slate 200) */
  --ds-outline: #cbd5e1;     /* stronger outlines, e.g. toggle borders (slate 300) */

  /* Text */
  --ds-text: #1e293b;        /* body and headings (slate 800) */
  --ds-muted: #64748b;       /* secondary text, labels (slate 500) */

  /* Status roles: all fills are the 600 weight so they look like one family */
  --ds-blue: #2563eb;        /* Leave Planner: public holiday. Also the primary/action colour */
  --ds-blue-soft: #eff6ff;   /* hover wash on interactive tiles */
  --ds-blue-tint: #dbeafe;   /* selected state of toggles / segmented buttons */
  --ds-on-blue-tint: #1e3a8a;

  --ds-green: #059669;       /* Leave Planner: leave booked (your commitment, positive) */
  --ds-green-dark: #047857;  /* green text on white, green borders */
  --ds-green-tint: #ecfdf5;  /* soft green backgrounds, count pills */
  --ds-green-icon-bg: #d1fae5;

  --ds-red: #dc2626;         /* Leave Planner: blocked (unavailable, negative) */
  --ds-red-dark: #b91c1c;    /* red text, red borders, error messages */
  --ds-red-tint: #fef2f2;
  --ds-red-icon-bg: #fee2e2;

  --ds-yellow: #facc15;      /* Leave Planner: suggested (an opportunity, needs a look) */
  --ds-yellow-border: #eab308;
  --ds-yellow-text: #422006; /* ALWAYS dark text on yellow, never white */
  --ds-yellow-note-bg: #fefce8;     /* soft notice background */
  --ds-yellow-note-border: #fde68a;
  --ds-yellow-note-icon: #a16207;

  --ds-neutral: #f1f5f9;      /* Leave Planner: weekend (inactive, not actionable) */
  --ds-neutral-text: #5f6f86;

  /* Shape and depth */
  --ds-radius: 16px;          /* cards and panels */
  --ds-radius-tile: 10px;     /* small tiles (calendar days, chips that are tiles) */
  --ds-radius-control: 14px;  /* large tappable controls in the bottom bar */
  --ds-shadow: 0 1px 3px rgb(15 23 42 / 0.06), 0 6px 16px rgb(15 23 42 / 0.06);
}

::selection {
  background: #bfdbfe;
  color: var(--ds-text);
}
```

### 2.3 Suggested mapping for an invites / events / collaborations dashboard

This is a suggestion. Keep the logic ("what kind of thing is it?") rather than the exact
labels, and confirm with the owner if a status doesn't fit.

| Role | Leave Planner meaning | Suggested dashboard meaning |
|---|---|---|
| Yellow | Suggested day: worth a look | **New invite or pitch awaiting your reply.** Needs attention |
| Green | Leave you booked | **Accepted / confirmed / delivered / paid.** Your yes |
| Blue | Public holiday: fixed, given to you | **Scheduled and fixed** (date locked, nothing to do), plus all buttons and links |
| Red | Blocked: can't take off | **Declined, clash, overdue or at risk** |
| Neutral grey | Weekend: not actionable | **Past, archived or not relevant** |
| Half green / half white | Half day | **Partly done**, e.g. a deliverable half complete or a tentative yes |

Keep the count of status colours to these five. If a sixth state seems needed, show it with
a label or icon on one of the existing colours instead of inventing a new colour.

### 2.4 Text on colour (contrast)

- White text on blue, green and red fills. Dark text (`--ds-yellow-text`) on yellow.
  Muted text (`--ds-neutral-text`) on neutral grey.
- Body text must reach 4.5:1 contrast, and large text (24px+, or 19px+ bold) 3:1.
  The pairs above pass. White on green is 3.8:1, so on green keep text **bold** and
  short (dates, numbers, one-word tags).
- Secondary text on a coloured surface uses a darker tint of that colour, never a random grey.

### 2.5 Angular Material (if the target app uses it)

Material's default M3 palette is indigo and lilac, which clashes. Point it at the tokens:

```scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: (primary: mat.$blue-palette, tertiary: mat.$green-palette),
    typography: Inter,
    density: 0,
  ));
  @include mat.theme-overrides((
    primary: #2563eb,
    on-primary: #ffffff,
    surface: #ffffff,
    surface-tint: transparent,
    surface-container: #ffffff,
    surface-container-high: #ffffff,
    secondary-container: #dbeafe,
    on-secondary-container: #1e3a8a,
    on-surface: #1e293b,
    on-surface-variant: #64748b,
    outline: #cbd5e1,
    outline-variant: #e2e8f0,
  ));
}
```

If it doesn't use Material, apply the same values to its buttons, toggles, menus and panels.

---

## 3. Typography

- **Font:** Inter (Google Fonts, weights 400, 500, 600, 700, 800), fallback `system-ui, sans-serif`.
  Turn on `-webkit-font-smoothing: antialiased`.
- **Numbers:** any number that counts, changes live or lines up in a column uses
  `font-variant-numeric: tabular-nums`, so it doesn't jitter.
- **Case:** sentence case everywhere. No ALL CAPS headings. The only uppercase is tiny
  status tags inside tiles (PH, OFF, FULL, HALF, BLOCK).

| Use | Size | Weight | Notes |
|---|---|---|---|
| Wordmark (app name) | `clamp(1.5rem, 5vw, 2.25rem)` | 700 | Lowercase, `letter-spacing: -0.035em`, ends in a green dot (see 5.1) |
| Key number (one per card) | 2.75rem | 800 | `letter-spacing: -0.02em`, line-height 1.1, coloured by status |
| Section title (e.g. month name) | 1.15rem | 700 | Text colour |
| Card label (e.g. "Leave left in 2026") | 1rem | 600 | Muted colour |
| Body / list rows | 0.9rem | 400, first column 600 | |
| Sub text under a number | 0.85rem | 400 | Muted |
| Small meta (status line, legend, pills) | 0.75rem | 500 to 600 | |
| Column headers (M T W...) | 0.7rem | 700 | Muted; weekend letters in red |
| Hint text in controls | 0.65rem | 400 | Muted |
| Tags inside tiles | 0.55rem | 700 | Uppercase, `letter-spacing: 0.03em` |

---

## 4. Layout and spacing

- **Page:** max width 1200px, centred, padding 16px on every side, and 120px at the bottom
  when there is a fixed bottom bar, so nothing hides behind it.
- **Rhythm:** 16px between cards and sections. Inside groups use 4px (tile grids),
  8 to 12px (controls), or 2px (title and its subtitle). Tight within groups, generous between them.
- **Grid of repeated cards** (months in the planner; could be weeks, events or brands):
  1 column on phones, 2 from 640px, 3 from 1024px.
- **Overview row:** on 768px and wider, two cards side by side at 1fr / 2fr (summary card
  plus filters-and-legend card). Stacked on phones.
- **Breakpoints to test:** 1440, 1024, 768 and 390 px wide. Nothing may scroll sideways.
- Content inside a card that lists things reads straight across: label on the left with the
  detail right beside it (grid `minmax(9rem, max-content) 1fr`), not pushed to opposite edges.
  Below 480px it stacks.

---

## 5. Components

### 5.1 Header and wordmark
A card at the top: wordmark on the left, actions on the right (one primary pill button plus
a "more" icon menu). The wordmark is the app name in lowercase, run together, followed by a
green full stop, for example `leaveplanner.`. A dashboard would be something like
`invitetracker.` or another lowercase name with the dot. Under it sits a tiny status line
with an icon (e.g. "All changes saved" in dark green, errors in dark red). On phones,
shorten long button labels ("Sign in with Google" becomes "Sign in") so the header stays on one row.

### 5.2 Card (`.ds-card`)
```css
.ds-card {
  background: var(--ds-surface);
  border-radius: var(--ds-radius);
  box-shadow: var(--ds-shadow);
  padding: 16px;
}
```
No borders on cards; the soft shadow separates them. Never put a card inside a card.

### 5.3 Key-number card
One label (muted, 600) with an optional small text button on the right ("Edit" with a pencil
icon). Then one big number (2.75rem, 800) coloured by meaning: green when healthy, red when
at or below zero. Under it a muted line of context ("of 21 days (4.5 booked)"), then a thin
progress bar. Use this pattern once per screen, for the single number that matters most.
Do not build a row of identical big-number tiles.

### 5.4 Status tiles (the calendar day cell)
The signature element. A 48px tall tile with a 10px radius, 1px border, centred number and an
optional tiny uppercase tag underneath.

- **Plain:** white with a `--ds-border` border.
- **Status fills:** solid colour with a matching darker border (green uses `--ds-green-dark`,
  red uses `--ds-red-dark`, yellow uses `--ds-yellow-border`), and bold text.
- **Partial:** a left-to-right split, colour then white
  (`linear-gradient(to right, var(--ds-green) 50%, var(--ds-surface) 50%)`) with dark text.
- **Inactive:** neutral grey fill, muted text, not tappable.
- **Today / current item:** a ring with a gap: `box-shadow: 0 0 0 1px var(--ds-surface), 0 0 0 3px var(--ds-text)`.
- **Hover** (tappable only): blue wash `--ds-blue-soft` with a `#bfdbfe` border.
- **Press:** `transform: scale(0.92)` over 80ms. This snappy squish is part of the personality.
- **Focus:** `outline: 3px solid var(--ds-blue); outline-offset: 1px`.

In a dashboard, the same tile works for days in an events calendar, or as compact status
squares in a list or grid of invites.

### 5.5 Pills and chips
Rounded `999px`, 0.75rem, weight 600, padding `2px 8px`, a tint background with the dark text
of the same colour (e.g. `--ds-green-tint` with `--ds-green-dark`). Use them for counts
("4.5 days") and small statuses next to titles.

### 5.6 Legend (colour key)
A wrapping row of 12px dots, each followed by a label: 0.75rem, weight 500, muted, with 6px
gaps inside an item and `6px 14px` between items. Every status colour on screen must appear here.

### 5.7 Segmented toggle (year switch)
Two to four options in one pill-shaped group with an outline border. The selected option is
`--ds-blue-tint` with `--ds-on-blue-tint` text. Good for year, month or view switches, or
filters like "Invites / Collabs".

### 5.8 Collapsible summary panel ("Your breaks")
A card that folds open. Its header has two lines: a bold title in dark green and a muted
one-line summary with numbers ("15.5 days off from 7.5 days of leave"). Inside is a list of
rows separated by 1px `--ds-border` lines: the first column bold (date or name), the detail
beside it in muted text, with the key figure in bold dark green ("**4 days off** for 2 days
of leave"). When empty, show one helpful sentence that says what to do next.

> **Safari gotcha (Angular Material expansion panel):** on iPhone a closed panel can leave a
> big blank gap, and the two-line header gets squashed. Fix both:
> ```css
> .your-panel { --mat-expansion-header-collapsed-state-height: auto;
>               --mat-expansion-header-expanded-state-height: auto; }
> your-panel-host .mat-expansion-panel-content { overflow: hidden; }
> your-panel-host .mat-expansion-panel:not(.mat-expanded) > .mat-expansion-panel-content-wrapper { height: 0; }
> ```

### 5.9 Bottom action bar (mode switch)
Fixed to the bottom with a 95% white background, an 8px blur, a top hairline and a soft upward
shadow. It respects `env(safe-area-inset-bottom)`. It holds two to three large mode buttons
(max 260px wide each): a 34px round icon on the left, then a bold 0.8rem title over a 0.65rem
hint. The active mode gets that colour's tint background, a 2px border in the colour, and a
coloured icon circle. Inactive modes stay fully readable, with a grey icon circle and muted
title (never faded out). A small icon button such as Undo sits at the end.

### 5.10 Notices
For "heads up" messages (e.g. "This device has a copy"), use a card with a soft yellow
background (`--ds-yellow-note-bg`), a 1px `--ds-yellow-note-border` border, and an amber icon.
Put the actions at the right: a text button ("Ignore") and a filled button ("Restore").
Errors use dark red text.

### 5.11 Buttons
- Primary: filled blue pill, white text, optional leading icon.
- Secondary: text button in blue.
- Icon only: round icon button, always with an `aria-label` and a tooltip.
- Button labels name the action ("Restore", "Start a new planner"), never "OK" or "Submit".

### 5.12 Full-page states
Loading, offline, not found, private and error states each get one centred card: a 40px muted
icon, a short heading (1.2rem), one sentence of explanation (muted, max 420px wide), and one
button with the way out. Never leave a blank screen or a bare spinner.

---

## 6. Icons

- **Material Symbols Outlined**, 20px, `vertical-align: middle`, 6px gap before a button label.
- One icon set and one stroke weight. No emoji or Unicode symbols as icons.
- Decorative icons next to text get `aria-hidden="true"`, so screen readers don't read the
  ligature word ("edit Edit").

---

## 7. Motion

Small and quick, only to confirm an action:
- Tile press: scale 0.92 over 80ms. Background colour changes over 150ms.
- Mode buttons: background and border colour over 150ms.
- Panels: the component's own expand/collapse.
- No decorative animation, no bounce, nothing that loops.

---

## 8. Accessibility checklist

- Contrast as in 2.4. Check the real rendered result, not just the hex values.
- Every tappable element has a visible focus ring (3px blue outline).
- Touch targets are at least 44px tall on phones.
- An element's `aria-label` contains its visible text (e.g. "Edit leave allowance" for an "Edit" button).
- Status is never shown by colour alone: tiles carry a tag (PH, FULL) or an accessible label.

---

## 9. Copy voice

- Plain, friendly, second person: "Your breaks in 2026", "Tap a work day to book leave."
- Short sentences. Explain what happened and what to do next ("Your planner will open as
  soon as you are back online. Nothing has been changed.").
- Numbers in words people use: "half a day", "4 days off for 2 days of leave", "23 to 31 May".
- Date ranges read "23 to 31 May" or "30 Dec to 3 Jan", not "23/05-31/05".
- No em dashes. Use a colon, a comma or a full stop instead.

---

## 10. Do and don't

**Do**
- Keep pages light: slate page, white cards, colour only for status.
- Show a legend wherever colour carries meaning.
- Use tabular numbers for anything that counts.
- Test at 390px wide (a phone) before calling anything done.

**Don't**
- Add new accent colours, gradients, glows or glassy blur (the bottom bar's blur is the one exception).
- Put a thick coloured stripe down one side of cards or notices.
- Nest cards, or build the page from rows of identical icon-plus-text cards.
- Use small uppercase "eyebrow" labels above headings.
- Fade out inactive options until they are hard to read.
- Use white text on yellow.

---

## 11. Quick start for the other app

1. Load Inter (400 to 800) and Material Symbols Outlined from Google Fonts.
2. Paste the tokens from 2.2 into the global stylesheet, plus the Material overrides from 2.5 if relevant.
3. Set the page background to `--ds-bg` and text to `--ds-text`, and wrap each section in `.ds-card`.
4. Decide the status mapping (2.3) for invites, events and collaborations, and add a legend.
5. Rebuild the header with a lowercase wordmark and a green dot (5.1).
6. Restyle lists and panels using 5.8, key numbers using 5.3, and statuses as tiles or pills (5.4, 5.5).
7. Check at 1440, 1024, 768 and 390 px, including the empty, loading and error states.
