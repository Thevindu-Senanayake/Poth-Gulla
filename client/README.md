# Poth Gulla — Mobile Client

Expo SDK 54 / React Native student-facing mobile app for the Poth Gulla library system.

---

## Features

- Login with JWT (stored via `expo-secure-store`)
- Browse the book/device/room catalogue
- Create bookings and view active loans
- QR scanner for self-checkout and room check-in
- View point balance and tier standing

---

## Getting started

```bash
cd client
yarn install
npx expo start
```

Scan the Metro QR with **Expo Go** on your phone, or press `i` / `a` for iOS/Android simulator.

The app reads `EXPO_PUBLIC_API_URL` (set in `client/.env`):

```dotenv
EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000/api
```

Use a local-tunnel or ngrok if testing on a physical device without being on the same network as the backend.

---

## Tech

- Expo SDK 54, expo-router (file-based routing)
- `expo-secure-store` for JWT persistence
- `expo-camera` / `expo-barcode-scanner` for QR scanning
- Axios for API calls

---

## Folder structure

```text
app/
├── (auth)/login.tsx    # Login screen
├── index.tsx           # Home / booking list
└── _layout.tsx         # Root layout + auth guard

src/
├── api/client.ts       # Axios instance with JWT interceptor
└── auth/AuthContext.tsx # JWT state + login/logout
```
