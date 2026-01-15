# Deployment Guide for BetX

This guide explains how to deploy the backend to **Render** and the frontend to **Vercel**.

## 1. Backend Deployment (Render)

### Steps:
1.  **Repository**: Push the `betx-backend` folder to a GitHub repository.
2.  **Create Web Service**:
    *   Log in to [Render](https://render.com).
    *   Click **New +** > **Web Service**.
    *   Connect your GitHub repository and select the `betx-backend` folder (or the whole repo if it's there).
3.  **Configuration**:
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
4.  **Environment Variables**:
    *   Add all variables from `betx-backend/.env` to the Render dashboard:
        *   `NODE_ENV`: `production`
        *   `PORT`: `7000` (Render will set this automatically, but you can specify it)
        *   `SUPABASE_URL`: Your Supabase URL
        *   `SUPABASE_SERVICE_KEY`: Your Supabase Service Key
        *   `REDIS_URL`: Your Redis URL (Render provides Redis services)
        *   `JWT_SECRET`: A long random string
        *   `JWT_REFRESH_SECRET`: Another long random string
        *   `CLIENT_URL`: **Set this to your Vercel URL** (e.g., `https://betx-frontend.vercel.app`)
        *   Add any others (CASHFREE, TATUM, etc.)

---

## 2. Frontend Deployment (Vercel)

### Steps:
1.  **Repository**: Push the `betx-frontend` folder to a GitHub repository.
2.  **Create Project**:
    *   Log in to [Vercel](https://vercel.com).
    *   Click **Add New** > **Project**.
    *   Connect your GitHub repository and select the `betx-frontend` folder.
3.  **Configuration**:
    *   **Framework Preset**: `Next.js` (Vercel detects this)
    *   **Build Command**: `next build` (Default)
4.  **Environment Variables**:
    *   Add these variables to the Vercel dashboard:
        *   `NEXT_PUBLIC_API_URL`: **Set this to your Render URL** (e.g., `https://betx-backend.onrender.com`)
        *   `NEXT_PUBLIC_SOCKET_URL`: **Same as above** (e.g., `https://betx-backend.onrender.com`)

---

## 3. Important Notes

### Database Migration
Ensure you have executed the `supabase_schema.sql` in your Supabase SQL Editor to create the necessary tables and functions before starting the backend.

### CORS Errors
If you see CORS errors:
1.  Verify that `CLIENT_URL` in Render matches your Vercel URL exactly (including `https://` and no trailing slash).
2.  Redeploy the backend after updating the variable.

### Socket.IO
The application is configured to use both `websocket` and `polling` transports, ensuring compatibility even if some networks block WebSockets.
