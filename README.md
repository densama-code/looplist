# Looplist

Looplist is a small, local-first TikTok watchlist. Add TikTok video links, open a video yourself in a new tab, and mark it watched when you are done.

## Run it

Open `index.html` in a modern browser. The queue is saved in that browser's local storage; it is not synced to an account or server.

## TikTok credentials and viewing

The optional client key and client secret inputs are reference-only. This app never reads, stores, or sends their values. TikTok API credentials do not provide an API for playing arbitrary videos or recording that a person watched them. For that reason, videos open only in response to your click, and watched status is set manually. Use TikTok's official developer documentation and an approved server-side OAuth flow for any separate, permitted API integration.

## Privacy

Video URLs and watched status are stored in this browser's local storage. Clearing site data removes the queue. No analytics, account login, or external app server is used.
