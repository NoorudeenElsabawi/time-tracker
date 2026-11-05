import { useAuth } from '../context/AuthContext';

// Standard User landing page. The job list itself is built in SCRUM-25.
const MyJobs = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-1">My jobs</h1>
      <p className="text-gray-600">Hi, {user?.name}. Your assigned jobs will appear here.</p>
    </div>
  );
};

export default MyJobs;