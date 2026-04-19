# Accessibility posture — Kinetic v1.1

This doc tracks what we've audited and hardened, and what's deliberately
deferred. Target standard: WCAG 2.1 AA on mobile — contrast 4.5:1 for
body text, 3:1 for large text/UI components; 44pt min touch targets;
VoiceOver/TalkBack meaningful labels on interactive elements.

## ✅ Fixed in v1.1

### Contrast
- `onSurfaceDim` bumped `#6B6E73` → `#7E8085` (3.3:1 → 4.8:1 on the
  base `#0B0E11` background). Affects caption text globally
  — streak captions, secondary labels, "best: N days" — without
  changing the visual hierarchy.
- `onSurfaceVariant` (#A9ABAF) and `onSurface` (#F8F9FE) already
  pass AA; verified.

### Labels + hitSlop (high-visibility surfaces)
- **AppHeader** — avatar, coin pill, search, bell: all get
  `accessibilityRole="button"`, a meaningful `accessibilityLabel`,
  and `hitSlop={8}` for 44pt effective target.
- **ProfileScreen** — share button on the hero now has a label.
  Edit rows (Edit Profile, Favorite Teams, etc.) already have a
  Text child, so VoiceOver reads them fine.
- **MatchPredictionScreen** — back buttons (3 instances) and the
  primary Submit CTA have explicit labels + disabled state
  forwarded to `accessibilityState`.

### Sport-color differentiators
- Active sport tabs use both color AND a weight/underline shift so
  color-blind users have a non-color cue. Verified on SportTabs
  (Dashboard, Live) and the EditFavoriteTeams sport bar.

### Dynamic behavior
- `NextUpHero`, `StreakTimeline`, `GuidedFirstPickOverlay`,
  `SharePickCard` all ship with `accessibilityRole` + meaningful
  labels from day one.

## ⚠️ Deliberately deferred to v1.2

None of these block submission — all are polish passes.

- **MatchPrediction tab selectors (Winner / Over-Under / BTTS / etc.)** —
  icon-only sub-buttons are embedded 6 levels deep in a memoized
  tab bar. Low per-session tap count, Text-adjacent so VoiceOver
  extracts usable context in most cases. Full labelling is tracked
  as a focused cleanup pass.
- **Dashboard game cards** — tappable rows contain visible team
  names + date + sport badge, so VoiceOver aggregates the right
  announcement. Explicit `accessibilityLabel` could compose a
  cleaner single-phrase read ("Real Madrid vs Barcelona, kicks off
  in 30 minutes, predict now") — nicer, not required.
- **Dynamic type** — we haven't audited every screen against iOS
  Larger Accessibility Sizes. Quick visual pass on TestFlight
  covers the worst offenders; systematic review comes in v1.2.
- **Focus order / traversal** — no custom `accessibilityElements`
  ordering. Native traversal order is acceptable for RN Views but
  complex modals (Paywall, Onboarding) may benefit from an explicit
  order.

## Verification

Before every submission, run the **Accessibility section of
`/docs/SMOKE_CHECKLIST.md`** on a physical device with VoiceOver
enabled. Key assertions:
  - Tab bar (Home/Today/Leagues/MyPicks/Profile) reads each tab
    with its name and selected state.
  - Paywall CTA announces the price + plan.
  - Delete account button announces the destructive action.
  - iOS Larger Accessibility Sizes (Settings → Accessibility →
    Display & Text Size → Larger Text → max) doesn't clip the
    Dashboard game cards.

## Legal context

PIPEDA doesn't mandate WCAG compliance directly, but Apple App
Store Review Guidelines section 1.5 and Accessible Canada Act
(federal) set a reasonable baseline. AA is the common industry
target and what larger partners (airlines, banks) require before
embedding your product. Ship AA or close to it, improve from
there.
