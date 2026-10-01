# Mobile design tokens and component guidance

These values are a proposed baseline derived from inconsistent web literals. Product/design must approve the authoritative primary color, font licensing and contrast before implementation.

## Proposed semantic tokens

| Token | Starting value | Usage |
|---|---|---|
| `brand.primary` | `#0329E9` (candidate) | Primary actions, selected navigation; verify contrast on white and choose a darker accessible variant if needed. |
| `text.primary` | `#26324A` | Body/headings; the web's `#3D4863` is a useful brand-adjacent candidate. |
| `accent.warm` | `#F9BA08` | Small highlights/status decoration, not small text on white. |
| `surface.base` | `#FFFFFF` | Cards and controls. |
| `surface.canvas` | `#F7F8FC` | Page background. |
| `border.subtle` | `#D9DEEA` | Dividers and outlined controls. |
| `status.success` | `#18794E` | Saved/approved/active only with label/icon as well as color. |
| `status.warning` | `#9A6700` | Pending/attention. |
| `status.error` | `#B42318` | Failed/declined/revoked. |
| `status.info` | `#175CD3` | Informational/loading detail. |

Use semantic `ColorScheme` roles rather than importing web hex values at call sites. Define light and dark modes centrally; dark mode is a proposed capability, not part of current web behavior.

## Type, spacing and shape

- Candidate family: Archivo for interface text, pending font asset/licensing and offline confirmation. Fall back to platform sans-serif.
- Type roles: page title 24/30, section title 18/24, body 16/24, secondary 14/20, caption 12/16; keep dynamic type scaling enabled.
- Proposed weights: regular 400 for body, medium 500 for controls/labels, semibold 600 for section titles, bold 700 only for primary emphasis. Existing web uses Archivo/Baloo Chettan 2 but does not establish a consistent mobile weight scale.
- Base spacing unit: 4dp. Typical page gutters 16dp (20dp on large phones), section spacing 20–24dp, card padding 16dp.
- Minimum interactive target 48×48dp; never use 360px web minimum-width as a mobile constraint.
- Cards: 12–16dp radius, thin outline or restrained elevation, no universal hard offset shadow. Avoid nested card-in-card decoration.
- Proposed radius/elevation tokens: `xs=4dp`, `sm=8dp`, `card=12dp`, `sheet=20dp`; flat list rows at elevation 0, cards at elevation 1, modal/sheet at elevation 3. Verify against Material 3 surface/elevation roles.

## Reusable components

`AppScaffold`, `AppBottomNavigation`, `PageTitle`, `SearchField`, `FilterChipRow`, `StatusBadge`, `CourseCard`, `SessionCard`, `RequestCard`, `SectionHeader`, `InlineNotice`, `EmptyState`, `ErrorState` with retry where safe, `SkeletonBlock`, `PermissionMessage`, `ConfirmActionSheet`, `FormField`, `DateTimeField`, `AsyncActionButton`, and `PagedOrIncrementalList`.

For mutation screens, expose semantic pending/success/error states and prevent a second submission while in flight. Preserve input after recoverable failure. A generic snackbar is not enough for an important destructive or publishing transition.

Buttons should have clear filled/tonal/outlined/text hierarchy, minimum 48dp height, disabled/loading semantics, and one primary action per visible section. Inputs need persistent labels, field-level error text, correct keyboard type/autofill and focus order. Status badges pair color with text/icon and use consistent labels for pending/approved/declined/active/revoked. Cards reserve top row for identity/status, body for essential details and overflow for secondary actions.

## Icons and imagery

Use one Flutter-compatible icon family and semantic labels. Do not mix custom SVG, IcoMoon, Heroicons and MUI visual styles in a single mobile screen. Reuse brand mark only after asset licensing and high-density variants are confirmed. Keep charts and code editor controls distinct from common list icons.
