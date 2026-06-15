import React, { useEffect, useState } from 'react';
import {
  LayoutGrid, CheckSquare, Calendar, ClipboardList, Users, Star, Folder,
  Search, Bell, HelpCircle, ChevronDown, PanelLeft, Monitor, Share2,
  Plus, ChevronRight, MoreHorizontal, Trash2, PenSquare, FolderOpen,
  Settings, User, Activity, FileText,
} from 'lucide-react';
import { DocumentEditor } from '../editor/DocumentEditor';
import { HomeView } from '../home/HomeView';
import { TasksView } from '../views/TasksView';
import { CalendarView } from '../views/CalendarView';
import { ImagineView } from '../views/ImagineView';
import { EmployeeLeaveView } from '../views/EmployeeLeaveView';
import { DailyUpdatesView } from '../views/DailyUpdatesView';
import { MonthlyReportsView } from '../views/MonthlyReportsView';
import { SharedView } from '../views/SharedView';
import { UnsortedView } from '../views/UnsortedView';
import { FolderView } from '../views/FolderView';
import { AssistantPanel } from '../views/AssistantPanel';
import { OnboardingCarousel } from '../onboarding/OnboardingCarousel';
import { SearchModal } from '../search/SearchModal';
import { EmojiPickerModal } from '../modals/EmojiPickerModal';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PromoPopup } from '../ui/PromoPopup';
import { SettingsModal } from '../modals/SettingsModal';
import type { Document } from '../../types';

const ONBOARDING_KEY = 'craft_onboarding_done';

type NavView = 'all-docs' | 'unsorted' | 'tasks' | 'calendar' | 'imagine' | 'updates' | 'reports' | 'shared' | { type: 'folder'; id: string };

type Role = 'manager' | 'intern';
interface Props { userName?: string; role?: Role; employeeId?: string; onSignOut?: () => void; }

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display:'flex', alignItems:'center', gap:9, padding:'6px 10px', borderRadius:7, width:'100%',
      background: active || hov ? 'var(--bg-block-hover)' : 'transparent',
      border:'none', cursor:'pointer', textAlign:'left',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontSize:13, fontWeight: active ? 600 : 400, transition:'background 0.1s',
    }}>
      <span style={{ opacity:0.8, display:'flex' }}>{icon}</span>
      {label}
    </button>
  );
}

function SidebarDocItem({ doc, depth, activeId, nav, onSelect, onDelete, onNewChild, onFolderClick }: {
  doc: Document; depth: number; activeId: string | null; nav: NavView;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onFolderClick: (id: string) => void;
}) {
  const { expandedIds, toggleExpanded } = useDocumentStore();
  const [hov, setHov] = useState(false);
  const [menu, setMenu] = useState(false);
  const isExpanded = expandedIds.has(doc.id);
  const hasChildren = doc.children.length > 0;
  const isActive = activeId === doc.id;
  const isFolderActive = typeof nav === 'object' && nav.type === 'folder' && nav.id === doc.id;

  const handleClick = () => {
    if (hasChildren) { onFolderClick(doc.id); toggleExpanded(doc.id); }
    else onSelect(doc.id);
  };

  return (
    <div>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setMenu(false); }}
        style={{ display:'flex', alignItems:'center', gap:4, padding:`4px 8px 4px ${8 + depth * 14}px`, borderRadius:6, cursor:'pointer', background: isActive || isFolderActive ? 'var(--bg-block-hover)' : hov ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
        <button onClick={e => { e.stopPropagation(); if (hasChildren) toggleExpanded(doc.id); }}
          style={{ width:14, height:14, background:'none', border:'none', color:'var(--text-tertiary)', cursor: hasChildren ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 }}>
          {hasChildren ? <ChevronRight size={11} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }} /> : null}
        </button>
        <span style={{ fontSize:14, lineHeight:1, flexShrink:0 }}>
          {doc.emoji || (hasChildren ? (isExpanded ? <FolderOpen size={13}/> : <Folder size={13}/>) : <span style={{ color:'var(--text-tertiary)', display:'flex' }}><PenSquare size={12}/></span>)}
        </span>
        <span onClick={handleClick} style={{ flex:1, fontSize:12, color: isActive || isFolderActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {doc.title || 'Untitled'}
        </span>
        {hov && (
          <div style={{ display:'flex', gap:1, flexShrink:0 }}>
            <button onClick={e => { e.stopPropagation(); onNewChild(doc.id); }} style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:'1px 2px', borderRadius:3, display:'flex' }}><Plus size={11}/></button>
            <div style={{ position:'relative' }}>
              <button onClick={e => { e.stopPropagation(); setMenu(v => !v); }} style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:'1px 2px', borderRadius:3, display:'flex' }}><MoreHorizontal size={11}/></button>
              {menu && (
                <div style={{ position:'absolute', right:0, top:'100%', zIndex:100, background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:8, padding:4, minWidth:140, boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
                  <button onClick={e => { e.stopPropagation(); onDelete(doc.id); setMenu(false); }}
                    style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'6px 10px', background:'none', border:'none', color:'#ef4444', fontSize:12, cursor:'pointer', borderRadius:5 }}>
                    <Trash2 size={12}/> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isExpanded && hasChildren && doc.children.map(child => (
        <SidebarDocItem key={child.id} doc={child} depth={depth+1} activeId={activeId} nav={nav} onSelect={onSelect} onDelete={onDelete} onNewChild={onNewChild} onFolderClick={onFolderClick} />
      ))}
    </div>
  );
}

