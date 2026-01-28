# Deployment Guide

This project is structured for easy deployment with the Backend on **Render** and the Frontend on **Vercel**.

## 1. Backend Deployment (Render)

1. **Create a new Web Service**:
   - Connect your GitHub repository.
   - Set **Root Directory** to `backend`.
   - **Environment**: `Node`.
   - **Build Command**: `npm install`.
   - **Start Command**: `npm start`.

2. **Environment Variables**:
   Add the following variables in the Render dashboard:
   - `DEEPGRAM_API_KEY`: Your Deepgram API Key.
   - `GROQ_API_KEY`: Your Groq API Key.
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `FRONTEND_ORIGIN`: The URL of your Vercel deployment (e.g., `https://your-app.vercel.app`).
   - `TAVILY_API_KEY`: (Optional) For web search capabilities.
   - `PORT`: `10000` (Render usually sets this automatically).

---

## 2. Frontend Deployment (Vercel)

1. **Create a new Project**:
   - Connect your GitHub repository.
   - Set **Root Directory** to `frontend`.
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.

2. **Environment Variables**:
   Add the following variable in the Vercel dashboard:
   - `VITE_BACKEND_URL`: The URL of your Render backend (e.g., `https://voice-agent-backend.onrender.com`).

---

## 3. Post-Deployment Steps

1. Once the backend is deployed on Render, copy its URL.
2. Go to the Vercel dashboard for your frontend, and add/update `VITE_BACKEND_URL` with the backend URL.
3. Redeploy the frontend on Vercel.
4. Copy the frontend Vercel URL.
5. Go to the Render dashboard for your backend, and update `FRONTEND_ORIGIN` with the frontend URL.
6. The backend will automatically redeploy (or you can trigger it manually).

## Notes
- **CORS**: The backend uses `FRONTEND_ORIGIN` to allow secure cross-origin requests from your Vercel site.
- **WebSockets**: Socket.IO is configured to work with the deployment URLs.
