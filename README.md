# Mo Piiercings & Co

Mo Piiercings & Co is a web app prototype for a body-art studio in Braamfontein, Johannesburg. It presents piercing, tattoo, tooth-gem, and jewelry offerings and lets customers browse services, manage a cart, register and sign in, send enquiries, and request appointments. Verified administrators can review bookings and add services to the catalog.

This README describes the app's purpose, design and technical choices, local setup, and use of GitHub and GitHub Actions. The project history and release notes are in [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Project report

### Purpose and users

The app brings the studio's customer-facing information and common interactions into one website:

- Visitors can learn about the studio, review contact information, and browse services and jewelry.
- Signed-in customers can maintain a profile, add products or services to a browser-based cart, check appointment availability, submit a booking, and contact the studio.
- Verified administrators can manage booking statuses and publish new bookable services with images.

The prototype uses South African rand (ZAR) for displayed prices and presents the studio as serving Braamfontein, Johannesburg.

### Design considerations

- **Consistent visual identity:** Shared styles live in one stylesheet and use a dark, green, and gold palette, with a consistent header, navigation, and footer.
- **Responsive, direct navigation:** The pages are plain HTML linked with regular navigation and calls to action; the stylesheet adapts shared page components for different viewport sizes.
- **Usable forms:** Forms use labels and browser input types, and status messages use live regions to communicate results.
- **Booking reliability:** Availability is shown by date. A Firestore transaction creates a booking and reserves its time slot together, preventing two customers from claiming the same slot at once.
- **Access control:** Firebase Authentication identifies users; administrators must have an approved email and verified email address. Firestore and Storage rules also enforce access in the backend—the hidden admin link is not a security boundary.
- **Simple deployment:** The frontend has no bundler or build step. ES modules load Firebase SDK modules from Google's CDN, so serve the site over HTTP(S), not by opening files with `file://`.
- **Prototype scope:** The cart is stored in browser `localStorage`; this is not payment processing or a server-side order system.

### Structure and technology

| Area | Implementation |
| --- | --- |
| Pages | Root-level HTML files: `index.html`, `about.html`, `products.html`, `bookings.html`, `cart.html`, `contact.html`, `login.html`, `register.html`, `profile.html`, and `admin.html` |
| Styling and images | Shared `css/styles.css` and local `pictures/` assets |
| Browser logic | Native JavaScript modules in `js/` for authentication, cart behavior, catalog loading, and administration |
| Authentication and primary app data | Firebase Authentication, Cloud Firestore, and Firebase Storage |
| Firebase access rules | `firestore.rules`, `storage.rules`, referenced from `firebase.json` |
| Optional/older server endpoints | PHP files `db.php`, `save_booking.php`, and `save_contact.php`, with a MySQL schema in `database.sql` |
| Local development | WAMP / Apache; PHP and MySQL are needed only when using the PHP endpoints |

The booking and contact forms in the current frontend are handled by `js/auth.js` and write to Firestore. The PHP endpoints and MySQL schema are also present, but are not the current forms' submission path; treat them as a separate/older backend path unless you intentionally wire them into the UI.

## Run locally

1. Place the repository under the WAMP web root. For the standard local setup, open `http://localhost/Mo.Piiercings/`.
2. Start Apache in WAMP and open the site in a browser. No npm install or frontend build is required.
3. Firebase-backed features need a configured Firebase project and a permitted web-app origin. Enable Email/Password sign-in, Firestore, and Storage; deploy the rules in `firestore.rules` and `storage.rules`.
4. Configure the administrator allowlist consistently in `js/admin-config.js` and in both Firebase rules files before deploying. Only grant administration to intended, verified accounts.

If you intend to use the PHP endpoints, also start MySQL, import `database.sql` (it creates the expected database and tables), and configure the connection in `db.php`. Do not deploy the example local database credentials to a public or production server.

Firebase CLI deployment, for a Firebase project you are authorized to administer:

```powershell
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,storage
```

Check the selected Firebase project before deployment. `firebase.json` configures rules deployment; it does not configure Firebase Hosting or publish the website.

## GitHub and GitHub Actions

Git is used to version the source and record project milestones. The history includes the initial prototype, later authentication and Firebase integration, and the catalog/admin additions. Branches and merge commits are part of the recorded collaboration history.

**GitHub Actions is not currently configured in this repository.** There is no tracked `.github/workflows/` workflow, so pushes and pull requests do not currently run automated checks or deployments through Actions. The project also has no declared frontend build or test runner.

For future use, Actions could run lightweight HTML, JavaScript, and PHP checks on pull requests, then deploy only after an explicitly configured release workflow. Any deployment credentials should be stored as protected GitHub Actions secrets, scoped narrowly, and never exposed to untrusted pull-request runs. Until such workflows are added and verified, validation and deployment are manual.

## Known scope and operational notes

- The Firebase web-app configuration is referenced by the browser app; authorization must be enforced by Firebase Authentication and security rules, not by concealing UI elements.
- Firestore and Storage rules restrict services, bookings, contacts, and uploaded images. Review these rules and the administrator allowlist before production use.
- The frontend depends on network access to Firebase SDK modules and the configured Firebase project.
- No payment provider, build pipeline, or automated test suite is configured in the repository.

