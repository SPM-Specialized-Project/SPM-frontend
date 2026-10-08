# Current web design system

## Visual evidence

- Product appears as “Code Pulse”; favicon/logo points to `bachkhoa.png`.
- Global CSS and several components use `#0329E9` as a bright brand/action blue, `#3D4863` as dark slate-blue text, and `#F9BA08` as an accent/shadow yellow.
- Tailwind configuration separately declares `primary: #0B2878`, `primary-300: #6D7EAE`, and `primary-700: #082060`, plus neutral/secondary colors. Many screens also use ad hoc Tailwind grays, status colors, and literal hex values. There is no single enforced token source.
- Web fonts are loaded from Google Fonts: Archivo and Baloo Chettan 2. Their availability/offline licensing and app asset policy must be confirmed before bundling.
- Common web patterns include rounded-lg cards, thin gray borders, moderate shadows, occasional hard yellow offset shadows, compact desktop tables, and blue CTA buttons.
- Breakpoints in Tailwind include 360px, 480px, 640px, 760px, 960px, 1240px, 1536px and wider. `StudyLayout` has a 360px minimum width; that is not proof the UI works accessibly on the smallest phones.
- CodePulse uses a separate dark slate surface with teal emphasis, so its mobile theme should be reconciled with the product shell rather than copied inconsistently.

## Mobile translation (recommendation)

Keep brand recognition through blue, restrained gold accents, typography and status color semantics. Rebuild the layout with Material 3 controls, 48dp touch targets, 16dp page gutters, card/list surfaces and clear section hierarchy. Yellow is an accent, not a text/background pairing for dense content. Use semantic color roles so light/dark contrast can be tuned centrally.

Proposed semantic starting point (not approved production values): primary `#0329E9` or a more contrast-safe derived blue; ink `#3D4863`; warm accent `#F9BA08`; surface `#FFFFFF`; page `#F7F8FC`; outline `#D9DEEA`; success `#18794E`; warning `#9A6700`; error `#B42318`; information `#175CD3`. Run contrast checks and brand review before locking tokens.

## Reconciliation tasks

- Choose one authoritative primary blue (the CSS and Tailwind token disagree).
- Decide whether Archivo is the body face and where licensed font assets live; use system fallbacks if offline support is required.
- Define type scale, density, elevation, dark mode, status badges, empty/error/loading patterns and icon set in Flutter theme/components.
- Replace legacy yellow shadow as an occasional decorative treatment, not a universal card effect.
- Keep CodePulse editor surfaces high-contrast and preserve code readability independently of general content styling.