export function AppLayout({ userName, role = 'manager', employeeId, onSignOut }: Props) {
  const isIntern = role === 'intern';
  const { tree, favorites, activeDocumentId, setActiveDocument, fetchTree, createDocument, deleteDocument } = useDocumentStore();
  const { emojiPickerOpen, searchModalOpen, openSearchModal } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem(ONBOARDING_KEY));
  const [nav, setNav] = useState<NavView>('all-docs');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = navigator.platform.toLowerCase().includes('mac') ? e.metaKey : e.ctrlKey;
      if (ctrl && e.key === 'k') { e.preventDefault(); openSearchModal(); }
      if (ctrl && e.key === 'n') { e.preventDefault(); handleNewDoc(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNewDoc = async (parentId?: string) => {
    const doc = await createDocument(parentId ?? null);
    await fetchTree();
    setActiveDocument(doc.id);
    setNav('all-docs');
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocument(id);
    setNav('all-docs');
  };

  const handleFolderClick = (id: string) => {
    setActiveDocument(null);
    setNav({ type: 'folder', id });
  };

  const handleDoneOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  const setNavAndClearDoc = (v: NavView) => {
    setNav(v);
    setActiveDocument(null);
  };

  // Find active folder for folder view
  const findDoc = (docs: Document[], id: string): Document | null => {
    for (const d of docs) {
      if (d.id === id) return d;
      const found = findDoc(d.children, id);
      if (found) return found;
    }
    return null;
  };

  const folders = tree.filter(d => d.children.length > 0);
  const unsortedDocs = tree.filter(d => d.children.length === 0);

  // Top bar label for folder/search context
  const topBarContext = activeDocumentId
    ? null
    : typeof nav === 'object' && nav.type === 'folder'
      ? findDoc(tree, nav.id)
      : null;

  // Assistant context label
  const assistantCtx = typeof nav === 'object' ? findDoc(tree, nav.id)?.title ?? 'All Docs' : nav === 'all-docs' ? 'All Docs' : 'Craft';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg-app)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 16px', height:44, flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-sidebar)' }}>
        <button onClick={() => setSidebarOpen(v => !v)} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', display:'flex', padding:4, borderRadius:5 }}>
          <PanelLeft size={17}/>
        </button>
        <button style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', display:'flex', padding:4 }}>
          <ChevronDown size={14}/>
        </button>

        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <button onClick={openSearchModal} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:8, width:'100%', maxWidth:440, background:'var(--bg-block-hover)', border:'1px solid var(--border)', color:'var(--text-tertiary)', fontSize:13, cursor:'pointer' }}>
            {topBarContext ? (
              <><Folder size={13}/><span style={{ color:'var(--text-secondary)' }}>{topBarContext.title}</span></>
            ) : (
              <><Search size={13}/><span>Open</span><span style={{ marginLeft:'auto', fontSize:11 }}>⌘K</span></>
            )}
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', display:'flex', padding:6, borderRadius:6 }} title="Notifications"><Bell size={16}/></button>
          <button style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', display:'flex', padding:6, borderRadius:6 }} title="Help"><HelpCircle size={16}/></button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', background:'var(--bg-sidebar)', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 8px 0' }}>

              {/* My Space */}
              <div style={{ position:'relative', marginBottom:4 }}>
                <button
                  onClick={() => setSpaceMenuOpen(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:7, width:'100%', background:'transparent', border:'none', cursor:'pointer', color:'var(--text-primary)', fontSize:13, fontWeight:600 }}
                >
                  <div style={{ width:20, height:20, borderRadius:5, background:'linear-gradient(135deg,#ff3b8f,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>
                    {userName ? userName.charAt(0).toUpperCase() : 'M'}
                  </div>
                  {userName ? `${userName}'s Space` : 'My Space'}
                  <ChevronDown size={12} style={{ marginLeft:'auto', color:'var(--text-tertiary)' }}/>
                </button>
                {spaceMenuOpen && (
                  <div
                    style={{ position:'absolute', top:'100%', left:8, zIndex:300, background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:9, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', overflow:'hidden', minWidth:160, marginTop:2 }}
                    onMouseLeave={() => setSpaceMenuOpen(false)}
                  >
                    <button
                      onClick={() => { setSpaceMenuOpen(false); setSettingsOpen(true); }}
                      style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'10px 14px', background:'none', border:'none', color:'var(--text-primary)', fontSize:13, cursor:'pointer', textAlign:'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Settings size={13}/> Settings
                    </button>
                    <button
                      onClick={() => { setSpaceMenuOpen(false); onSignOut?.(); }}
                      style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'10px 14px', background:'none', border:'none', color:'var(--text-primary)', fontSize:13, cursor:'pointer', textAlign:'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <User size={13}/> Sign Out
                    </button>
                  </div>
                )}
              </div>

              <NavItem icon={<Plus size={15}/>} label="New Document" onClick={() => handleNewDoc()}/>
              <div style={{ margin:'6px 0', borderTop:'1px solid var(--border)' }}/>

              <NavItem icon={<LayoutGrid size={15}/>} label="All Docs" active={nav==='all-docs' && !activeDocumentId} onClick={() => setNavAndClearDoc('all-docs')}/>
              <NavItem icon={<CheckSquare size={15}/>} label="Tasks" active={nav==='tasks'} onClick={() => setNavAndClearDoc('tasks')}/>
              <NavItem icon={<Calendar size={15}/>} label="Calendar" active={nav==='calendar'} onClick={() => setNavAndClearDoc('calendar')}/>
              <NavItem icon={<ClipboardList size={15}/>} label="Leave Tracker"    active={nav==='imagine'}  onClick={() => setNavAndClearDoc('imagine')}/>
              <NavItem icon={<Activity size={15}/>}     label="Daily Updates"   active={nav==='updates'}  onClick={() => setNavAndClearDoc('updates')}/>
              <NavItem icon={<FileText size={15}/>}     label="Monthly Reports" active={nav==='reports'}  onClick={() => setNavAndClearDoc('reports')}/>
              <div style={{ margin:'6px 0' }}/>
              <NavItem icon={<Users size={15}/>} label="Shared with Me" active={nav==='shared'} onClick={() => setNavAndClearDoc('shared')}/>
              <div style={{ margin:'8px 0' }}/>

              {/* Starred */}
              <div style={{ padding:'4px 10px 2px', fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'0.04em' }}>Starred</div>
              {favorites.length === 0
                ? <div style={{ padding:'4px 10px 8px', fontSize:11, color:'var(--text-tertiary)', fontStyle:'italic' }}>Star Docs to keep them close</div>
                : favorites.map(doc => (
                    <SidebarDocItem key={doc.id} doc={doc} depth={0} activeId={activeDocumentId} nav={nav} onSelect={handleSelectDoc} onDelete={deleteDocument} onNewChild={handleNewDoc} onFolderClick={handleFolderClick}/>
                  ))
              }

              <div style={{ margin:'4px 0' }}/>

              {/* Folders */}
              <div style={{ padding:'4px 10px 2px', fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'0.04em' }}>Folders</div>
              {folders.map(doc => (
                <SidebarDocItem key={doc.id} doc={doc} depth={0} activeId={activeDocumentId} nav={nav} onSelect={handleSelectDoc} onDelete={deleteDocument} onNewChild={id => handleNewDoc(id)} onFolderClick={handleFolderClick}/>
              ))}

              {/* Unsorted */}
              <NavItem
                icon={<Folder size={14} style={{ opacity:0.6 }}/>}
                label="Unsorted"
                active={nav === 'unsorted'}
                onClick={() => setNavAndClearDoc('unsorted')}
              />

              <div style={{ margin:'4px 0' }}/>

              {/* Tags */}
              <div style={{ padding:'4px 10px 2px', fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:'0.04em' }}>Tags</div>
              <div style={{ padding:'4px 10px 12px', fontSize:11, color:'var(--text-tertiary)', fontStyle:'italic' }}>Pin your key tags for quick access</div>
            </div>

            {/* Footer */}
            <div style={{ borderTop:'1px solid var(--border)', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:4 }}>
                <button style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:4, borderRadius:5, display:'flex' }}><Monitor size={14}/></button>
                <button style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:4, borderRadius:5, display:'flex' }}><Share2 size={14}/></button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {userName && (
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <ThemeToggle/>
              </div>
            </div>
          </div>
        )}

        {/* ── Main content + assistant ──────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
          {/* View content */}
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            {activeDocumentId ? (
              <DocumentEditor key={activeDocumentId} documentId={activeDocumentId}/>
            ) : nav === 'tasks' ? (
              <TasksView/>
            ) : nav === 'calendar' ? (
              <CalendarView/>
            ) : nav === 'imagine' ? (
              isIntern && employeeId ? <EmployeeLeaveView employeeId={employeeId}/> : <ImagineView/>
            ) : nav === 'updates' ? (
              isIntern && employeeId
                ? <DailyUpdatesView mode="employee" employeeId={employeeId}/>
                : <DailyUpdatesView mode="manager"/>
            ) : nav === 'reports' ? (
              isIntern && employeeId
                ? <MonthlyReportsView mode="employee" employeeId={employeeId}/>
                : <MonthlyReportsView mode="manager"/>
            ) : nav === 'shared' ? (
              <SharedView/>
            ) : nav === 'unsorted' ? (
              <UnsortedView docs={unsortedDocs} onSelectDoc={handleSelectDoc} onNewDoc={() => handleNewDoc()}/>
            ) : typeof nav === 'object' && nav.type === 'folder' ? (
              (() => {
                const folder = findDoc(tree, nav.id);
                return folder
                  ? <FolderView folder={folder} onSelectDoc={handleSelectDoc} onNewDoc={() => handleNewDoc(nav.id)}/>
                  : <HomeView docs={tree} onSelectDoc={handleSelectDoc} onNewDoc={() => handleNewDoc()}/>;
              })()
            ) : (
              <HomeView docs={tree} onSelectDoc={handleSelectDoc} onNewDoc={() => handleNewDoc()}/>
            )}
          </div>

          {/* Assistant panel */}
          {assistantOpen && (
            <AssistantPanel onClose={() => setAssistantOpen(false)} contextLabel={assistantCtx}/>
          )}

          {/* Assistant button */}
          {!assistantOpen && (
            <button
              onClick={() => setAssistantOpen(true)}
              style={{ position:'absolute', bottom:20, right:20, display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:20, background:'var(--bg-sidebar)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, fontWeight:500, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}
            >
              <div style={{ width:18, height:18, borderRadius:'50%', background:'conic-gradient(from 0deg,#ff3b8f,#3b82f6,#7c3aed,#ff3b8f)', flexShrink:0 }}/>
              Assistant
            </button>
          )}
        </div>
      </div>

      {/* Portals */}
      {showOnboarding && <OnboardingCarousel onDone={handleDoneOnboarding}/>}
      {searchModalOpen && <SearchModal/>}
      {emojiPickerOpen && <EmojiPickerModal/>}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSignOut={() => { setSettingsOpen(false); onSignOut?.(); }}
          userName={userName}
        />
      )}
      <PromoPopup />
    </div>
  );
}
