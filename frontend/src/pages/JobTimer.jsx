import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import StatusBadge from '../components/StatusBadge';

// Total time worked across all segments, in milliseconds. An open segment counts up to "now".
const workedMs = (segments, now) =>
  segments.reduce((total, seg) => {
    const start = new Date(seg.start).getTime();
    const end = seg.end ? new Date(seg.end).getTime() : now;
    return total + Math.max(0, end - start);
  }, 0);

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatClock = (date) =>
  new Date(date).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' });

const JobTimer = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Difference between the server clock and this device's clock, so the display matches server time
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(Date.now());

  const authHeader = { headers: { Authorization: `Bearer ${user.token}` } };

  const applyResponse = useCallback((data) => {
    setJob(data.job);
    setClockOffset(new Date(data.serverTime).getTime() - Date.now());
  }, []);

  useEffect(() => {
    const loadJob = async () => {
      try {
        const response = await axiosInstance.get(`/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        applyResponse(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this job. Refresh the page to try again.');
      }
    };
    loadJob();
  }, [id, user, applyResponse]);

  // Tick every second while the timer is running
  useEffect(() => {
    if (job?.status !== 'in_progress') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [job?.status]);

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    try {
      const response = await axiosInstance.post(`/api/jobs/${id}/${action}`, {}, authHeader);
      applyResponse(response.data);
      setNow(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <div className="max-w-md mx-auto mt-6 px-4">
        <Link to="/my-jobs" className="text-blue-600">‹ Back to my jobs</Link>
        {error
          ? <div className="mt-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
          : <p className="text-gray-500 mt-6">Loading job…</p>}
      </div>
    );
  }

  const elapsed = workedMs(job.timeSegments, now + clockOffset);
  const lastSegment = job.timeSegments[job.timeSegments.length - 1];
  const bigButton = 'w-full py-4 rounded-lg text-white text-lg font-semibold disabled:opacity-60';

  return (
    <div className="max-w-md mx-auto mt-6 px-4 pb-10">
      <Link to="/my-jobs" className="text-blue-600">‹ Back to my jobs</Link>
      <h1 className="text-xl font-semibold mt-2">Job #{job.jobNumber}</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mt-3">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-gray-800">{job.customerName}</p>
            <p className="text-sm text-gray-500">{job.address}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mt-3 text-center">
        <p className="text-5xl font-mono font-semibold tracking-wider" aria-live="polite">{formatDuration(elapsed)}</p>
        <p className="text-sm text-gray-500 mt-1">
          {job.status === 'in_progress' && lastSegment ? `Running since ${formatClock(lastSegment.start)}` : 'Time on site'}
        </p>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
      )}

      <div className="mt-4">
        {job.status === 'not_started' && (
          <button onClick={() => runAction('start')} disabled={busy} className={`${bigButton} bg-green-600 hover:bg-green-700`}>
            Start timer
          </button>
        )}
        {job.status === 'in_progress' && (
          <button onClick={() => runAction('stop')} disabled={busy} className={`${bigButton} bg-red-600 hover:bg-red-700`}>
            Stop timer
          </button>
        )}
        {job.status === 'stopped' && (
          <button onClick={() => runAction('resume')} disabled={busy} className={`${bigButton} bg-green-600 hover:bg-green-700`}>
            Resume
          </button>
        )}
      </div>

      {job.status === 'in_progress' && (
        <p className="text-sm text-gray-500 text-center mt-2">Stop the timer to submit this job</p>
      )}

      {job.timeSegments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl mt-4 overflow-hidden">
          <p className="px-4 py-2 text-sm text-gray-500 bg-slate-50">Time segments</p>
          {job.timeSegments.map((seg) => (
            <div key={seg.start} className="flex justify-between px-4 py-2 border-t border-slate-100 text-sm">
              <span>{formatClock(seg.start)} – {seg.end ? formatClock(seg.end) : 'running'}</span>
              <span className="text-gray-500">{formatDuration(workedMs([seg], now + clockOffset))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobTimer;