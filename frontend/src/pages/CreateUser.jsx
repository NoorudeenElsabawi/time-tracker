import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const emptyForm = { name: '', email: '', password: '', role: 'standard' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the server (backend/utils/validateUser.js)
const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!['admin', 'standard'].includes(form.role)) errors.role = 'Select a role';
  return errors;
};

const inputClass = (error) =>
  `w-full p-2 border rounded bg-white ${error ? 'border-red-600 border-2' : 'border-gray-300'}`;

// Administrator form for issuing a login to a new technician or support team member (SCRUM-18).
const CreateUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Check the highlighted fields and try again.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const response = await axiosInstance.post('/api/users', form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      navigate('/admin/users', { state: { success: `Account created for ${response.data.name}` } });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setFormError(err.response?.data?.message || 'Could not create the account. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm text-gray-600 mb-1">{label}</label>
      <input id={name} value={form[name]} onChange={handleChange(name)} className={inputClass(errors[name])} {...props} />
      {errors[name] && <p className="text-sm text-red-600 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="container mx-auto mt-8 px-6 max-w-xl">
      <Link to="/admin/users" className="text-blue-600">‹ Back to users</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Create user</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded" noValidate>
        {formError && (
          <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{formError}</div>
        )}

        {field('name', 'Name', { placeholder: 'Tech C' })}
        {field('email', 'Email', { type: 'email', placeholder: 'name@computersquad.com.au' })}
        {field('password', 'Initial password', { type: 'password', autoComplete: 'new-password' })}
        <p className="text-xs text-gray-500 -mt-3 mb-4">At least 8 characters. Give this to the user in person.</p>

        <div className="mb-4">
          <label htmlFor="role" className="block text-sm text-gray-600 mb-1">Role</label>
          <select id="role" value={form.role} onChange={handleChange('role')} className={inputClass(errors.role)}>
            <option value="standard">Standard User (technician)</option>
            <option value="admin">Administrator (support team)</option>
          </select>
          {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/admin/users" className="px-4 py-2 rounded border border-gray-300 bg-white">Cancel</Link>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;