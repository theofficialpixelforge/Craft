import React from 'react';
import { Users, LayoutGrid, LayoutList, Columns, MoreHorizontal } from 'lucide-react';

export function SharedView() {
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:'var(--bg-app)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'14px 24px', borderBottom:'1px solid var(--border)', gap:10, flexShrink:0 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:0, flex:1 }}>Shared with Me</h1>
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
          {[<LayoutGrid size={14}/>, <Columns size={14}/>, <LayoutList size={14}/>].map((icon, i) => (
            <button key={i} style={{ padding:'6px 10px', border:'none', cursor:'pointer', background: i===0 ? 'var(--bg-block-hover)' : 'transparent', color: i===0 ? 'var(--text-primary)' : 'var(--text-tertiary)', display:'flex', alignItems:'center' }}>
              {icon}
            </button>
          ))}
        </div>
        <button style={{ padding:'6px 8px', borderRadius:8, border:'none', background:'transparent', color:'var(--text-tertiary)', cursor:'pointer', display:'flex' }}>
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Empty state */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
        <Users size={52} style={{ color:'var(--text-tertiary)', opacity:0.35 }} />
        <p style={{ color:'var(--text-tertiary)', fontSize:14, margin:0 }}>
          Documents that are shared with you will appear here
        </p>
      </div>
    </div>
  );
}
