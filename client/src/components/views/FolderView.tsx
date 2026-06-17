import React from 'react';
import { Plus, Crown, LayoutGrid, LayoutList, Columns, MoreHorizontal } from 'lucide-react';
import type { Document } from '../../types';
import { DocumentCard } from '../home/DocumentCard';

interface Props {
  folder: Document;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
}

export function FolderView({ folder, onSelectDoc, onNewDoc }: Props) {
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:'var(--bg-app)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={onNewDoc} style={{ width:28, height:28, borderRadius:'50%', background:'var(--text-primary)', color:'var(--bg-editor)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <Plus size={16} />
        </button>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:0, flex:1 }}>
          {folder.emoji && <span style={{ marginRight:6 }}>{folder.emoji}</span>}
          {folder.title}
        </h1>

        <button style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer' }}>
          <Crown size={13} style={{ color:'#f59e0b' }} /> Get My Org Plus
        </button>
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
          {[<LayoutGrid size={14}/>, <Columns size={14}/>, <LayoutList size={14}/>].map((icon, i) => (
            <button key={i} style={{ padding:'6px 10px', border:'none', cursor:'pointer', background: i===0 ? 'var(--bg-block-hover)' : 'transparent', color: i===0 ? 'var(--text-primary)' : 'var(--text-tertiary)', display:'flex', alignItems:'center' }}>{icon}</button>
          ))}
        </div>
        <button style={{ padding:'6px 8px', borderRadius:8, border:'none', background:'transparent', color:'var(--text-tertiary)', cursor:'pointer', display:'flex' }}>
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Docs grid */}
      <div style={{ flex:1, overflow:'auto', padding:24 }}>
        {folder.children.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:80, gap:16 }}>
            <p style={{ color:'var(--text-tertiary)', fontSize:14, fontStyle:'italic' }}>This folder is empty</p>
            <button onClick={onNewDoc} style={{ padding:'8px 20px', borderRadius:8, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              Create document
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
            {folder.children.map(doc => (
              <DocumentCard key={doc.id} doc={doc} parentName={folder.title} onClick={() => onSelectDoc(doc.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
