import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import StatusBadge from '../components/StatusBadge';

// <input type="datetime-local"> works in local time without seconds, e.g. "2026-11-02T09:00"
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const rowMinutes = (row) => {
  if (!row.start || !row.end) return null;
  const minutes = Math.floor((new Date(row.end) - new Date(row.start)) / 60000);
  return minutes > 0 ? minutes : null;
};

// Same rules as the server (backend/utils/validateJob.js and validateTimes.js)
const validate = (form, rows) => {
  const errors = {};
  if (!form.jobNumber.trim()) errors.jobNumber = 'Job number is required';
  if (!form.customerName.trim()) errors.customerName = 'Customer name is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.technician) errors.technician = 'Select a technician';
  ['calloutFee', 'labourRate'].forEach((field) => {
    if (form[field] === '') errors[field] = 'This field is required';
    else if (!(Number(form[field]) > 0)) errors[field] = 'Must be a positive number';
  });

  const timeErrors = {};
  rows.forEach((row, i) => {
    if (!row.start) timeErrors[i] = 'Start time is required';
    else if (!row.end) timeErrors[i] = 'End time is required';
    else if (new Date(row.end) <= new Date(row.start)) timeErrors[i] = 'End time must be after start time';
    else if (i > 0 && rows[i - 1].end && new Date(row.start) < new Date(rows[i - 1].end)) {
      timeErrors[i] = 'This segment overlaps the one before it';
    }
  });
  if (Object.keys(timeErrors).length) errors.timeSegments = timeErrors;
  return errors;
};

const Field = ({ label, name, error, children }) => (
  <div className="flex-1 mb-4">
    <label htmlFor={name} className="block text-sm text-gray-600 mb-1">{label}</label>
    {children}
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
);

const inputClass = (error) =>
  `w-full p-2 border rounded bg-white ${error ? 'border-red-600 border-2' : 'border-gray-300'}`;

