import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Administrator landing page. The job table itself is built in SCRUM-21.
const AdminJobs = () => {
  const { user } = useAuth();
  const location = useLocation();
  const success = location.state?.success;

  return (
    <div className="container mx-auto mt-10 px-6">
      {success && (
        <div className="mb-4 p-3 rounded border border-green-600 bg-green-50 text-green-800" role="status">
          ✓ {success}
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">All jobs</h1>
        <Link to="/admin/jobs/new" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          + New job
        </Link>
      </div>
      <p className="text-gray-600">Signed in as {user?.name} (Administrator).</p>
    </div>
  );
};

export default AdminJobs;