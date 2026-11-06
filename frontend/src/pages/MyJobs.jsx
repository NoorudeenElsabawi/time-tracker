import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import StatusBadge from '../components/StatusBadge';

// Standard User home page: the jobs assigned to this technician.
const MyJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await axiosInstance.get('/api/jobs/mine', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setJobs(response.data);
      } catch {
        setError('Could not load your jobs. Refresh the page to try again.');
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [user]);

  const countText = `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} assigned`;

  return (
    <div className="max-w-md mx-auto mt-6 px-4 pb-10">
      <h1 className="text-xl font-semibold">Hi, {user?.name}</h1>
      {!loading && !error && <p className="text-sm text-gray-500 mb-4">{countText}</p>}

      {loading && <p className="text-gray-500 mt-6">Loading your jobs…</p>}

      {error && (
        <div className="mt-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="text-center mt-16">
          <div className="text-4xl mb-2" aria-hidden="true">📋</div>
          <h2 className="text-lg font-semibold">No jobs assigned yet</h2>
          <p className="text-sm text-gray-500 mt-1">
            When the support team assigns you a job, it&apos;ll appear here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <Link
            key={job._id}
            to={`/my-jobs/${job._id}`}
            className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="font-semibold">Job #{job.jobNumber}</p>
                <p className="text-gray-800">{job.customerName}</p>
                <p className="text-sm text-gray-500">{job.address}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={job.status} />
                <span className="text-gray-400 text-xl" aria-hidden="true">›</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyJobs;