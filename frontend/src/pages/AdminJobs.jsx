import { useAuth } from '../context/AuthContext';

// Administrator landing page. The job table itself is built in SCRUM-21.
const AdminJobs = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto mt-10 px-6">
      <h1 className="text-2xl font-bold mb-1">All jobs</h1>
      <p className="text-gray-600">Signed in as {user?.name} (Administrator).</p>
    </div>
  );
};

export default AdminJobs;