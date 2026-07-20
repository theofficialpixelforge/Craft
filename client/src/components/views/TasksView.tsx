import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Plus, Inbox, SlidersHorizontal, Calendar,
  CalendarDays, ListChecks, X, Trash2,
} from 'lucide-react';

// ── Types & helpers ───────────────────────────────────────────────────────────

type Tab = 'inbox' | 'today' | 'upcoming' | 'all';

interface Task {
  id: string;
  text: string;
  done: boolean;
  due: string;          // "YYYY-MM-DD"
  instructions: string; // may be empty
}

function currentUserKey(): string {
  return useAuthStore.getState().userId || 'shared';
}

function loadTasksFromKey(key: string): Task[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); }
  catch { return []; }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function dueInfo(due: string): { label: string; color: string } {
  const now = todayISO();
  if (due < now)              return { label: `${shortDate(due)} · Overdue`, color: '#ef4444' };
  if (due === now)            return { label: 'Today',    color: '#f59e0b' };
  if (due === tomorrowISO())  return { label: 'Tomorrow', color: '#10b981' };
  return { label: shortDate(due), color: 'var(--text-tertiary)' };
}

// ── AddTaskModal ──────────────────────────────────────────────────────────────

interface ModalProps {
  onAdd: (t: Omit<Task, 'id' | 'done'>) => void;
  onClose: () => void;
}

function AddTaskModal({ onAdd, onClose }: ModalProps) {
  const [text, setText] = useState('');
  const [due, setDue]   = useState(todayISO());
  const [instructions, setInstructions] = useState('');
  const [nameErr, setNameErr] = useState('');

  const submit = () => {
    if (!text.trim()) { setNameErr('Task name is required'); return; }
    onAdd({ text: text.trim(), due, instructions: instructions.trim() });
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--text-secondary)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };

  const fieldInput: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-block-hover)',
    color: 'var(--text-primary)', fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-editor)', borderRadius: 16,
        border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        padding: '28px 28px 24px', width: 500, maxWidth: '94vw',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            New Task
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 6, display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Task name */}
        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>
            Task name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            autoFocus
            value={text}
            onChange={e => { setText(e.target.value); setNameErr(''); }}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
            placeholder="e.g. Review design mockups"
            style={{ ...fieldInput, borderColor: nameErr ? '#ef4444' : 'var(--border)' }}
          />
          {nameErr && (
            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>{nameErr}</p>
          )}
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 18 }}>
          <label style={fieldLabel}>
            Due date <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="date"
            lang="en-ZA"
            value={due}
            onChange={e => setDue(e.target.value)}
            min={todayISO()}
            style={fieldInput}
          />
        </div>

        {/* Instructions */}
        <div style={{ marginBottom: 26 }}>
          <label style={fieldLabel}>
            Instructions{' '}
            <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-tertiary)' }}>
              optional
            </span>
          </label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            placeholder="Add steps, notes, or context for this task…"
            rows={4}
            style={{ ...fieldInput, resize: 'vertical', lineHeight: '1.55' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            style={{
              padding: '8px 22px', borderRadius: 8,
              border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

function TaskCard({ task, onToggle, onDelete }: CardProps) {
  const [hovered, setHovered] = useState(false);
  const due = dueInfo(task.due);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px', borderRadius: 10,
        background: 'var(--bg-sidebar)', border: '1px solid var(--border)',
        transition: 'border-color 0.12s',
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        position: 'relative',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          border: task.done ? 'none' : '2px solid var(--border)',
          background: task.done ? 'var(--accent)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        title={task.done ? 'Mark undone' : 'Mark done'}
      >
        {task.done && (
          <svg width="11" height="9" viewBox="0 0 11 9">
            <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <p style={{
          margin: '0 0 4px', fontSize: 14, fontWeight: 500,
          color: task.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
          textDecoration: task.done ? 'line-through' : 'none',
          lineHeight: '1.4',
        }}>
          {task.text}
        </p>

        {/* Due badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: due.color,
        }}>
          <CalendarDays size={10} />
          {due.label}
        </span>

        {/* Instructions */}
        {task.instructions && (
          <p style={{
            margin: '6px 0 0', fontSize: 13,
            color: 'var(--text-secondary)', lineHeight: '1.5',
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {task.instructions}
          </p>
        )}
      </div>

      {/* Delete */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', display: 'flex', padding: 4, borderRadius: 5,
          }}
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ── TasksView ─────────────────────────────────────────────────────────────────

export function TasksView() {
  const storageKey = `craft_tasks_${currentUserKey()}`;
  const [tab, setTab]     = useState<Tab>('inbox');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromKey(storageKey));
  const [modalOpen, setModalOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks, storageKey]);

  const addTask = (data: Omit<Task, 'id' | 'done'>) => {
    setTasks(t => [...t, { id: crypto.randomUUID(), done: false, ...data }]);
    setModalOpen(false);
  };

  const toggle = (id: string) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const remove = (id: string) =>
    setTasks(t => t.filter(x => x.id !== id));

  const now = todayISO();

  const filtered = ((): Task[] => {
    switch (tab) {
      case 'inbox':    return tasks.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
      case 'today':    return tasks.filter(t => !t.done && t.due === now);
      case 'upcoming': return tasks.filter(t => !t.done && t.due > now).sort((a, b) => a.due.localeCompare(b.due));
      case 'all':      return [...tasks].sort((a, b) => a.due.localeCompare(b.due));
      default:         return tasks;
    }
  })();

  // Badge counts
  const todayCount    = tasks.filter(t => !t.done && t.due === now).length;
  const upcomingCount = tasks.filter(t => !t.done && t.due > now).length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'inbox',    label: 'Inbox',     icon: <Inbox size={13} />,       badge: tasks.filter(t => !t.done).length },
    { key: 'today',    label: 'Today',     icon: <CalendarDays size={13} />, badge: todayCount },
    { key: 'upcoming', label: 'Upcoming',  icon: <Calendar size={13} />,    badge: upcomingCount },
    { key: 'all',      label: 'All Tasks', icon: <ListChecks size={13} /> },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
      background: 'var(--bg-app)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--text-primary)', color: 'var(--bg-editor)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
          }}
          title="Add task"
        >
          <Plus size={16} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
          Tasks
        </h1>
        <button style={{
          background: 'none', border: 'none', color: 'var(--text-tertiary)',
          cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex',
        }}>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '10px 20px 0',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: '8px 8px 0 0',
              background: tab === t.key ? 'var(--bg-editor)' : 'transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, lineHeight: '16px',
                minWidth: 16, padding: '0 4px', borderRadius: 8,
                background: tab === t.key ? 'var(--accent)' : 'var(--bg-block-hover)',
                color: tab === t.key ? '#fff' : 'var(--text-secondary)',
                textAlign: 'center',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 680 }}>
            {filtered.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggle(task.id)}
                onDelete={() => remove(task.id)}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 16, paddingBottom: 80,
          }}>
            <Inbox size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.35 }} />
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: 0 }}>
              {tab === 'today' ? 'Nothing due today' :
               tab === 'upcoming' ? 'No upcoming tasks' :
               'All caught up — no tasks here'}
            </p>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'var(--bg-sidebar)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Add Task
            </button>
          </div>
        )}
      </div>

      {/* Add task modal */}
      {modalOpen && <AddTaskModal onAdd={addTask} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
