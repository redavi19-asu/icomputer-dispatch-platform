# Urban Carrier OS desktop client

One desktop client uses the production Carrier sign-in and existing role-based Dispatcher, Driver and company portal. Installing it does not create a seat or grant operator privileges. The remote page has no custom native commands or filesystem permissions.

Run `npm ci` then `npm run build` from this directory with Rust installed. Packaging follows the existing Unified Tauri client. The desktop client requires an internet connection. Browser/desktop social login and actual signed installations must be verified before promotion.

Production packaging is manual and targets one operating system per run. Configure the existing publisher signing credentials for this repository before a release; do not commit or copy secrets into the source. Mac requires Developer ID and notarization; Windows requires Azure Artifact Signing. No native package is currently published. Driver mobile access remains the separate installable web app. App Store/Google Play native submissions are future work, not provided by this desktop wrapper.
