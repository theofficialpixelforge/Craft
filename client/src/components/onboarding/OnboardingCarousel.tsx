import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  onDone: () => void;
}

// ── Slide visuals ────────────────────────────────────────────────────────────

function KanbanPreview() {
  const cols = [
    { label: 'To do', color: '#ff6b6b', count: 3, tasks: ['Book the DJ and live band', 'Arrange catering menu tasting', 'Send final guest count to venue'] },
    { label: 'In progress', color: '#f9c74f', count: 3, tasks: ['Design and print custom invitations', 'Coordinate with florist for centerpieces', 'Plan seating chart and table assignments'] },
    { label: 'Done', color: '#43aa8b', count: 6, tasks: ['Secure venue and confirm date', 'Create guest list, send RSVPs', 'Order decorations'] },
  ];
  return (
    <div style={{ background: '#fff', width: '100%', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Planning</div>
      <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
        {cols.map(col => (
          <div key={col.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#666' }}>{col.label}</span>
              <span style={{ fontSize: 9, color: '#999' }}>{col.count}</span>
            </div>
            {col.tasks.map(task => (
              <div key={task} style={{ background: '#f5f5f5', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 9, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 4 }}>{task}</div>
                <div style={{ display: 'inline-block', background: col.color + '22', borderRadius: 3, padding: '1px 5px', fontSize: 8, color: col.color, fontWeight: 600 }}>{col.label}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MermaidPreview() {
  const boxes = [
    { id: 'start', label: 'Start Using My Org', x: 130, y: 20, w: 120, color: '#374151', text: '#e5e7eb' },
    { id: 'doc', label: 'Create First Doc', x: 50, y: 90, w: 100, color: '#374151', text: '#e5e7eb' },
    { id: 'tmpl', label: 'Explore Templates', x: 210, y: 90, w: 110, color: '#374151', text: '#e5e7eb' },
    { id: 'rich', label: 'Rich Formatting Options', x: 110, y: 165, w: 140, color: '#374151', text: '#e5e7eb' },
    { id: 'media', label: 'Media Integration', x: 30, y: 235, w: 110, color: '#374151', text: '#e5e7eb' },
    { id: 'nested', label: 'Nested Pages & Subpages', x: 190, y: 235, w: 140, color: '#374151', text: '#e5e7eb' },
    { id: 'org', label: 'Organize Knowledge', x: 10, y: 305, w: 110, color: '#be185d', text: '#fff' },
    { id: 'think', label: 'Better Thinking', x: 145, y: 305, w: 95, color: '#7c3aed', text: '#fff' },
    { id: 'design', label: 'Beautiful Designs', x: 270, y: 305, w: 105, color: '#65a30d', text: '#fff' },
  ];
  return (
    <div style={{ background: '#1e2235', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg width="400" height="340" viewBox="0 0 400 340" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Connectors */}
        {[
          ['190,36', '100,90'], ['190,36', '265,90'],
          ['100,107', '180,165'], ['265,107', '180,165'],
          ['180,182', '85,235'], ['180,182', '260,235'],
          ['85,252', '65,305'], ['85,252', '192,305'],
          ['260,252', '192,305'], ['260,252', '322,305'],
        ].map((pair, i) => (
          <line key={i} x1={pair[0].split(',')[0]} y1={pair[0].split(',')[1]} x2={pair[1].split(',')[0]} y2={pair[1].split(',')[1]} stroke="#4b5563" strokeWidth="1" markerEnd="url(#arr)" />
        ))}
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#4b5563" />
          </marker>
        </defs>
        {boxes.map(b => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={22} rx={4} fill={b.color} />
            <text x={b.x + b.w / 2} y={b.y + 14} textAnchor="middle" fill={b.text} fontSize="9" fontFamily="system-ui">{b.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PerformancePreview() {
  return (
    <div style={{
      background: 'radial-gradient(ellipse at center, #1a2060 0%, #0d1030 60%, #05080f 100%)',
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid lines */}
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" opacity="0.15">
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="100%" y2={i * 20} stroke="#4466ff" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="100%" stroke="#4466ff" strokeWidth="0.5" />
        ))}
      </svg>
      {/* Craft app icon */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <rect width="120" height="120" rx="26" fill="white" />
          <path d="M60,8 Q28,8 14,28 L14,60 L60,60 Z" fill="#FF3B8F" />
          <path d="M60,8 Q92,8 106,28 L106,60 L60,60 Z" fill="#3B82F6" />
          <path d="M14,60 L14,90 Q28,112 60,112 L60,60 Z" fill="#1e2d5a" />
          <path d="M106,60 L106,90 Q92,112 60,112 L60,60 Z" fill="#131e3f" />
        </svg>
      </div>
    </div>
  );
}

function UpgradePreview() {
  return (
    <div style={{
      background: 'radial-gradient(ellipse at 40% 40%, #ff8c42 0%, #ff4d00 40%, #c0392b 80%, #8B0000 100%)',
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Sparkle dots */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() * 4 + 2,
          height: Math.random() * 4 + 2,
          background: 'rgba(255,200,100,0.6)',
          borderRadius: '50%',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }} />
      ))}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 50,
        padding: '14px 40px',
        fontSize: 32,
        fontWeight: 800,
        color: '#ff4d00',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        letterSpacing: '-0.02em',
        position: 'relative', zIndex: 1,
      }}>
        40% OFF
      </div>
    </div>
  );
}

// ── Slides config ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'kanban',
    visual: <KanbanPreview />,
    bgDark: false,
    title: 'Introducing Kanban',
    desc: 'More structure for your projects, tasks and ideas. Start organizing from scratch or apply to a collection you have.',
    btn: 'Next',
    isUpgrade: false,
  },
  {
    key: 'mermaid',
    visual: <MermaidPreview />,
    bgDark: true,
    title: 'Mermaid Diagrams',
    desc: 'Create diagrams, flowcharts, sequences or timelines in your document. No additional tools needed.',
    btn: 'Next',
    isUpgrade: false,
  },
  {
    key: 'perf',
    visual: <PerformancePreview />,
    bgDark: true,
    title: 'Now Smoother & Faster',
    desc: "We've also made 100+ under-the-hood improvements and bug fixes for a smoother, faster experience.",
    btn: 'Next',
    isUpgrade: false,
  },
  {
    key: 'upgrade',
    visual: <UpgradePreview />,
    bgDark: false,
    title: 'Upgrade now',
    desc: 'Upgrade to My Org Plus or My Org Family with a 40% discount. Available for a limited time, for new subscribers only.',
    btn: 'Use Offer',
    isUpgrade: true,
  },
];

export function OnboardingCarousel({ onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setIdx(i => i + 1);
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        width: 380, borderRadius: 16, overflow: 'hidden',
        background: slide.bgDark ? '#1a1d2e' : '#1e1e1e',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>
        {/* Close button */}
        <button onClick={onDone} style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={14} />
        </button>

        {/* Visual area */}
        <div style={{ height: 240, overflow: 'hidden' }}>
          {slide.visual}
        </div>

        {/* Text area */}
        <div style={{ padding: '24px 28px 28px', background: '#1e2028' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: 10 }}>
            {slide.title}
          </div>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
            {slide.desc}
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 20 : 7, height: 7,
                  borderRadius: 4,
                  background: i === idx ? '#4a9eff' : '#444',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          {/* Primary button */}
          <button onClick={next} style={{
            width: '100%', padding: '13px', borderRadius: 10,
            background: 'linear-gradient(135deg, #4a9eff 0%, #5bb8ff 100%)',
            color: '#fff', fontWeight: 600, fontSize: 15,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(74,158,255,0.3)',
          }}>
            {slide.btn}
          </button>

          {/* Learn more (upgrade slide only) */}
          {slide.isUpgrade && (
            <button onClick={onDone} style={{
              width: '100%', marginTop: 12, background: 'none',
              border: 'none', color: '#e8e8e8', fontWeight: 600,
              fontSize: 14, cursor: 'pointer', padding: 4,
            }}>
              Learn more about pricing plans
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
