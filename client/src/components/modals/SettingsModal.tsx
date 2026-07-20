import React, { useState, useRef } from 'react';
import {
  X, Globe, Hash, Settings, Palette, SlidersHorizontal, User, RefreshCcw,
  GitMerge, Circle, Bell, Info, ChevronRight, ChevronDown, Plus, Camera,
  Pencil, ImageIcon,
} from 'lucide-react';
import { applyTintedSidebar, clearTintedSidebar } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

interface Props {
  onClose: () => void;
  onSignOut: () => void;
  userName?: string;
}

type Page =
  | 'account' | 'subscriptions' | 'integrations' | 'assistant-settings'
  | 'notifications' | 'about'
  | 'appearance' | 'language' | 'advanced'
  | 'published' | 'tags' | 'space-settings';

// ── Shared sub-components ────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: on ? '#2563eb' : 'rgba(255,255,255,0.2)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.18s',
      }} />
    </div>
  );
}

function SettingRow({ label, desc, children, danger }: {
  label: string; desc?: string; children?: React.ReactNode; danger?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '13px 16px',
      background: 'var(--bg-block-hover)', borderRadius: 10, gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: danger ? '#ef4444' : 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

// ── Page content components ──────────────────────────────────────────────────

function AboutPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: 'linear-gradient(135deg, #ff3b8f 0%, #3b82f6 50%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: -1,
          flexShrink: 0,
        }}>MO</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>My Org</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>1.0.0</div>
        </div>
      </div>

      <Section title="Legal">
        {['Terms and Conditions', 'Privacy Policy', 'License and Open Source Notes'].map(label => (
          <button key={label} style={{ background: 'none', border: 'none', padding: '6px 0', textAlign: 'left', color: '#3b82f6', fontSize: 14, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </Section>

      <Section title="Social">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Interested in new and upcoming features? Follow us on X and be the first one to know!
        </p>
        <button style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
          Follow @MyOrgApp on X
        </button>
      </Section>

      <Section title="Send Feedback">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Have an idea, feature request, or found a bug? Let us know, and we'll take a look at it!
        </p>
        <button style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
          Send Feedback
        </button>
      </Section>
    </div>
  );
}

function NotificationsPage() {
  const [s, setS] = useState({
    comments: true, reminders: true, dailyEmail: true, time: '08:00',
  });
  return (
    <div>
      <Section title="Comments &amp; Mentions">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Get notified when you receive new comments and mentions.
        </p>
        <SettingRow label="Email Notifications">
          <Toggle on={s.comments} onChange={v => setS(p => ({ ...p, comments: v }))} />
        </SettingRow>
      </Section>

      <Section title="Reminders">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          My Org will send you notifications when a reminder is due.
        </p>
        <SettingRow label="Email Notifications">
          <Toggle on={s.reminders} onChange={v => setS(p => ({ ...p, reminders: v }))} />
        </SettingRow>
      </Section>

      <Section title="Daily Email">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Receive a summary with all tasks and reminders scheduled for the day.
        </p>
        <SettingRow label="Email Notifications">
          <Toggle on={s.dailyEmail} onChange={v => setS(p => ({ ...p, dailyEmail: v }))} />
        </SettingRow>
        <SettingRow label="Time">
          <input
            type="time" value={s.time}
            onChange={e => setS(p => ({ ...p, time: e.target.value }))}
            style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </SettingRow>
      </Section>

      <Section title="Spaces">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          You can override these settings for individual spaces.
        </p>
        <SettingRow label="My Space">
          <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
        </SettingRow>
      </Section>
    </div>
  );
}

function AssistantSettingsPage() {
  const [mySpace, setMySpace] = useState(true);
  return (
    <div>
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-block-hover)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-editor)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Circle size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>Upgrade for more AI usage</span>
        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
      </div>

      <Section title="Saved Prompts">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Save up to 20 prompts with up to 1000 characters each.
        </p>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-block-hover)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#3b82f6', fontSize: 14 }}>
          <Plus size={14} /> Add Prompt
        </button>
      </Section>

      <Section title="Space">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          You can disable the assistant for individual Spaces. This does not affect other members' settings.
        </p>
        <SettingRow label="My Space">
          <Toggle on={mySpace} onChange={setMySpace} />
        </SettingRow>
      </Section>
    </div>
  );
}

