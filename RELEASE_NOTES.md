# Release notes

This timeline is reconstructed from the Git history available in this repository, beginning with its earliest recorded prototype commit on 2026-09-04. These are development milestones, not tagged or published semantic-version releases.

## 2026-11-16 — Dynamic service catalog and admin improvements

- Added a Firebase-backed service catalog that displays administrator-added services on the products page and makes them available in booking selections.
- Added admin service creation with image upload to Firebase Storage and service records in Firestore.
- Updated booking and cart behavior to support catalog services.
- Added Firebase Storage security rules for service images and refined Firestore rules.

## 2026-10-19 — Booking, account, and interface refinements

- Improved booking-time availability and booking flow behavior.
- Refined authentication, profile, and administrator interactions.
- Updated shared styling and logout controls across pages.
- Added cache-busting versions to stylesheet and script references.
- Improved navigation visibility and administrator dashboard access presentation.

## 2026-10-18 — Authentication and administration

- Added Firebase Authentication registration and login, including email verification and password reset.
- Added profile and administrator pages.
- Added Firestore-backed booking management and appointment-slot availability.
- Added Firestore security rules for user profiles, bookings, booking slots, services, and contact messages.

## 2026-09-04 — Initial prototype

- Established the first recorded site pages for the studio, including service browsing, bookings, contact, and about information.
- Added the initial shared stylesheet, studio imagery, and browser-based cart.
- Added an initial MySQL schema and PHP endpoints for saving bookings and contact messages.

## Release process

No GitHub Actions workflow or automated release process is currently tracked in the repository. The entries above summarize commits and are not generated deployment records.
