import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, Trash2 } from 'lucide-react';

const PERIOD_TIMES = [
  { period: 1, start: '08:40', end: '09:30', label: '8:40 – 9:30 AM' },
  { period: 2, start: '09:30', end: '10:20', label: '9:30 – 10:20 AM' },
  { period: 3, start: '10:35', end: '11:25', label: '10:35 – 11:25 AM' },
  { period: 4, start: '11:25', end: '12:15', label: '11:25 AM – 12:15 PM' },
  { period: 5, start: '12:55', end: '13:45', label: '12:55 – 1:45 PM' },
  { period: 6, start: '13:45', end: '14:35', label: '1:45 – 2:35 PM' },
  { period: 7, start: '14:50', end: '15:40', label: '2:50 – 3:40 PM' },
  { period: 8, start: '15:40', end: '16:25', label: '3:40 – 4:25 PM' },
];

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableEntryModal = ({ isOpen, onClose, onSave, onDelete, entry, offerings, sectionId }) => {
  const [formData, setFormData] = useState({
    offering_id: '',
    day_of_week: 1,
    period_number: 1,
    start_time: '08:40',
    end_time: '09:30',
    room: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!entry?.id;

  useEffect(() => {
    if (entry) {
      setFormData({
        offering_id: entry.offering_id || '',
        day_of_week: entry.day_of_week || 1,
        period_number: entry.period_number || 1,
        start_time: entry.start_time || '08:40',
        end_time: entry.end_time || '09:30',
        room: entry.room || '',
      });
    } else {
      setFormData({
        offering_id: '',
        day_of_week: 1,
        period_number: 1,
        start_time: '08:40',
        end_time: '09:30',
        room: '',
      });
    }
    setError('');
  }, [entry, isOpen]);

  // Auto-fill times when period changes
  const handlePeriodChange = (periodNum) => {
    const p = PERIOD_TIMES.find(pt => pt.period === parseInt(periodNum));
    if (p) {
      setFormData(prev => ({ ...prev, period_number: p.period, start_time: p.start, end_time: p.end }));
    } else {
      setFormData(prev => ({ ...prev, period_number: parseInt(periodNum) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.offering_id) { setError('Please select a subject.'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        section_id: sectionId,
        ...formData,
        day_of_week: parseInt(formData.day_of_week),
        period_number: parseInt(formData.period_number),
      }, entry?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry?.id) return;
    if (!confirm('Delete this timetable entry?')) return;
    setSaving(true);
    try {
      await onDelete(entry.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div
        className="glass-panel animate-pop-in"
        style={{
          width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
          padding: '32px', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            {isEditing ? '✏️ Edit Timetable Entry' : '➕ Add Timetable Entry'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px',
            display: 'flex', gap: '8px', alignItems: 'flex-start',
          }}>
            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subject offering */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--text-subtle)' }}>
              Subject
            </label>
            <select
              value={formData.offering_id}
              onChange={e => setFormData(prev => ({ ...prev, offering_id: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.9rem',
              }}
            >
              <option value="">-- Select Subject --</option>
              {(offerings || []).map(o => {
                const subj = o.subjects || {};
                return (
                  <option key={o.id} value={o.id}>
                    {subj.code} — {subj.name} ({o.teacher_portal_id})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Day + Period */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--text-subtle)' }}>
                Day
              </label>
              <select
                value={formData.day_of_week}
                onChange={e => setFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', fontSize: '0.9rem',
                }}
              >
                {[1, 2, 3, 4, 5].map(d => (
                  <option key={d} value={d}>{DAY_NAMES[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--text-subtle)' }}>
                Period
              </label>
              <select
                value={formData.period_number}
                onChange={e => handlePeriodChange(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', fontSize: '0.9rem',
                }}
              >
                {PERIOD_TIMES.map(p => (
                  <option key={p.period} value={p.period}>Period {p.period} ({p.label})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Room */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', display: 'block', color: 'var(--text-subtle)' }}>
              Room
            </label>
            <input
              type="text"
              placeholder="e.g. Room 301, AIOT Lab, Java Lab"
              value={formData.room}
              onChange={e => setFormData(prev => ({ ...prev, room: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Time display */}
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
            <span>⏰ {formData.start_time} – {formData.end_time}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
            >
              <Save size={16} /> {saving ? 'Saving...' : (isEditing ? 'Update Entry' : 'Create Entry')}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="btn"
                style={{
                  padding: '12px 16px', fontSize: '0.9rem', fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimetableEntryModal;
