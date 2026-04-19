# Pre-submit smoke checklist

Run this manually on a physical device (or a high-fidelity simulator
with real Apple/Google accounts) before every submission. 10-minute
pass, catches 80% of what users hit in the first day.

## Device setup
- [ ] Fresh install (uninstall + reinstall; don't test on dev builds)
- [ ] Real Apple ID / Google account signed into device (not TestFlight
      sandbox tester — that hides some Sign In with Apple cases)
- [ ] Wifi + LTE tested at least once each (different failure modes)

## Cold start + boot
- [ ] Cold start time < 2.5s on iPhone 11 / Pixel 6a
- [ ] Splash → login transition feels fluid (no black frame)
- [ ] No console warning noise in release build

## Auth
- [ ] Register with a new email + password, confirm email
- [ ] Login with email + password
- [ ] Sign in with Apple
- [ ] Sign in with Google
- [ ] Forgot password → code → reset → login
- [ ] Logout → back at login screen, SecureStore cleared
- [ ] Biometric unlock on re-open (if enrolled)

## Onboarding
- [ ] Select 3 sports → favorites saved
- [ ] Select teams in each → search, popular list, pagination
- [ ] Optional leagues step — skip works
- [ ] Notification permission prompt appears, allow → OS-level
      permission granted
- [ ] Acquisition source selected → completes

## Core flow
- [ ] Dashboard loads, sport tabs filtered to user's favorites only
- [ ] Date chips: yesterday shows FT games, today shows live/upcoming,
      tomorrow shows upcoming
- [ ] Pick a soccer game (winner)
- [ ] Pick a basketball game (winner + over/under)
- [ ] Pick an MMA fight (method_of_victory)
- [ ] Pick an F1 race (podium finish — uses F1PredictionsScreen)
- [ ] Rewarded ad: tap, watch full → +20 coins awarded
- [ ] Rewarded ad: tap, skip early → toast "didn't finish", no coins
- [ ] Interstitial fires after N picks (check frequency rules)

## Resolution cycle
- [ ] Pick a game that finishes within the next cron cycle
- [ ] After 15 min, pick resolves to WON or LOST, push notif received,
      points credited, streak updated

## Profile
- [ ] Stats banner matches history (totals, won, lost, win rate)
- [ ] Streak timeline renders with the last 7 resolved picks
- [ ] Achievements → Trophy case / Almost there / Locked sections
- [ ] Edit favorite teams → accordion per league, select all works
- [ ] Edit favorite leagues
- [ ] Edit favorite sports
- [ ] Change password with current refresh token preserved (session
      stays alive)
- [ ] Delete account flow: requires typing "DELETE" → soft delete →
      user logged out

## Paywall / Subscription
- [ ] Paywall opens from "Upgrade to Pro" button
- [ ] Monthly purchase flow (sandbox account): Apple/Google prompts,
      success → Pro badge on profile, ads hidden
- [ ] Annual anchor "$47 saved" visible
- [ ] Manage subscription link opens Apple/Google settings

## Notifications
- [ ] Deep-link from prediction_resolved push → opens pick detail
- [ ] Deep-link from game_starting_soon push → opens match prediction
- [ ] Silence predictionResults in settings → next resolved pick
      doesn't fire a push
- [ ] Per-sport toggle silences only that sport's notifications

## Coin store / Wallet
- [ ] Balance reflects latest coin awards (animated count-up visible)
- [ ] Coin IAP sandbox purchase credits balance + transaction logged
- [ ] Gift card redeem tile is HIDDEN (feature flag v1.1)

## Offline
- [ ] Airplane mode mid-browse: dashboard shows cached data with
      "offline" timestamp
- [ ] Submit pick offline → toast "no connection" then success
      banner on reconnect (if optimistic UI exists) OR silent queue

## Accessibility
- [ ] VoiceOver reads each major button with context (not just
      "button" generically)
- [ ] Text sizes with iOS Larger Accessibility Sizes don't clip card
      titles
- [ ] Dark mode looks correct (auto-follow system)

## Build hygiene
- [ ] Release build, not Expo Go / dev build
- [ ] Crash-free for 30 min of active navigation (iPhone X with 2GB
      RAM is the torture rig)
- [ ] App rotation stays portrait-only where expected

## Store submission
- [ ] Privacy Nutrition Labels regenerated with any new tracking
- [ ] Play Data Safety form updated
- [ ] Screen recording of deletion flow archived in App Review Notes
- [ ] Screen recording of trial (if enabled) archived
- [ ] App Store Connect demo credentials valid

Sign off: _____________________ Date: _____________
