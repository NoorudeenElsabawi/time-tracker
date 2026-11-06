import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import RequireRole from './components/RequireRole';
import Login from './pages/Login';
import Profile from './pages/Profile';
import MyJobs from './pages/MyJobs';
import AdminJobs from './pages/AdminJobs';
import CreateJob from './pages/CreateJob';
import JobTimer from './pages/JobTimer';
import { useAuth, homePathFor } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user ? homePathFor(user.role) : '/login'} />} />
        <Route path="/login" element={user ? <Navigate to={homePathFor(user.role)} /> : <Login />} />
        <Route path="/profile" element={<RequireRole><Profile /></RequireRole>} />
        <Route path="/my-jobs" element={<RequireRole role="standard"><MyJobs /></RequireRole>} />
        <Route path="/my-jobs/:id" element={<RequireRole role="standard"><JobTimer /></RequireRole>} />
        <Route path="/admin/jobs" element={<RequireRole role="admin"><AdminJobs /></RequireRole>} />
        <Route path="/admin/jobs/new" element={<RequireRole role="admin"><CreateJob /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;