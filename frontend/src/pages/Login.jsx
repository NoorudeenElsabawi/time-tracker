import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/auth/login', formData);
      login(response.data);
      navigate(homePathFor(response.data.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded" noValidate>
        <h1 className="text-2xl font-bold mb-1 text-center">Time Tracker</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Sign in with the details from your support team
        </p>

        <label className="block text-sm text-gray-600 mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="name@computersquad.com.au"
          value={formData.email}
          onChange={handleChange('email')}
          className={`w-full mb-4 p-2 border rounded ${error ? 'border-red-500' : ''}`}
        />

        <label className="block text-sm text-gray-600 mb-1" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={handleChange('password')}
          className={`w-full mb-4 p-2 border rounded ${error ? 'border-red-500' : ''}`}
        />

        {error && (
          <div className="mb-4 p-3 rounded border border-red-500 bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
};

export default Login;