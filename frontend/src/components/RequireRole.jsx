import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext';

// Guards a page in the browser:
// - not logged in -> login page
// - logged in with the wrong role -> that user's own home page
// The real security check is on the server (protect + adminOnly); this just keeps users on the right screens.
const RequireRole = ({ role, children }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
};

export default RequireRole;
