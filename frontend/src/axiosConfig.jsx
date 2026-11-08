import axios from 'axios';

// Local development: the API runs on localhost:5001.
// Production build (EC2): the API runs on port 5001 of the same server
// that served this page, so it keeps working when the public IP changes.
const baseURL =
  process.env.NODE_ENV === 'production'
    ? `${window.location.protocol}//${window.location.hostname}:5001`
    : 'http://localhost:5001';

const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export default axiosInstance;