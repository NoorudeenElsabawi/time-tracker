import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const ROLE_LABELS = { admin: 'Administrator', standard: 'Standard User' };

// Administrator list of user accounts (SCRUM-18), with status and edit links (SCRUM-19).
const AdminUsers = () => {
  const { user } = useAuth();
  const location = useLocation();
  const success = location.state?.success;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await axiosInstance.get('/api/users', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(response.data);
      } catch {
        setError('Could not load users. Refresh the page to try again.');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [user]);

  return (
    <div className="container mx-auto mt-8 px-6 pb-10 max-w-4xl">
      {success && (
        <div className="mb-4 p-3 rounded border border-green-600 bg-green-50 text-green-800" role="status">✓ {success}</div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link to="/admin/users/new" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          + New user
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">Role</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="px-4 py-6 text-gray-500">Loading users…</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u._id} className={`border-t border-slate-100 ${u.active === false ? 'text-gray-400' : ''}`}>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="px-4 py-3">
                  {u.active === false ? (
                    <span className="inline-block px-2 py-1 rounded-full text-sm bg-slate-100 text-slate-600">Deactivated</span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/admin/users/${u._id}/edit`} className="text-blue-600">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;