// Administrator form to correct a job's details and recorded times (SCRUM-22).
const EditJob = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [form, setForm] = useState(null);
  const [rows, setRows] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = { headers: { Authorization: `Bearer ${user.token}` } };
    const load = async () => {
      try {
        const [jobResponse, techResponse] = await Promise.all([
          axiosInstance.get(`/api/jobs/${id}`, auth),
          axiosInstance.get('/api/users?role=standard&active=true', auth),
        ]);
        const loaded = jobResponse.data.job;
        setJob(loaded);
        setForm({
          jobNumber: loaded.jobNumber,
          customerName: loaded.customerName,
          address: loaded.address,
          technician: loaded.technician?._id || '',
          calloutFee: String(loaded.calloutFee),
          labourRate: String(loaded.labourRate),
        });
        // Keep the original times so unchanged rows are saved exactly as recorded (to the second)
        setRows(loaded.timeSegments.map((seg) => ({
          start: toLocalInput(seg.start), end: toLocalInput(seg.end), original: seg,
        })));
        // The current technician stays in the list even if their account has since been deactivated
        const techs = techResponse.data;
        if (loaded.technician && !techs.some((t) => t._id === loaded.technician._id)) {
          techs.push({ _id: loaded.technician._id, name: `${loaded.technician.name} (deactivated)` });
        }
        setTechnicians(techs);
      } catch (err) {
        setFormError(err.response?.data?.message || 'Could not load this job. Refresh the page to try again.');
      }
    };
    load();
  }, [id, user]);

  const timerRunning = job?.status === 'in_progress';

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  const handleTimeChange = (index, field) => (e) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: e.target.value } : row)));
    if (errors.timeSegments) {
      const timeErrors = { ...errors.timeSegments };
      delete timeErrors[index];
      setErrors({ ...errors, timeSegments: timeErrors });
    }
  };

  // Unchanged rows send the original time; edited rows send the new time
  const segmentsToSave = () => rows.map((row) => ({
    start: row.start === toLocalInput(row.original.start) ? row.original.start : new Date(row.start).toISOString(),
    end: row.end === toLocalInput(row.original.end) ? row.original.end : new Date(row.end).toISOString(),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form, timerRunning ? [] : rows);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const body = timerRunning ? form : { ...form, timeSegments: segmentsToSave() };
      const response = await axiosInstance.put(`/api/jobs/${id}`, body, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const success = response.data.reopened
        ? 'Changes saved. The job is back in Under review and needs to be approved again.'
        : 'Changes saved.';
      navigate(`/admin/jobs/${id}`, { state: { success } });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setFormError(err.response?.data?.message || 'Could not save the changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const timeErrors = errors.timeSegments || {};

  return (
    <div className="container mx-auto mt-8 px-6 pb-10 max-w-3xl">
      <Link to={`/admin/jobs/${id}`} className="text-blue-600">‹ Back to job</Link>
      <div className="flex items-center gap-3 mt-2 mb-4">
        <h1 className="text-2xl font-bold">Edit job{job ? ` #${job.jobNumber}` : ''}</h1>
        {job && <StatusBadge status={job.status} />}
      </div>

      {formError && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">{formError}</div>
      )}
      {!form && !formError && <p className="text-gray-500">Loading job…</p>}

      {form && (
        <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded" noValidate>
          {job.status === 'approved' && (
            <div className="mb-4 p-3 rounded border border-amber-500 bg-amber-50 text-amber-800">
              This job is approved. Saving changes will return it to Under review so it can be approved again.
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:gap-4">
            <Field label="Job number" name="jobNumber" error={errors.jobNumber}>
              <input id="jobNumber" value={form.jobNumber} onChange={handleChange('jobNumber')} className={inputClass(errors.jobNumber)} />
            </Field>
            <Field label="Customer name" name="customerName" error={errors.customerName}>
              <input id="customerName" value={form.customerName} onChange={handleChange('customerName')} className={inputClass(errors.customerName)} />
            </Field>
          </div>

          <Field label="Address" name="address" error={errors.address}>
            <input id="address" value={form.address} onChange={handleChange('address')} className={inputClass(errors.address)} />
          </Field>

          <Field label="Technician" name="technician" error={errors.technician}>
            <select id="technician" value={form.technician} onChange={handleChange('technician')} className={inputClass(errors.technician)}>
              <option value="">Select a technician</option>
              {technicians.map((tech) => (
                <option key={tech._id} value={tech._id}>{tech.name}</option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col sm:flex-row sm:gap-4">
            <Field label="Call-out fee ($, ex GST)" name="calloutFee" error={errors.calloutFee}>
              <input id="calloutFee" type="number" min="0" step="0.01" value={form.calloutFee}
                onChange={handleChange('calloutFee')} className={inputClass(errors.calloutFee)} />
            </Field>
            <Field label="Labour rate per 15 min ($, ex GST)" name="labourRate" error={errors.labourRate}>
              <input id="labourRate" type="number" min="0" step="0.01" value={form.labourRate}
                onChange={handleChange('labourRate')} className={inputClass(errors.labourRate)} />
            </Field>
          </div>

          <h2 className="font-medium mt-2 mb-2">Time segments</h2>
          {timerRunning && (
            <p className="text-sm text-gray-600 mb-4">
              The technician&apos;s timer is running. Times can be edited once they stop it.
            </p>
          )}
          {!timerRunning && rows.length === 0 && (
            <p className="text-sm text-gray-500 mb-4">No time recorded yet.</p>
          )}
          {!timerRunning && timeErrors.general && <p className="text-sm text-red-600 mb-2">{timeErrors.general}</p>}
          {!timerRunning && rows.map((row, i) => (
            <div key={i} className="mb-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
                <div className="flex-1">
                  <label htmlFor={`start-${i}`} className="block text-xs text-gray-500 mb-1">Start</label>
                  <input id={`start-${i}`} type="datetime-local" value={row.start} onChange={handleTimeChange(i, 'start')}
                    className={inputClass(timeErrors[i])} />
                </div>
                <div className="flex-1">
                  <label htmlFor={`end-${i}`} className="block text-xs text-gray-500 mb-1">End</label>
                  <input id={`end-${i}`} type="datetime-local" value={row.end} onChange={handleTimeChange(i, 'end')}
                    className={inputClass(timeErrors[i])} />
                </div>
                <span className="sm:w-20 text-sm text-gray-600 sm:pb-2">
                  {rowMinutes(row) !== null ? `${rowMinutes(row)} min` : '—'}
                </span>
              </div>
              {timeErrors[i] && <p className="text-sm text-red-600 mt-1">{timeErrors[i]}</p>}
            </div>
          ))}

          <div className="flex justify-end gap-3 mt-4">
            <Link to={`/admin/jobs/${id}`} className="px-4 py-2 rounded border border-gray-300 bg-white">Cancel</Link>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditJob;