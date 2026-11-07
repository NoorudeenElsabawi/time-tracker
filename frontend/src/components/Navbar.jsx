import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <Link to={user ? homePathFor(user.role) : '/login'} className="text-2xl font-bold">
        Time Tracker
      </Link>
      <div className="flex items-center">
        {user ? (
          <>
            <Link to={homePathFor(user.role)} className="mr-4">
              {user.role === 'admin' ? 'Jobs' : 'My jobs'}
            </Link>
            {user.role === 'admin' && <Link to="/admin/users" className="mr-4">Users</Link>}
            <span className="mr-4 hidden sm:inline">{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;