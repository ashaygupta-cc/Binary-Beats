// Backend origin for all API clients. Empty string means "same origin"
// (Vite's dev proxy locally, or a same-domain deploy in production). Set
// VITE_API_URL to the deployed API's full origin (e.g. https://binary-beats-api.onrender.com)
// when the frontend and backend live on different domains, such as a
// Vercel frontend talking to a Render backend.
export const API_ORIGIN = import.meta.env.VITE_API_URL ?? "";