function IntegrationsPage() {
  const services = [
    { name: 'Figma', color: '#f24e1e', letter: 'F', action: 'Connect' },
    { name: 'Github', color: '#333', letter: 'G', action: 'Connect' },
    { name: 'Jira', color: '#0052cc', letter: 'J', action: 'Connect' },
    { name: 'Linear', color: '#5e6ad2', letter: 'L', action: 'Connect' },
    { name: 'Email to My Org', color: '#3b82f6', letter: 'E', action: 'Configure' },
    { name: 'Readwise', color: '#e5a00d', letter: 'R', action: 'Configure' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 20 }}>
        {services.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {s.letter}
            </div>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{s.name}</span>
            <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer' }}>{s.action}</button>
          </div>
        ))}
      </div>
      <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer' }}>
        Learn more about integrations
      </button>
    </div>
  );
}

function SubscriptionsPage() {
  const used = 524; const total = 1500;
  const pct = (used / total) * 100;
  return (
    <div>
      <div style={{ padding: 18, background: 'var(--bg-block-hover)', borderRadius: 12, marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>My Org · Starter</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>You are using the free version of My Org.</div>
        <div style={{ padding: '12px 14px', background: 'var(--bg-editor)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
          You have used <strong style={{ color: 'var(--text-primary)' }}>{used}</strong> out of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> blocks available on this plan.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#60a5fa', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Upgrade</button>
          <button style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>Settings</button>
        </div>
      </div>

      <Section title="Troubleshooting">
        {[
          { label: 'Subscription Troubleshooting', desc: 'If you are experiencing subscription issues, please read our troubleshooting guide.' },
          { label: 'Report Subscription Issue', desc: 'Report Subscription Issue' },
          { label: 'License Key', desc: 'If you have received a license key, use it here to activate your subscription.' },
        ].map(item => (
          <SettingRow key={item.label} label={item.label} desc={item.desc} />
        ))}
      </Section>
    </div>
  );
}

function AccountPage({ onSignOut, userName }: { onSignOut: () => void; userName?: string }) {
  const { userName: storeUserName, session } = useAuthStore();
  const name = storeUserName || userName || 'User';
  const email = session?.user.email || '';

  return (
    <div>
      <div style={{ padding: 20, background: 'var(--bg-block-hover)', borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a07a,#d4b896)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff' }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              <Camera size={12} style={{ color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Name</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Your name is visible on documents you share with others.</div>
              </div>
              <Pencil size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{email}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Your email address used for this account.</div>
          </div>
          <Pencil size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
        </div>
      </div>

      <button
        onClick={onSignOut}
        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer', padding: '4px 0', marginBottom: 24 }}
      >
        Sign Out
      </button>

      <Section title="Danger Zone">
        <SettingRow label="Delete Account" desc="Deleting your account will permanently delete all your documents. This action cannot be undone." danger />
      </Section>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  if (max === min) return [0, 0, Math.round(l*100)];
  const d = max - min;
  const s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  let h = 0;
  if (max === r) h = (g-b)/d + (g < b ? 6 : 0);
  else if (max === g) h = (b-r)/d + 2;
  else h = (r-g)/d + 4;
  return [Math.round(h*60), Math.round(s*100), Math.round(l*100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1-l);
  const f = (n: number) => {
    const k = (n + h/30) % 12;
    const c = l - a * Math.max(Math.min(k-3, 9-k, 1), -1);
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2,'0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

async function extractPalette(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 80;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const freq: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] < 128) continue;
          const r = Math.round(data[i] / 28) * 28;
          const g = Math.round(data[i+1] / 28) * 28;
          const b = Math.round(data[i+2] / 28) * 28;
          if (r > 215 && g > 215 && b > 215) continue; // near-white
          if (r < 35 && g < 35 && b < 35) continue;    // near-black
          if (Math.max(r,g,b) - Math.min(r,g,b) < 25) continue; // too gray
          freq[`${r},${g},${b}`] = (freq[`${r},${g},${b}`] || 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
        const palette: string[] = [];
        for (const [key] of sorted) {
          const [r,g,b] = key.split(',').map(Number);
          const hex = '#' + [r,g,b].map(v => Math.min(255,v).toString(16).padStart(2,'0')).join('');
          const tooClose = palette.some(p => {
            const [pr,pg,pb] = hexToRgb(p);
            return Math.abs(r-pr)+Math.abs(g-pg)+Math.abs(b-pb) < 90;
          });
          if (!tooClose) palette.push(hex);
          if (palette.length >= 5) break;
        }
        resolve(palette.length > 0 ? palette : ['#2563eb']);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateThemeFromPalette(colors: string[], doShuffle: boolean): { vars: Record<string, string>; isDark: boolean } {
  if (!colors.length) return { vars: {}, isDark: false };
  const analyzed = colors.map(hex => {
    const [r,g,b] = hexToRgb(hex);
    const [h,s,l] = rgbToHsl(r,g,b);
    return { hex, h, s, l, vibrancy: s * (1 - Math.abs(l-50)/50) };
  });
  // Most vibrant color → accent
  const accentC = [...analyzed].sort((a,b) => b.vibrancy - a.vibrancy)[0];
  // Remaining colors → backgrounds
  let bgC = analyzed.filter(c => c !== accentC);
  if (!bgC.length) bgC = [accentC];
  if (doShuffle) bgC = shuffleArr(bgC);
  // Ensure we always have 4 slots
  while (bgC.length < 4) bgC = [...bgC, ...bgC];
  const [b0, b1, b2, b3] = bgC;
  const avgL = analyzed.reduce((s,c) => s+c.l, 0) / analyzed.length;
  const isDark = avgL < 40;
  const vars: Record<string, string> = { '--accent': accentC.hex };
  if (isDark) {
    vars['--bg-app']         = hslToHex(b0.h, Math.min(b0.s*0.4, 18), 11);
    vars['--bg-editor']      = hslToHex(b1.h, Math.min(b1.s*0.4, 18), 16);
    vars['--bg-sidebar']     = hslToHex(b2.h, Math.min(b2.s*0.45, 22), 14);
    vars['--bg-block-hover'] = hslToHex(b3.h, Math.min(b3.s*0.45, 24), 21);
    vars['--border']         = hslToHex(b0.h, Math.min(b0.s*0.3, 14), 28);
    vars['--text-primary']   = '#EBEBEB';
    vars['--text-secondary'] = '#888888';
    vars['--text-tertiary']  = '#555555';
  } else {
    vars['--bg-editor']      = hslToHex(b0.h, Math.min(b0.s*0.12, 7),  98);
    vars['--bg-app']         = hslToHex(b1.h, Math.min(b1.s*0.22, 14), 94);
    vars['--bg-sidebar']     = hslToHex(b2.h, Math.min(b2.s*0.32, 22), 90);
    vars['--bg-block-hover'] = hslToHex(b3.h, Math.min(b3.s*0.38, 28), 86);
    vars['--border']         = hslToHex(b0.h, Math.min(b0.s*0.18, 12), 82);
    vars['--text-primary']   = '#1A1A1A';
    vars['--text-secondary'] = '#7A7A7A';
    vars['--text-tertiary']  = '#ABABAB';
  }
  return { vars, isDark };
}

function applyThemeVarsAndStore(vars: Record<string, string>, isDark: boolean) {
  Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('craft_image_theme', JSON.stringify({ vars, isDark }));
  localStorage.setItem('craft_sidebar_tinted', 'false');
}

const IMAGE_THEME_VARS = ['--bg-app','--bg-editor','--bg-sidebar','--bg-block-hover','--border','--text-primary','--text-secondary','--text-tertiary','--accent'];

function clearImageTheme() {
  IMAGE_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v));
  localStorage.removeItem('craft_image_theme');
  const s = localStorage.getItem('theme') || 'system';
  const pd = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', s === 'dark' || (s === 'system' && pd));
  const a = localStorage.getItem('craft_accent');
  if (a) document.documentElement.style.setProperty('--accent', a);
  if (localStorage.getItem('craft_sidebar_tinted') === 'true' && a) applyTintedSidebar(a);
}

const COLOR_GRID = [
  // Blues
  '#2563eb', '#1d4ed8', '#0ea5e9', '#0891b2',
  // Purples / Pinks
  '#7c3aed', '#9333ea', '#ec4899', '#db2777',
  // Reds / Oranges
  '#ef4444', '#dc2626', '#f97316', '#ea580c',
  // Greens / Teal
  '#16a34a', '#15803d', '#10b981', '#06b6d4',
  // Yellows / Amber
  '#eab308', '#d97706', '#f59e0b', '#fbbf24',
  // Neutrals
  '#64748b', '#475569', '#374151', '#111827',
];

function AppearancePage() {
  const themes = [
    { id: 'system', label: 'System' },
    { id: 'light',  label: 'Light'  },
    { id: 'dark',   label: 'Dark'   },
  ];

  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'system'
  );
  const [accent, setAccent] = useState(() =>
    localStorage.getItem('craft_accent') || '#2563eb'
  );
  const [sidebarTinted, setSidebarTinted] = useState(() =>
    localStorage.getItem('craft_sidebar_tinted') === 'true'
  );
  const [imageThemeActive, setImageThemeActive] = useState(() => !!localStorage.getItem('craft_image_theme'));
  const [paletteColors, setPaletteColors] = useState<string[]>([]);
  const [imgPreview, setImgPreview] = useState('');
  const [extracting, setExtracting] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const applyAccent = (color: string) => {
    setAccent(color);
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('craft_accent', color);
    if (sidebarTinted) applyTintedSidebar(color);
  };

  const toggleSidebarTint = (on: boolean) => {
    setSidebarTinted(on);
    localStorage.setItem('craft_sidebar_tinted', String(on));
    if (on) applyTintedSidebar(accent);
    else clearTintedSidebar();
  };

  const applyThemeMode = (t: string) => {
    if (imageThemeActive) { clearImageTheme(); setImageThemeActive(false); }
    setTheme(t);
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    if (isDark) clearTintedSidebar();
    else if (sidebarTinted) applyTintedSidebar(accent);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setExtracting(true);
    const colors = await extractPalette(file);
    setPaletteColors(colors);
    setExtracting(false);
    setImageThemeActive(false);
  };

  const handleApplyImageTheme = () => {
    const { vars, isDark } = generateThemeFromPalette(paletteColors, false);
    applyThemeVarsAndStore(vars, isDark);
    setImageThemeActive(true);
    setSidebarTinted(false);
    if (vars['--accent']) setAccent(vars['--accent']);
  };

  const handleShuffleImageTheme = () => {
    const { vars, isDark } = generateThemeFromPalette(paletteColors, true);
    applyThemeVarsAndStore(vars, isDark);
    setImageThemeActive(true);
    setSidebarTinted(false);
    if (vars['--accent']) setAccent(vars['--accent']);
  };

  const handleClearImageTheme = () => {
    clearImageTheme();
    setImageThemeActive(false);
    setAccent(localStorage.getItem('craft_accent') || '#2563eb');
    setSidebarTinted(localStorage.getItem('craft_sidebar_tinted') === 'true');
  };

  const isCustom = !COLOR_GRID.includes(accent);

  return (
    <div>
      {/* Theme picker */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => applyThemeMode(t.id)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{
              height: 100, borderRadius: 10, overflow: 'hidden', marginBottom: 8,
              border: theme === t.id ? `2px solid ${accent}` : '2px solid transparent',
              background: t.id === 'dark' ? '#1a1a1a' : t.id === 'light' ? '#f5f5f5' : 'linear-gradient(135deg,#e8d5f5,#f5e8d5)',
              transition: 'border-color 0.15s',
            }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 32, background: t.id === 'dark' ? '#333' : '#fff', borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: theme === t.id ? accent : 'var(--text-secondary)', transition: 'color 0.15s' }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Accent color */}
      <Section title="Accent Colour">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Choose a preset or pick any custom colour.
        </p>

        {/* Grid of presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, marginBottom: 16 }}>
          {COLOR_GRID.map(c => (
            <button
              key={c}
              onClick={() => applyAccent(c)}
              title={c}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 8,
                background: c, border: 'none', cursor: 'pointer',
                outline: accent === c ? `3px solid ${c}` : '3px solid transparent',
                outlineOffset: 2,
                transition: 'outline 0.15s, transform 0.1s',
                transform: accent === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Custom colour row */}
        <div
          onClick={() => customInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 10,
            background: 'var(--bg-block-hover)', border: `1px solid ${isCustom ? accent : 'var(--border)'}`,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: isCustom ? accent : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
            border: '1px solid rgba(255,255,255,0.15)',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Custom Colour</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {isCustom ? accent.toUpperCase() : 'Click to pick any colour'}
            </div>
          </div>
          <input
            ref={customInputRef}
            type="color"
            value={isCustom ? accent : '#2563eb'}
            onChange={e => applyAccent(e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>▶</div>
        </div>
      </Section>

      {/* Sidebar Style */}
      <Section title="Sidebar Style">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          {imageThemeActive
            ? 'Image theme is active — clear it below to use sidebar style.'
            : 'In light mode, tint the sidebar and background with your accent colour.'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {([{ on: false, label: 'Neutral' }, { on: true, label: 'Accent Tinted' }] as const).map(opt => (
            <button
              key={String(opt.on)}
              onClick={() => toggleSidebarTint(opt.on)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: sidebarTinted === opt.on ? accent : 'var(--bg-block-hover)',
                color: sidebarTinted === opt.on ? '#fff' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {sidebarTinted && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {[0.07, 0.12, 0.22, 0.4].map((pct, i) => (
              <div key={i} style={{
                flex: 1, height: 20, borderRadius: 4,
                background: `color-mix(in srgb, ${accent} ${Math.round(pct*100)}%, white)`,
                opacity: 0.9,
              }} />
            ))}
          </div>
        )}
      </Section>

      {/* Image Palette */}
      <Section title="Extract Palette from Image">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Upload a photo and we'll pull its colours to theme the app.
        </p>

        <div
          onClick={() => imgInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--bg-block-hover)', border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {imgPreview ? (
            <img src={imgPreview} alt="" style={{ width: 44, height: 44, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 7, background: 'var(--bg-editor)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={18} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {imgPreview ? 'Change Image' : 'Upload Image'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>JPG, PNG, or WEBP</div>
          </div>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>▶</div>
        </div>

        {extracting && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Extracting colours…
          </div>
        )}

        {paletteColors.length > 0 && !extracting && (
          <div style={{ marginTop: 12 }}>
            {/* Colour swatches — full palette preview */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 36, marginBottom: 10 }}>
              {paletteColors.map(c => (
                <div key={c} style={{ flex: 1, background: c }} />
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleApplyImageTheme}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: imageThemeActive ? 'var(--accent)' : '#3b82f6',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {imageThemeActive ? '✓ Theme Applied' : 'Apply Theme'}
              </button>
              <button
                onClick={handleShuffleImageTheme}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ⟳ Shuffle
              </button>
            </div>
            {imageThemeActive && (
              <button
                onClick={handleClearImageTheme}
                style={{
                  marginTop: 8, width: '100%', background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer',
                  textAlign: 'center' as const, textDecoration: 'underline',
                }}
              >
                Clear image theme
              </button>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function LanguagePage() {
  const langs = ['English', 'Deutsch', 'Español', 'Français', 'Italiano', 'Polski', 'Português (Brasil)', '日本語', '한국어'];
  const [lang, setLang] = useState('English');
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-block-hover)', borderRadius: 10, cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>Language</span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginRight: 8 }}>{lang}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: 300, overflowY: 'auto', marginTop: 4 }}>
            {langs.map(l => (
              <button key={l} onClick={() => { setLang(l); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {l}
                {l === lang && <span style={{ color: '#3b82f6', fontSize: 16 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsDropdown({ id, value, options, onChange, openId, setOpenId }: {
  id: string; value: string; options: string[];
  onChange: (v: string) => void;
  openId: string | null; setOpenId: (v: string | null) => void;
}) {
  const open = openId === id;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpenId(open ? null : id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
        {value} <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden', minWidth: 140, marginTop: 4 }}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpenId(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {o}
              {o === value && <span style={{ color: '#3b82f6' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdvancedPage() {
  const [s, setS] = useState({ dailyNotes: true, dateBadges: true, offlineMode: true, completedTask: 'Strikethrough', linkPref: 'Always ask' });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div>
      <Section>
        <SettingRow label="My Org Document Link Open Preference" desc="Customize if My Org links should open in My Org for Web or our desktop app.">
          <SettingsDropdown id="link" value={s.linkPref} options={['Open in App', 'Open in Browser', 'Always ask']} onChange={v => setS(p => ({ ...p, linkPref: v }))} openId={openDropdown} setOpenId={setOpenDropdown} />
        </SettingRow>
      </Section>

      <Section title="Appearance">
        <SettingRow label="Show Daily Notes" desc="Show Daily Notes by default on Home.">
          <Toggle on={s.dailyNotes} onChange={v => setS(p => ({ ...p, dailyNotes: v }))} />
        </SettingRow>
        <SettingRow label="Date Badges" desc="Displaying the daily note link with a date badge is a great way to highlight it.">
          <Toggle on={s.dateBadges} onChange={v => setS(p => ({ ...p, dateBadges: v }))} />
        </SettingRow>
        <SettingRow label="Completed Tasks" desc="Customize how completed tasks appear across the App">
          <SettingsDropdown id="task" value={s.completedTask} options={['Strikethrough', 'Faded', 'None']} onChange={v => setS(p => ({ ...p, completedTask: v }))} openId={openDropdown} setOpenId={setOpenDropdown} />
        </SettingRow>
        <SettingRow label="Offline Mode" desc="View and edit documents while offline">
          <Toggle on={s.offlineMode} onChange={v => setS(p => ({ ...p, offlineMode: v }))} />
        </SettingRow>
      </Section>

      <SettingRow label="Reset Document Cache">
        <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'none', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Reset</button>
      </SettingRow>
    </div>
  );
}

function PublishedPage() {
  return (
    <div>
      <div style={{ padding: '12px 14px', background: '#1e3a5f', borderRadius: 10, color: '#93c5fd', fontSize: 13, marginBottom: 24 }}>
        These settings apply to all published content in your personal Spaces.
      </div>
      <Section>
        {[
          { label: 'Your myorg.app Link', desc: 'Use your custom link when publishing My Org documents.', value: 'Not set' },
          { label: 'Setup Custom Domain', desc: 'Use your own domain when publishing My Org documents.', value: 'Not set' },
        ].map(item => (
          <div key={item.label} style={{ padding: '13px 16px', background: 'var(--bg-block-hover)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.desc}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{item.value}</div>
            </div>
            <Pencil size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
          </div>
        ))}
        <SettingRow label="Show Logo in Header" desc="Show your logo in the header of all published documents.">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
      </Section>
    </div>
  );
}

function TagsPage() {
  const [useTags, setUseTags] = useState(true);
  const [hexColors, setHexColors] = useState(true);
  const [numbers, setNumbers] = useState(true);
  return (
    <div>
      <Section>
        <SettingRow label="Use Tags">
          <Toggle on={useTags} onChange={setUseTags} />
        </SettingRow>
      </Section>
      <Section title="Ignore List">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Anything here stays out of your tag list, even with a hashtag.
        </p>
        <SettingRow label="Hex Color Value" desc="Color Value in hex format like #ff0000 or #ccc">
          <Toggle on={hexColors} onChange={setHexColors} />
        </SettingRow>
        <SettingRow label="Numbers" desc="Tags containing only numbers, like #1">
          <Toggle on={numbers} onChange={setNumbers} />
        </SettingRow>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-block-hover)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#3b82f6', fontSize: 14 }}>
          <Plus size={14} /> Add Custom Rule
        </button>
      </Section>
      <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer' }}>Learn more about tags</button>
    </div>
  );
}

function SpaceSettingsPage({ userName }: { userName?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, background: 'linear-gradient(135deg,#ff3b8f,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900, color: '#fff' }}>
            {userName ? userName.charAt(0).toUpperCase() : 'M'}
          </div>
          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <Camera size={14} style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>
      </div>
      <Section>
        <div style={{ padding: '13px 16px', background: 'var(--bg-block-hover)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Space Name</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>My Space</div>
          </div>
          <Pencil size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
        </div>
      </Section>
    </div>
  );
}

// ── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 7, width: '100%',
        background: active ? 'var(--bg-block-hover)' : hov ? 'rgba(255,255,255,0.04)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 13, fontWeight: active ? 600 : 400,
      }}
    >
      <span style={{ display: 'flex', opacity: 0.8 }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<Page, string> = {
  account: 'My Account', subscriptions: 'My Subscriptions', integrations: 'Integrations',
  'assistant-settings': 'Assistant', notifications: 'Notifications', about: 'About',
  appearance: 'Appearance', language: 'Language', advanced: 'Advanced',
  published: 'Published Content', tags: 'Tags', 'space-settings': 'Space Settings',
};

export function SettingsModal({ onClose, onSignOut, userName }: Props) {
  const [page, setPage] = useState<Page>('account');

  const { userName: storeUserName, session } = useAuthStore();
  const name = storeUserName || userName || 'User';
  const email = session?.user.email || '';

  function renderPage() {
    switch (page) {
      case 'about':             return <AboutPage />;
      case 'notifications':     return <NotificationsPage />;
      case 'assistant-settings':return <AssistantSettingsPage />;
      case 'integrations':      return <IntegrationsPage />;
      case 'subscriptions':     return <SubscriptionsPage />;
      case 'account':           return <AccountPage onSignOut={onSignOut} userName={userName} />;
      case 'appearance':        return <AppearancePage />;
      case 'language':          return <LanguagePage />;
      case 'advanced':          return <AdvancedPage />;
      case 'published':         return <PublishedPage />;
      case 'tags':              return <TagsPage />;
      case 'space-settings':    return <SpaceSettingsPage userName={userName} />;
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', width: '88vw', maxWidth: 980,
          height: '86vh', maxHeight: 720,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          background: 'var(--bg-app)',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
        }}
      >
        {/* ── Left nav ─────────────────────────────────────────────── */}
        <div style={{ width: 260, flexShrink: 0, background: 'var(--bg-sidebar)', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '16px 12px 8px' }}>

            {/* Space header */}
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', width: '100%', marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#ff3b8f,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>My Space</span>
              <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }} />
            </button>

            {/* CRAFT PLUS promo card */}
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,#bfdbfe,#e0f2fe,#ede9fe)', minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#111', letterSpacing: '-0.5px' }}>CRAFT</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#111', borderRadius: 5, padding: '2px 6px' }}>PLUS</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#334', lineHeight: 1.4 }}>
                  One full-featured account. Get unlimited content and storage for all your ideas.
                </p>
              </div>
            </div>

            {/* Space Settings */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', padding: '4px 10px 6px' }}>Space Settings</div>
            <NavItem icon={<Globe size={14}/>} label="Published Content" active={page==='published'} onClick={() => setPage('published')} />
            <NavItem icon={<Hash size={14}/>} label="Tags" active={page==='tags'} onClick={() => setPage('tags')} />
            <NavItem icon={<Settings size={14}/>} label="Space Settings" active={page==='space-settings'} onClick={() => setPage('space-settings')} />

            <div style={{ margin: '10px 0 4px', borderTop: '1px solid var(--border)' }} />

            {/* General Settings */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', padding: '4px 10px 6px' }}>General Settings</div>
            <NavItem icon={<Palette size={14}/>} label="Appearance" active={page==='appearance'} onClick={() => setPage('appearance')} />
            <NavItem icon={<Globe size={14}/>} label="Language" active={page==='language'} onClick={() => setPage('language')} />
            <NavItem icon={<SlidersHorizontal size={14}/>} label="Advanced" active={page==='advanced'} onClick={() => setPage('advanced')} />

            <div style={{ margin: '10px 0 4px', borderTop: '1px solid var(--border)' }} />

            {/* User section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a07a,#d4b896)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{email}</div>
              </div>
            </div>

            <NavItem icon={<User size={14}/>} label="Account Settings" active={page==='account'} onClick={() => setPage('account')} />
            <NavItem icon={<RefreshCcw size={14}/>} label="My Subscriptions" active={page==='subscriptions'} onClick={() => setPage('subscriptions')} />
            <NavItem icon={<GitMerge size={14}/>} label="Integrations" active={page==='integrations'} onClick={() => setPage('integrations')} />
            <NavItem icon={<Circle size={14}/>} label="Assistant" active={page==='assistant-settings'} onClick={() => setPage('assistant-settings')} />
            <NavItem icon={<Bell size={14}/>} label="Notifications" active={page==='notifications'} onClick={() => setPage('notifications')} />

            <div style={{ margin: '6px 0' }} />
            <NavItem icon={<Info size={14}/>} label="About" active={page==='about'} onClick={() => setPage('about')} />
          </div>
        </div>

        {/* ── Right content ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
              {PAGE_TITLES[page]}
            </span>
            <button onClick={onClose} style={{ background: 'var(--bg-block-hover)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
}
