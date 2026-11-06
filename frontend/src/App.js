import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Profile from './pages/Profile';
import MyJobs from './pages/MyJobs';
import AdminJobs from './pages/AdminJobs';
import { useAuth, homePathFor } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user ? homePathFor(user.role) : '/login'} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
      </Routes>
    </Router>
  );
}

export default App;