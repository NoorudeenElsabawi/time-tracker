import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the server (backend/utils/validateUser.js)
const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!['admin', 'standard'].includes(form.role)) errors.role = 'Select a role';
  return errors;
};

const inputClass = (error) =>
  `w-full p-2 border rounded bg-white ${error ? 'border-red-600 border-2' : 'border-gray-300'}`;

// Administrator page to edit a user's details and deactivate or reactivate their account (SCRUM-19).
const EditUser = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Administrators cannot deactivate themselves or change their own role
  const isSelf = String(id) === String(user.id);
  const auth = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await axiosInstance.get(`/api/users/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const { name, email, role, active } = response.data;
        setForm({ name, email, role, active });
      } catch (err) {
        setFormError(err.response?.status === 404 ? 'This user no longer exists.' : 'Could not load this user. Refresh the page to try again.');
      }
    };
    loadUser();
  }, [id, user]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  // Saves the form; "active" can be changed by the Deactivate / Reactivate buttons
  const save = async (active, successMessage) => {
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Check the highlighted fields and try again.');
      setConfirmDeactivate(false);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const response = await axiosInstance.put(`/api/users/${id}`, { ...form, active }, auth);
      navigate('/admin/users', { state: { success: successMessage(response.data.name) } });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setFormError(err.response?.data?.message || 'Could not save the changes. Try again.');
      setConfirmDeactivate(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save(form.active, (name) => `Changes saved for ${name}`);
  };

  const field = (name, label, props) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm text-gray-600 mb-1">{label}</label>
      <input id={name} value={form[name]} onChange={handleChange(name)} className={inputClass(errors[name])} {...props} />
      {errors[name] && <p className="text-sm text-red-600 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="container mx-auto mt-8 px-6 pb-10 max-w-xl">
      <Link to="/admin/users" className="text-blue-600">‹ Back to users</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Edit user</h1>

      {formError && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{formError}</div>
      )}

      {!form && !formError && <p className="text-gray-500">Loading user…</p>}

      {form && (
        <>
          <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded" noValidate>
            {form.active === false && (
              <div className="mb-4 p-3 rounded border border-slate-300 bg-slate-50 text-slate-700">
                This account is deactivated. The user cannot log in.
              </div>
            )}

            {field('name', 'Name')}
            {field('email', 'Email', { type: 'email' })}

            <div className="mb-4">
              <label htmlFor="role" className="block text-sm text-gray-600 mb-1">Role</label>
              <select id="role" value={form.role} onChange={handleChange('role')} disabled={isSelf}
                className={`${inputClass(errors.role)} disabled:bg-slate-100`}>
                <option value="standard">Standard User (technician)</option>
                <option value="admin">Administrator (support team)</option>
              </select>
              {isSelf && <p className="text-xs text-gray-500 mt-1">You cannot change your own role.</p>}
              {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Link to="/admin/users" className="px-4 py-2 rounded border border-gray-300 bg-white">Cancel</Link>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          {!isSelf && (
            <div className="bg-white p-6 shadow-md rounded mt-6">
              <h2 className="font-semibold mb-1">Account access</h2>
              {form.active !== false ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Deactivate this account when someone leaves. They will be logged out and cannot log in again.
                    Their jobs and recorded time are kept.
                  </p>
                  {!confirmDeactivate ? (
                    <button type="button" onClick={() => setConfirmDeactivate(true)}
                      className="px-4 py-2 rounded border border-red-600 text-red-700 bg-white hover:bg-red-50">
                      Deactivate account
                    </button>
                  ) : (
                    <div className="p-3 rounded border border-red-600 bg-red-50">
                      <p className="text-sm text-red-800 mb-3">Deactivate {form.name}'s account?</p>
                      <div className="flex gap-3">
                        <button type="button" disabled={saving}
                          onClick={() => save(false, (name) => `${name}'s account has been deactivated`)}
                          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                          Yes, deactivate
                        </button>
                        <button type="button" onClick={() => setConfirmDeactivate(false)}
                          className="px-4 py-2 rounded border border-gray-300 bg-white">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">Reactivate this account to let the user log in again.</p>
                  <button type="button" disabled={saving}
                    onClick={() => save(true, (name) => `${name}'s account has been reactivated`)}
                    className="px-4 py-2 rounded border border-green-700 text-green-800 bg-white hover:bg-green-50 disabled:opacity-60">
                    Reactivate account
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EditUser;