import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const emptyForm = {
  jobNumber: '',
  customerName: '',
  address: '',
  technician: '',
  calloutFee: '',
  labourRate: '',
};

// Same rules as the server (backend/utils/validateJob.js), so errors show before submitting.
const validate = (form) => {
  const errors = {};
  if (!form.jobNumber.trim()) errors.jobNumber = 'Job number is required';
  if (!form.customerName.trim()) errors.customerName = 'Customer name is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.technician) errors.technician = 'Select a technician';
  ['calloutFee', 'labourRate'].forEach((field) => {
    if (form[field] === '') errors[field] = 'This field is required';
    else if (!(Number(form[field]) > 0)) errors[field] = 'Must be a positive number';
  });
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

const CreateJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
                const response = await axiosInstance.get('/api/users?role=standard&active=true', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setTechnicians(response.data);
      } catch {
        setFormError('Could not load technicians. Refresh the page to try again.');
      }
    };
    loadTechnicians();
  }, [user]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const response = await axiosInstance.post('/api/jobs', form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
            navigate('/admin/jobs', {
        state: { success: `Job #${response.data.jobNumber} created`, jobId: response.data._id },
      });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setFormError(err.response?.data?.message || 'Could not save the job. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto mt-8 px-6 max-w-3xl">
      <Link to="/admin/jobs" className="text-blue-600">‹ Back to jobs</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Create job</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded" noValidate>
        {formError && (
          <div className="mb-4 p-3 rounded border border-red-600 bg-red-50 text-red-700" role="alert">
            {formError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:gap-4">
          <Field label="Job number" name="jobNumber" error={errors.jobNumber}>
            <input id="jobNumber" value={form.jobNumber} onChange={handleChange('jobNumber')}
              placeholder="1239" className={inputClass(errors.jobNumber)} />
          </Field>
          <Field label="Customer name" name="customerName" error={errors.customerName}>
            <input id="customerName" value={form.customerName} onChange={handleChange('customerName')}
              placeholder="Alex Nguyen" className={inputClass(errors.customerName)} />
          </Field>
        </div>

        <Field label="Address" name="address" error={errors.address}>
          <input id="address" value={form.address} onChange={handleChange('address')}
            placeholder="12 Example St, Brisbane 4000" className={inputClass(errors.address)} />
        </Field>

        <Field label="Assign technician" name="technician" error={errors.technician}>
          <select id="technician" value={form.technician} onChange={handleChange('technician')}
            className={inputClass(errors.technician)}>
            <option value="">Select a technician</option>
            {technicians.map((tech) => (
              <option key={tech._id} value={tech._id}>{tech.name}</option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col sm:flex-row sm:gap-4">
          <Field label="Call-out fee ($, ex GST)" name="calloutFee" error={errors.calloutFee}>
            <input id="calloutFee" type="number" min="0" step="0.01" value={form.calloutFee}
              onChange={handleChange('calloutFee')} placeholder="0.00" className={inputClass(errors.calloutFee)} />
          </Field>
          <Field label="Labour rate per 15 min ($, ex GST)" name="labourRate" error={errors.labourRate}>
            <input id="labourRate" type="number" min="0" step="0.01" value={form.labourRate}
              onChange={handleChange('labourRate')} placeholder="0.00" className={inputClass(errors.labourRate)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Link to="/admin/jobs" className="px-4 py-2 rounded border border-gray-300 bg-white">Cancel</Link>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;