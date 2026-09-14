# Privacy Policy — R2Shot

Last updated: September 14, 2026 · Version 2.0.0

## Purpose

R2Shot captures browser pages and uploads the resulting JPEG images directly to a Cloudflare R2 bucket you configure. It is a product of hexly.ai. The publisher receives no screenshots, credentials, analytics, or request logs and operates no upload relay.

## Local configuration

The endpoint, bucket name, access key ID, secret access key, public domain, JPEG quality, full-page limit, and theme are stored in `chrome.storage.local`. R2Shot does not sync them. Uninstalling removes this local configuration.

Credentials are stored in plain text within extension-local storage, not an encrypted credential vault. Use R2 credentials scoped to the intended bucket with the permissions your upload and connection test need.

## Capture and transmission

Capture runs only when you press the capture button. Visible-area mode captures the current viewport. Full-page mode scrolls the active page, stitches loaded content up to the configured limit, and attempts to restore its original scroll position. Page title and URL are displayed in the popup. Screenshots can contain any information visible on the page, including personal information.

JPEG data is processed temporarily in browser memory and sent to your configured R2 endpoint. R2Shot does not maintain a local screenshot library or upload history. Uploaded images remain in your bucket until you remove them there. Uninstalling the extension does not delete uploaded objects.

Signed requests include your access key ID and a derived Signature V4 signature. The secret access key is used locally for signing and is not sent as the secret itself. Cloudflare receives the image, object path, signed request metadata, and standard network information such as your IP address. Test Connection sends a signed bucket HEAD request using the values currently in the settings form; it does not upload a screenshot or validate the public domain.

The configured public domain is used to construct an HTTPS image URL. Clicking Copy URL writes that URL to your clipboard. Copying is not automatic. Anyone able to access a publicly served URL may view its image; public access is controlled by your R2/domain configuration. A connection test alone does not prove public access or upload permissions.

## Permissions

| Permission | Use |
| --- | --- |
| `activeTab` | Capture the active tab after a user gesture and display its title and URL. |
| `scripting` | Read dimensions and scroll the active page during full-page capture. No persistent content script runs on navigation. |
| `storage` | Save configuration and appearance locally. |
| `https://*.r2.cloudflarestorage.com/*` host permission | Send authenticated HEAD and PUT requests directly to the configured Cloudflare R2 S3 endpoint. |

R2Shot requests no history, bookmarks, cookies, or downloads permission. Runtime code, fonts, and icons are local. There is no analytics, advertising, account registration, publisher cloud sync, or remote executable code. R2Shot does not sell data or use it for advertising. Links to hexly.ai and GitHub open only when clicked and are governed by those sites' policies.

## Control and contact

Change local configuration in Settings, revoke credentials in Cloudflare, and delete uploaded objects in your bucket as needed. Policy updates are published in this repository. Questions: https://github.com/nocoo/r2shot/issues
