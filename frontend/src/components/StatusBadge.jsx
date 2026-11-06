// Coloured pill for a job's status. Colours match the Status badge component in Figma.
const STATUS_STYLES = {
  not_started: { label: 'Not started', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-800' },
  stopped: { label: 'Stopped', className: 'bg-amber-100 text-amber-800' },
  submitted: { label: 'Submitted', className: 'bg-violet-100 text-violet-800' },
  under_review: { label: 'Under review', className: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
};

const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${style.className}`}>
      {style.label}
    </span>
  );
};

export default StatusBadge;