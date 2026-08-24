<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Rounding Manager

Vite + React SPA for golf tee-time departure planning. Deployed on Netlify.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`
3. Paste a booking SMS/Kakao/calendar text, or use **AI 없이 직접 입력**, then save.

Gemini is optional. The app parses bookings locally and still produces a departure plan if AI is down. Do not put `GEMINI_API_KEY` in a `VITE_` variable — that would ship the key in the browser bundle.

On Netlify, add `GEMINI_API_KEY` as a server-only environment variable (or enable Netlify AI Gateway). The `/api/parse-booking` function uses it; the client never sees the key.
