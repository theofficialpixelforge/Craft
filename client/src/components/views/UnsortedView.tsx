import React from 'react';
import { Plus, FileText } from 'lucide-react';
import type { Document } from '../../types';
import { DocumentCard } from '../home/DocumentCard';

interface Props {
  docs: Document[];       // root-level docs with no children (unsorted)
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
}

export function UnsortedView({ docs, onSelectDoc, onNewDoc }: Props) {
  // Unsorted = root-level documents that have no parent
  const unsorted = docs.filter(d => !d.parent_id && d.children.length === 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:'var(--bg-app)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={onNewDoc} style={{ width:28, height:28, borderRadius:'50%', background:'var(--text-primary)', color:'var(--bg-editor)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <Plus size={16} />
        </button>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Unsorted</h1>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:24 }}>
        {unsorted.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, paddingBottom:60 }}>
            <p style={{ color:'var(--text-tertiary)', fontSize:14, margin:0, fontStyle:'italic' }}>
              Documents that are not in any folder will appear here
            </p>
            <button
              onClick={onNewDoc}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', borderRadius:8, background:'var(--bg-sidebar)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, fontWeight:500, cursor:'pointer' }}
            >
              <FileText size={14} /> Create document
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
            {unsorted.map(doc => (
              <DocumentCard key={doc.id} doc={doc} parentName="Unsorted" onClick={() => onSelectDoc(doc.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
