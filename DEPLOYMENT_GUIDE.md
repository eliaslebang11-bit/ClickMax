# Deployment Guide: Expo + Render + Environment Variables

This guide explains how to securely manage environment variables for the ClickMax project, ensuring production-ready separation between the frontend (Expo) and backend (Render).

## 1. Project Architecture
- **Frontend**: Expo (React Native) -> Deployed via EAS Build (Play Store/App Store).
- **Backend**: Express.js -> Deployed on Render.
- **Database**: Supabase.
- **Storage**: Cloudflare R2 / Stream.

## 2. Environment Variable Configuration

### Frontend (Expo / Mobile)
For variables targetting the mobile app, we use the `EXPO_PUBLIC_` prefix (introduced in Expo SDK 49). These are bundled into the app at build time.

**Create a `.env` file locally for development:**
```env
EXPO_PUBLIC_API_URL=https://your-backend-on-render.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Warning**: Never put secrets like `SUPABASE_SERVICE_ROLE_KEY` or `CLOUDFLARE_API_KEY` in the frontend environment variables. They will be visible to anyone who decompiles your app.

### Backend (Render / Secrets)
These variables are set in the **Render Dashboard -> Environment** section. They are handled purely on the server and are never exposed to the client.

**Required Render Environment Variables:**
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key for database operations.
- `JWT_SECRET`: Secret for signing tokens (optional but recommended).
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: Storage access key.
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: Storage secret key.
- `CLOUDFLARE_API_TOKEN`: Cloudflare Stream API token.
- `PORT`: 3000 (standard for this container).

## 3. Communication Flow
1. **Frontend** performs user authentication using the **Anon Key** and Supabase URL.
2. **Frontend** calls the **Render Backend** using the `EXPO_PUBLIC_API_URL`.
3. **Backend** validates the user's session with Supabase and performs privileged operations (e.g., uploading to R2, updating analytics) using the **Service Role Key**.

## 4. Production Build Commands

### Backend (Render)
Render should be configured to run:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Frontend (EAS Build)
To build for production:
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Configure project
eas build:configure

# 3. Build for Android (Production)
eas build --platform android --profile production
```

The build process will automatically pick up `EXPO_PUBLIC_` variables from your local `.env` or from EAS secrets established via `eas secret:create`.
