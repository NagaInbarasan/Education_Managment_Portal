import React, { useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';

const DAY_NAMES = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

const ALL_PERIODS = [
  { number: 1, start: '08:40', end: '09:30' },
  { number: 2, start: '09:30', end: '10:20' },
  { type: 'break', label: 'Short Break', time: '10:20 – 10:35' },
  { number: 3, start: '10:35', end: '11:25' },
  { number: 4, start: '11:25', end: '12:15' },
  { type: 'break', label: 'Lunch Break', time: '12:15 – 12:55' },
  { number: 5, start: '12:55', end: '13:45' },
  { number: 6, start: '13:45', end: '14:35' },
  { type: 'break', label: 'Short Break', time: '14:35 – 14:50' },
  { number: 7, start: '14:50', end: '15:40' },
  { number: 8, start: '15:40', end: '16:25' },
];

/**
 * Reusable weekly timetable grid.
 * Props:
 *   entries: array of timetable_entries with nested subject_offerings.subjects and sections
 *   viewMode: 'student' | 'teacher' | 'hod'
 *   editable: boolean — show edit/add/delete controls
 *   onEditEntry: (entry) => void — called when edit icon is clicked
 *   onAddEntry: (day, period) => void — called when empty cell "+" is clicked
 *   onDeleteEntry: (entry) => void — called when delete is clicked
 *   title: optional heading
 *   subtitle: optional subheading
 */
const TimetableGrid = ({ entries = [], viewMode = 'student', editable = false, onEditEntry, onAddEntry, onDeleteEntry, title, subtitle }) => {

  // Build grid: grid[periodNumber][dayOfWeek] = entry
  const grid = {};
  for (let p = 1; p <= 8; p++) { grid[p] = {}; }
  entries.forEach(e => {
    if (!grid[e.period_number]) grid[e.period_number] = {};
    grid[e.period_number][e.day_of_week] = e;
  });

  const days = [1, 2, 3, 4, 5];

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  const SUBJECT_COLORS = [
    { bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.25)', text: '#4f46e5' },
    { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#10b981' },
    { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
    { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)', text: '#ec4899' },
    { bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.25)', text: '#06b6d4' },
    { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)', text: '#8b5cf6' },
    { bg: 'rgba(234, 88, 12, 0.08)', border: 'rgba(234, 88, 12, 0.25)', text: '#ea580c' },
    { bg: 'rgba(20, 184, 166, 0.08)', border: 'rgba(20, 184, 166, 0.25)', text: '#14b8a6' },
    { bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)', text: '#6366f1' },
    { bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.25)', text: '#f43f5e' },
    { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.25)', text: '#a855f7' },
  ];

  // Map subject codes to stable color indices
  const subjectColorMap = {};
  let colorIdx = 0;
  entries.forEach(e => {
    const code = e.subject_offerings?.subjects?.code || '';
    if (code && !(code in subjectColorMap)) {
      subjectColorMap[code] = colorIdx++;
    }
  });

  const getColor = (code) => SUBJECT_COLORS[(subjectColorMap[code] || 0) % SUBJECT_COLORS.length];

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '24px 20px', borderRadius: 'var(--radius-lg)' }}>
      {title && <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>{title}</h3>}
      {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{subtitle}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '750px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', width: '90px' }}>
                Period
              </th>
              {days.map(d => (
                <th key={d} style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                  {DAY_NAMES[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERIODS.map((slot, idx) => {
              // Break row
              if (slot.type === 'break') {
                return (
                  <tr key={`break-${idx}`}>
                    <td colSpan={6} style={{
                      padding: '6px 12px', textAlign: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                      background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
                      fontStyle: 'italic', letterSpacing: '0.04em',
                    }}>
                      ☕ {slot.label} ({slot.time})
                    </td>
                  </tr>
                );
              }

              const period = slot;
              return (
                <tr key={period.number}>
                  <td style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    <div>P{period.number}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatTime(period.start)}
                      <br />
                      {formatTime(period.end)}
                    </div>
                  </td>
                  {days.map(d => {
                    const entry = grid[period.number]?.[d];
                    if (!entry) {
                      return (
                        <td key={d} style={{ padding: '3px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div
                            style={{
                              padding: '14px 6px', borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-surface)', border: '1px dashed var(--border-color)',
                              color: 'var(--text-muted)', fontSize: '0.7rem',
                              cursor: editable ? 'pointer' : 'default',
                              transition: 'all 0.15s',
                              minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onClick={() => editable && onAddEntry && onAddEntry(d, period.number)}
                            onMouseEnter={e => { if (editable) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            onMouseLeave={e => { if (editable) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                          >
                            {editable ? <Plus size={16} style={{ opacity: 0.5 }} /> : '—'}
                          </div>
                        </td>
                      );
                    }

                    const subj = entry.subject_offerings?.subjects;
                    const sec = entry.subject_offerings?.sections;
                    const dept = sec?.departments;
                    const teacherId = entry.subject_offerings?.teacher_portal_id;
                    const code = subj?.code || '—';
                    const color = getColor(code);

                    return (
                      <td key={d} style={{ padding: '3px', verticalAlign: 'top' }}>
                        <div style={{
                          padding: '8px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: color.bg,
                          border: `1px solid ${color.border}`,
                          minHeight: '60px',
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          transition: 'transform 0.15s ease',
                          cursor: editable ? 'pointer' : 'default',
                          position: 'relative',
                        }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          onClick={() => editable && onEditEntry && onEditEntry(entry)}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {subj?.icon || '📚'} {code}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 600, lineHeight: 1.3 }}>
                            {subj?.name || ''}
                          </span>
                          {entry.room && (
                            <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                              📍 {entry.room}
                            </span>
                          )}
                          {viewMode === 'teacher' && sec && (
                            <span style={{ fontSize: '0.64rem', color: color.text, fontWeight: 700, marginTop: '1px' }}>
                              {dept?.department_code || ''} — Sec {sec.section_name}
                            </span>
                          )}
                          {(viewMode === 'hod' || viewMode === 'admin') && teacherId && (
                            <span style={{ fontSize: '0.64rem', color: color.text, fontWeight: 700, marginTop: '1px' }}>
                              👤 {teacherId}
                            </span>
                          )}
                          {editable && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}>
                              <Edit3 size={11} style={{ opacity: 0.4 }} />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimetableGrid;
