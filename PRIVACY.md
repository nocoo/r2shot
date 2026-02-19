# Privacy Policy — R2Shot

**Last updated:** February 2026

## Overview

R2Shot is a Chrome extension that captures screenshots and uploads them to Cloudflare R2. It works entirely on your device with no data collection.

## Data Collection

R2Shot does **not** collect, store, or transmit any personal data. Specifically:

- No analytics or telemetry
- No tracking pixels or cookies
- No user accounts or sign-ups
- No data shared with third parties
- No browsing history recorded

## Local Storage

R2Shot uses `chrome.storage.local` to save your R2 configuration (endpoint URL, access keys, bucket name, custom domain, JPG quality, and theme preference). This data:

- Never leaves your device
- Is not accessible to any external service
- Is deleted when you uninstall the extension

## Network Requests

R2Shot makes network requests **only** to the Cloudflare R2 endpoint URL that you explicitly configure. These requests are used solely to:

- Upload screenshot images to your R2 bucket
- Test the connection to your R2 bucket

No other network requests are made.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Required to capture a screenshot of the currently active tab when you click the Capture button |
| `storage` | Required to save your R2 configuration locally in the browser |

## Screenshots

When you click "Capture," R2Shot takes a screenshot of the visible area of the current tab. The screenshot is:

- Converted to JPEG format at your configured quality level
- Uploaded directly to your Cloudflare R2 bucket
- Not stored locally or sent anywhere else

## Changes

Any changes to this privacy policy will be reflected in this document and in the GitHub repository.

## Contact

For questions or concerns, please open an issue at:
https://github.com/nocoo/r2shot/issues
