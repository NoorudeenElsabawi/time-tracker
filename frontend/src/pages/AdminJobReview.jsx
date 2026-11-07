import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import StatusBadge from '../components/StatusBadge';

const money = (amount) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

const formatClock = (date) =>
  new Date(date).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' });

const segmentMinutes = (seg) =>
  seg.end ? Math.floor((new Date(seg.end) - new Date(seg.start)) / 60000) : null;

// Administrator view of a single job: details, time, cost (SCRUM-29) and review/approve (SCRUM-24).
const AdminJobReview = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [cost, setCost] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadJob = async () => {
      try {
        const response = await axiosInstance.get(`/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setJob(response.data.job);
        setCost(response.data.cost);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this job. Refresh the page to try again.');
      }
    };
    loadJob();
  }, [id, user]);

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await axiosInstance.post(`/api/jobs/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setJob(response.data.job);
      setCost(response.data.cost);
      setSuccess(action === 'approve' ? "Job approved. It's ready for invoicing." : 'Review started.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <div className="container mx-auto mt-8 px-6">
        <Link to="/admin/jobs" className="text-blue-600">‹ Back to jobs</Link>
        {error
          ? <div className="mt-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
          : <p className="text-gray-500 mt-6">Loading job…</p>}
      </div>
    );
  }

  const details = [
    ['Customer', job.customerName],
    ['Address', job.address],
    ['Technician', job.technician?.name || '—'],
    ['Call-out fee', money(job.calloutFee)],
    ['Rate per 15 min', money(job.labourRate)],
  ];

  return (
    <div className="container mx-auto mt-8 px-6 pb-10 max-w-5xl">
      {success && (
        <div className="mb-4 p-3 rounded border border-green-600 bg-green-50 text-green-800" role="status">✓ {success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{error}</div>
      )}
      <Link to="/admin/jobs" className="text-blue-600">‹ Back to jobs</Link>
      <div className="flex items-center gap-3 mt-2 mb-4">
        <h1 className="text-2xl font-bold">Job #{job.jobNumber}</h1>
        <StatusBadge status={job.status} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
        {details.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <h2 className="font-medium mb-2">Time segments</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 text-sm text-gray-500">
              <span>Start</span><span>End</span><span>Duration</span>
            </div>
            {job.timeSegments.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">No time recorded yet.</p>
            )}
            {job.timeSegments.map((seg) => (
              <div key={seg.start} className="grid grid-cols-3 px-4 py-2 border-t border-slate-100">
                <span>{formatClock(seg.start)}</span>
                <span>{seg.end ? formatClock(seg.end) : 'running'}</span>
                <span>{seg.end ? `${segmentMinutes(seg)} min` : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium mb-2">Cost summary</h2>
          <div className="bg-white border-2 border-blue-600 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-gray-500">Total time</span><span>{cost.totalMinutes} min</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Billable blocks</span><span>{cost.billableBlocks}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Call-out fee</span><span>{money(cost.calloutFee)}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Labour ({cost.billableBlocks} × {money(cost.labourRate)})</span>
              <span>{money(cost.labourCost)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1 text-lg font-semibold">
              <span>Total cost</span><span>{money(cost.totalCost)}</span>
            </div>
            {['not_started', 'in_progress', 'stopped'].includes(job.status) && (
              <p className="text-xs text-gray-500">Estimate: the job hasn&apos;t been submitted yet.</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-medium mt-4 mb-2">Technician notes</h2>
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-gray-700 min-h-[4rem]">
        {job.notes || <span className="text-gray-400">No notes added.</span>}
      </div>

      <div className="flex flex-wrap justify-end items-center gap-3 mt-6">
        {job.status === 'approved' && (
          <p className="text-sm text-gray-500 mr-auto">
            Approved{job.approvedBy?.name ? ` by ${job.approvedBy.name}` : ''}
            {job.approvedAt ? ` on ${new Date(job.approvedAt).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}` : ''}
          </p>
        )}
        {['not_started', 'in_progress', 'stopped'].includes(job.status) && (
          <p className="text-sm text-gray-500 mr-auto">The technician hasn&apos;t submitted this job yet.</p>
        )}
        {job.status === 'submitted' && (
          <button onClick={() => runAction('review')} disabled={busy}
            className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60">
            Start review
          </button>
        )}
        {job.status === 'under_review' && (
          <button onClick={() => runAction('approve')} disabled={busy}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Approving…' : 'Approve'}
          </button>
        )}
        {job.status === 'approved' && (
          <Link to="/admin/jobs" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Back to jobs</Link>
        )}
      </div>
    </div>
  );
};

export default AdminJobReview;