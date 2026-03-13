import axios from 'axios';

// All API calls go through this instance.
// Base URL: in dev the Vite proxy forwards /api → localhost:3001
// In production, /api is served by Nginx → localhost:3001 on the same host
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
