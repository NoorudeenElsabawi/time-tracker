import axios from 'axios';

// In development the React dev server runs on :3000 and the API on :5001.
// In a production build the app is served by nginx, which forwards /api
// to the backend, so requests go to the same address the page came from.
const baseURL =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001';

const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export default axiosInstance;