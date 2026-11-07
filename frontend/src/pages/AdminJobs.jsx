import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import StatusBadge from '../components/StatusBadge';

const STATUS_FILTERS = [
  ['', 'All statuses'],
  ['not_started', 'Not started'],
  ['in_progress', 'In progress'],
  ['stopped', 'Stopped'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
];

// Administrator home page: every job and its status (SCRUM-21).
const AdminJobs = () => {
  const { user } = useAuth();
  const location = useLocation();
  const success = location.state?.success;
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const query = status ? `?status=${status}` : '';
        const response = await axiosInstance.get(`/api/jobs${query}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setJobs(response.data);
      } catch {
        setError('Could not load jobs. Refresh the page to try again.');
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [status, user]);

  const awaitingReview = jobs.filter((job) => job.status === 'submitted').length;

  return (
    <div className="container mx-auto mt-8 px-6 pb-10 max-w-6xl">
      {success && (
        <div className="mb-4 p-3 rounded border border-green-600 bg-green-50 text-green-800" role="status">
          ✓ {success}
          {location.state?.jobId && (
            <Link to={`/admin/jobs/${location.state.jobId}`} className="ml-2 underline">View job</Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">All jobs</h1>
          {!status && awaitingReview > 0 && (
            <p className="text-sm text-violet-700">
              {awaitingReview} {awaitingReview === 1 ? 'job is' : 'jobs are'} waiting for review
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
          <select id="statusFilter" value={status} onChange={(e) => setStatus(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-white">
            {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Link to="/admin/jobs/new" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            + New job
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 font-normal">Job no.</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Address</th>
              <th className="px-4 py-3 font-normal">Technician</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="6" className="px-4 py-6 text-gray-500">Loading jobs…</td></tr>
            )}
            {!loading && !error && jobs.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center">
                  {status ? (
                    <p className="text-gray-500">No jobs with this status.</p>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">No jobs yet</p>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        Create a job from a booking to assign it to a technician.
                      </p>
                      <Link to="/admin/jobs/new" className="px-4 py-2 rounded bg-blue-600 text-white">+ New job</Link>
                    </>
                  )}
                </td>
              </tr>
            )}
            {!loading && jobs.map((job) => (
              <tr key={job._id} className="border-t border-slate-100">
                <td className="px-4 py-3">{job.jobNumber}</td>
                <td className="px-4 py-3">{job.customerName}</td>
                <td className="px-4 py-3 text-gray-600">{job.address}</td>
                <td className="px-4 py-3">{job.technician?.name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3">
                  <Link to={`/admin/jobs/${job._id}`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminJobs;