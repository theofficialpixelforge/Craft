import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Zap, AlignJustify, Search, FileText, BarChart3, ChevronDown, Send, LayoutGrid } from 'lucide-react';
import { api } from '../../api';
import { useDocumentStore } from '../../store/documentStore';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  onClose: () => void;
  contextLabel?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  { icon: <FileText size={14} />, label: 'Research a Topic',   prefill: true,  prompt: 'Research ' },
  { icon: <Search size={14} />,   label: 'Semantic Search',    prefill: true,  prompt: 'Search for ' },
  { icon: <BarChart3 size={14} />,label: 'Get an Overview',    prefill: false, prompt: 'Give me an overview of my documents' },
  { icon: <FileText size={14} />, label: 'Summarize Document', prefill: false, prompt: 'Summarize the current document' },
  { icon: <Search size={14} />,   label: 'Find Related Docs',  prefill: false, prompt: '' /* built dynamically */ },
];

export function AssistantPanel({ onClose, contextLabel = 'All Docs' }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showMore, setShowMore]   = useState(false);
  const [mode, setMode]           = useState<'fast' | 'auto'>('auto');

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const abortRef   = useRef(false);

  const { activeDocument } = useDocumentStore();
  const { blocks }         = useEditorStore();

  const context = {
    docTitle:   activeDocument?.title ?? undefined,
    blockCount: blocks.length,
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    // Build prompt for "Find Related Docs" dynamically
    const resolvedText = trimmed === '' ? trimmed
      : trimmed === SUGGESTIONS[4].prompt || text === 'Find Related Docs'
        ? `Find documents related to "${activeDocument?.title || 'the current document'}"`
        : trimmed;

    const next: Message[] = [
      ...messages,
      { role: 'user', content: resolvedText },
      { role: 'assistant', content: '' },
    ];
    setMessages(next);
    setInput('');
    setStreaming(true);
    abortRef.current = false;

    try {
      for await (const chunk of api.chatStream(
        next.slice(0, -1), // send without the empty assistant placeholder
        context,
      )) {
        if (abortRef.current) break;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Something went wrong. Please try again.',
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, context, activeDocument]);

  const handleSuggestion = (s: typeof SUGGESTIONS[0]) => {
    if (s.prefill) {
      setInput(s.prompt);
      inputRef.current?.focus();
    } else {
      const prompt = s.label === 'Find Related Docs'
        ? `Find documents related to "${activeDocument?.title || 'the current document'}"`
        : s.prompt;
      sendMessage(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    abortRef.current = true;
    setMessages([]);
    setInput('');
    setStreaming(false);
  };

  const visibleSuggestions = showMore ? SUGGESTIONS : SUGGESTIONS.slice(0, 3);
  const hasMessages = messages.length > 0;

  return (
    <div style={{
      width: 300, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-sidebar)',
      height: '100%',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:4, borderRadius:5, display:'flex' }}>
          <AlignJustify size={15} />
        </button>
        <div style={{ flex:1 }} />
        <button
          onClick={handleNewChat}
          style={{
            padding:'5px 14px', borderRadius:8,
            background:'var(--bg-block-hover)', border:'1px solid var(--border)',
            color:'var(--text-primary)', fontSize:12, fontWeight:500, cursor:'pointer',
          }}
        >
          New Chat
        </button>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-tertiary)', cursor:'pointer', padding:4, borderRadius:5, display:'flex', marginLeft:6 }}>
          <X size={16} />
        </button>
      </div>

      {/* Body: suggestions or messages */}
      <div style={{ flex:1, overflow:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:8 }}>
        {!hasMessages ? (
          /* Suggestions view */
          <>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-tertiary)', letterSpacing:'0.05em', marginBottom:4 }}>
              Suggestions
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              {visibleSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s)}
                  style={{
                    display:'flex', alignItems:'center', gap:9,
                    padding:'7px 10px', borderRadius:7, background:'none', border:'none',
                    cursor:'pointer', textAlign:'left', color:'var(--text-primary)', fontSize:13,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ color:'var(--text-tertiary)', display:'flex' }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => setShowMore(v => !v)}
                style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'7px 10px', borderRadius:7, background:'none', border:'none',
                  cursor:'pointer', textAlign:'left', color:'var(--text-tertiary)', fontSize:13,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }} />
                {showMore ? 'Show Less' : `Show ${SUGGESTIONS.length - 3} More`}
              </button>
            </div>

            {/* Context card */}
            <div style={{
              marginTop:8, padding:'10px 12px', borderRadius:10,
              background:'var(--bg-block-hover)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', gap:10, cursor:'pointer',
            }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--bg-editor)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <LayoutGrid size={15} style={{ color:'var(--text-secondary)' }} />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>
                  {activeDocument?.title || contextLabel}
                </div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{contextLabel}</div>
              </div>
            </div>
          </>
        ) : (
          /* Messages view */
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display:'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth:'85%',
                  padding:'8px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-block-hover)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize:13,
                  lineHeight:'1.5',
                  whiteSpace:'pre-wrap',
                  wordBreak:'break-word',
                }}>
                  {msg.content || (streaming && i === messages.length - 1
                    ? <span style={{ opacity:0.5 }}>●●●</span>
                    : null
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-block-hover)', marginBottom:10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder="Message My Org Assistant"
            style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:13, color:'var(--text-primary)', boxSizing:'border-box', opacity: streaming ? 0.5 : 1 }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {input.trim() ? (
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming}
              style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: streaming ? 'default' : 'pointer', flexShrink:0, opacity: streaming ? 0.5 : 1 }}
            >
              <Send size={13} />
            </button>
          ) : (
            <button style={{ width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)', background:'transparent', color:'var(--text-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={() => setMode('fast')}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:16, border:'1px solid var(--border)', background: mode==='fast' ? 'var(--bg-block-hover)' : 'transparent', color: mode==='fast' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer' }}
          >
            <Zap size={12} /> Fast
          </button>
          <button
            onClick={() => setMode('auto')}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:16, border:'1px solid var(--border)', background: mode==='auto' ? 'var(--bg-block-hover)' : 'transparent', color: mode==='auto' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer' }}
          >
            <div style={{ width:14, height:14, borderRadius:'50%', border:`1.5px solid ${mode==='auto' ? 'var(--accent)' : 'var(--text-tertiary)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {mode==='auto' && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} />}
            </div>
            Auto
          </button>
        </div>
      </div>
    </div>
  );
}
