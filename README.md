# Looplist

Looplist is a small, local-first TikTok watchlist and posting planner. Add TikTok video links, open a video yourself in a new tab, mark it watched, and schedule reminders for planned posts.

## Run it

Open `index.html` in a modern browser. The queue is saved in that browser's local storage; it is not synced to an account or server.

## TikTok credentials and viewing

The posting planner stores ideas and times in local storage and can show browser notifications if you grant permission. Reminders run only while this page is open; the app does not publish posts for you.

The optional client key and client secret inputs are reference-only. This app never reads, stores, or sends their values. TikTok API credentials do not provide an API for playing arbitrary videos or recording that a person watched them. For that reason, videos open only in response to your click, and watched status is set manually. Use TikTok's official developer documentation and an approved server-side OAuth flow for any separate, permitted API integration.

## Privacy

Video URLs, watched status, and planned posts are stored in this browser's local storage. Clearing site data removes them. No analytics, account login, or external app server is used.
