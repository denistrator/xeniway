# Editorial UI Refresh Design

## Goal

Refresh the complete Job Tracker UI for both light and dark themes using a calm editorial workspace visual language. The result should feel like a focused career command center for candidates tracking employer conversations, while preserving all current routes, workflows, accessibility behavior, data flow, and API contracts.

## Visual direction

The chosen direction is “quiet ledger.” It uses warm paper and ink surfaces, restrained teal and terracotta accents, hairline structure, and stronger typographic hierarchy.

Light theme tokens:

- Background: `#F5F3EE`
- Surface: `#FFFDF8`
- Primary text: `#172033`
- Secondary text: `#667085`
- Structural line: `#D8D4CB`
- Primary accent: `#1F6D67`
- Secondary accent: `#A45F3D`

Dark theme tokens will use a deep ink canvas (`#020618`) and slate-ink surfaces with adjusted text, line, teal, and terracotta values that maintain accessible contrast. The dark theme must remain visually related to the light theme without simply inverting values.

Typography uses an editorial serif stack for display headings (`Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, `Georgia`) and the existing sans-serif stack for body text and controls. Metadata and status labels use compact uppercase styling with intentional tracking.

The signature element is the status board: each workflow column uses a quiet editorial accent rule and stronger label hierarchy. Cards become flatter and calmer, with company and position carrying the visual emphasis.

## Surface treatment

- Header: thin structural rule, serif wordmark, grouped utility controls, and a clear primary add action.
- Home: editorial heading, compact search/filter toolbar, and the board as the dominant workspace.
- Board: preserve desktop horizontal scrolling, equal active-column sizing, dynamic empty-column minimum width, drag-and-drop, keyboard alternatives, and mobile stacking behavior.
- Job cards: flatter surfaces, clearer company/position hierarchy, quieter metadata, and status accents readable in both themes.
- Archive: reuse board/card language with clear restore/delete actions and a deliberate empty state.
- About: apply the same typography and paper/ink language without adding new product content.
- Authentication: use matching type, surfaces, form hierarchy, error treatment, and focus behavior.
- Drawer/modal: preserve the shared form and presentation switcher while applying the refreshed surfaces, spacing, and heading hierarchy.

## Interaction and accessibility

Motion is limited to purposeful opacity and transform transitions for controls, cards, filtering feedback, and drawer/modal presentation. Nonessential motion is disabled for `prefers-reduced-motion`.

The refresh must preserve or improve semantic controls, labels and autocomplete metadata, accessible names, visible `:focus-visible` states, managed dialog focus, Escape handling, live announcements, touch targets, keyboard drag-and-drop alternatives, and modal/drawer overscroll containment. No gesture-only interaction may be introduced.

## Implementation boundaries

- Preserve routes, API contracts, server state, Redux state responsibilities, and current product behavior.
- Prefer existing primitives and shared CSS/Tailwind tokens over new dependencies.
- Keep responsive behavior explicit in CSS; do not use JavaScript for layout measurement or style manipulation.
- Do not add pages, integrations, data fields, or new product functionality.
- Verify lint, typecheck, unit tests, build, and the existing Playwright workflow where the local environment permits.

## Success criteria

1. Every public and authenticated screen uses the quiet-ledger visual language in light and dark themes.
2. The job board remains functionally identical, including filtering, scrolling, DnD, keyboard alternatives, and empty states.
3. Existing accessibility guarantees remain intact, including focus management and reduced-motion behavior.
4. No new dependencies or out-of-scope product behavior are introduced.
5. The complete static and test suite passes; any environment-only E2E blocker is reported explicitly.
