import { useEffect, useMemo, useRef, useState } from 'react'; // React hooks

export default function App() {
  // ---------------------------
  // API + app state
  // ---------------------------
  const [health, setHealth] = useState(null); // backend /health response
  const [snippets, setSnippets] = useState([]); // backend /snippets array
  const [loading, setLoading] = useState(true); // global loading flag
  const [error, setError] = useState(''); // global error text

  // ---------------------------
  // UI preferences (persisted)
  // ---------------------------
  const [theme, setTheme] = useState(() => localStorage.getItem('sv_theme') || 'dark'); // 'dark' | 'light'
  const [view, setView] = useState(() => localStorage.getItem('sv_view') || 'grid'); // 'grid' | 'list'
  const [sort, setSort] = useState(() => localStorage.getItem('sv_sort') || 'newest'); // 'newest' | 'oldest' | 'title'
  const [filterLang, setFilterLang] = useState(() => localStorage.getItem('sv_lang') || 'all'); // 'all' | language
  const [query, setQuery] = useState(''); // search query

  // ---------------------------
  // Create snippet form (persisted draft)
  // ---------------------------
  const [title, setTitle] = useState(() => localStorage.getItem('sv_draft_title') || ''); // snippet title
  const [language, setLanguage] = useState(() => localStorage.getItem('sv_draft_lang') || 'js'); // snippet language
  const [code, setCode] = useState(() => localStorage.getItem('sv_draft_code') || "console.log('hi')"); // snippet code
  const [saving, setSaving] = useState(false); // create button loading flag
  const [drawerOpen, setDrawerOpen] = useState(true); // create panel open/close

  // ---------------------------
  // Toasts + modal
  // ---------------------------
  const [toasts, setToasts] = useState([]); // list of toast objects
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, title: '' }); // delete confirm modal state

  // Refs for keyboard shortcuts
  const searchRef = useRef(null); // search input ref
  const titleRef = useRef(null); // title input ref

  // ---------------------------
  // Small helpers
  // ---------------------------
  const toast = (msg, type = 'info') => {
    // Push a toast and auto-remove it after 2.4s
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg, type }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  };

  const safeJson = async (res) => {
    // Try to read JSON, otherwise return empty object (prevents crash on non-JSON)
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const apiGet = async (path) => {
    // Standard GET wrapper with error handling
    const res = await fetch(path);
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.message || `GET ${path} failed (${res.status})`);
    }
    return res.json();
  };

  const apiSend = async (path, options) => {
    // Standard send wrapper (POST/DELETE/etc.) with error handling
    const res = await fetch(path, options);
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.message || `${options?.method || 'REQUEST'} ${path} failed (${res.status})`);
    }
    return safeJson(res);
  };

  // ---------------------------
  // Load data (health + snippets)
  // ---------------------------
  const load = async () => {
    setError(''); // clear old errors before a refresh
    const h = await apiGet('/api/health'); // fetch backend health
    setHealth(h); // store health
    const s = await apiGet('/api/snippets'); // fetch snippets array
    setSnippets(Array.isArray(s) ? s : []); // store snippets safely
  };

  useEffect(() => {
    // Initial load on mount
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------------------------
  // Persist preferences/draft
  // ---------------------------
  useEffect(() => {
    localStorage.setItem('sv_theme', theme); // persist theme
    document.documentElement.dataset.theme = theme; // apply to CSS via [data-theme]
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sv_view', view); // persist view mode
  }, [view]);

  useEffect(() => {
    localStorage.setItem('sv_sort', sort); // persist sort
  }, [sort]);

  useEffect(() => {
    localStorage.setItem('sv_lang', filterLang); // persist language filter
  }, [filterLang]);

  useEffect(() => {
    localStorage.setItem('sv_draft_title', title); // persist draft title
  }, [title]);

  useEffect(() => {
    localStorage.setItem('sv_draft_lang', language); // persist draft language
  }, [language]);

  useEffect(() => {
    localStorage.setItem('sv_draft_code', code); // persist draft code
  }, [code]);

  // ---------------------------
  // Keyboard shortcuts
  // ---------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'; // Ctrl/Cmd+K
      const isCmdEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter'; // Ctrl/Cmd+Enter
      const isEsc = e.key === 'Escape'; // Escape

      if (isCmdK) {
        e.preventDefault();
        searchRef.current?.focus(); // jump to search
      }

      if (isCmdEnter) {
        // Save from anywhere if drawer is open (nice “pro” feel)
        if (drawerOpen) {
          e.preventDefault();
          document.getElementById('sv-create-btn')?.click(); // trigger create
        }
      }

      if (isEsc && confirmDelete.open) {
        setConfirmDelete({ open: false, id: null, title: '' }); // close modal on ESC
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, confirmDelete.open]);

  // ---------------------------
  // Derived list (search/filter/sort)
  // ---------------------------
  const languages = useMemo(() => {
    // Build language list from snippets + common options
    const set = new Set(['js', 'ts', 'python', 'java', 'go', 'csharp', 'cpp', 'html', 'css', 'sql']);
    snippets.forEach((s) => s?.language && set.add(String(s.language).toLowerCase()));
    return Array.from(set).sort();
  }, [snippets]);

  const visibleSnippets = useMemo(() => {
    // Filter + search + sort on the client side
    const q = query.trim().toLowerCase();
    let list = [...snippets];

    if (filterLang !== 'all') {
      list = list.filter((s) => String(s?.language || '').toLowerCase() === filterLang);
    }

    if (q) {
      list = list.filter((s) => {
        const t = String(s?.title || '').toLowerCase();
        const l = String(s?.language || '').toLowerCase();
        const c = String(s?.code || '').toLowerCase();
        return t.includes(q) || l.includes(q) || c.includes(q);
      });
    }

    if (sort === 'title') {
      list.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (sort === 'oldest') {
      // If createdAt exists, use it; otherwise keep stable order
      list.sort((a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime());
    } else {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    }

    return list;
  }, [snippets, query, filterLang, sort]);

  // ---------------------------
  // Actions (create / delete / copy)
  // ---------------------------
  const onCreate = async (e) => {
    e.preventDefault(); // prevent full page refresh
    setError(''); // clear any global error

    // Basic validation (fast feedback)
    if (!title.trim() || !language.trim() || !code.trim()) {
      toast('Title, language, and code are required.', 'error');
      return;
    }

    setSaving(true); // show loading on button

    try {
      await apiSend('/api/snippets', {
        method: 'POST', // create snippet
        headers: { 'Content-Type': 'application/json' }, // JSON request
        body: JSON.stringify({ title: title.trim(), language: language.trim(), code }), // request body
      });

      toast('Saved!', 'success'); // nice feedback
      setTitle(''); // clear title after save
      setCode(''); // clear code after save
      titleRef.current?.focus(); // keep your flow fast
      await load(); // refresh list from server (source of truth)
    } catch (err) {
      const msg = String(err?.message || err);
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (s) => {
    // Open confirm modal (prevents accidental deletes)
    setConfirmDelete({ open: true, id: s._id, title: s.title || 'Untitled' });
  };

  const doDelete = async () => {
    // Actually delete after confirm
    const { id } = confirmDelete;
    if (!id) return;

    setConfirmDelete({ open: false, id: null, title: '' });

    try {
      await apiSend(`/api/snippets/${id}`, { method: 'DELETE' }); // delete endpoint
      toast('Deleted.', 'success');
      await load(); // refresh
    } catch (err) {
      const msg = String(err?.message || err);
      setError(msg);
      toast(msg, 'error');
    }
  };

  const onCopy = async (text) => {
    // Copy code to clipboard (with fallback)
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard.', 'success');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('Copied to clipboard.', 'success');
      } catch (e) {
        toast('Copy failed (clipboard blocked).', 'error');
      }
    }
  };

  const statusLabel = health?.ok ? 'Online' : health ? 'Offline' : 'Connecting...'; // health badge text

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="sv">
      <style>{`
        /* -------------------------------------------------
           "WOW" UI (no external libs)
           Theme is controlled by: documentElement.dataset.theme
        -------------------------------------------------- */
        :root {
          --bg0: #05070c;
          --bg1: #070a12;
          --card: rgba(255,255,255,0.06);
          --card2: rgba(255,255,255,0.08);
          --border: rgba(255,255,255,0.10);
          --text: rgba(255,255,255,0.92);
          --muted: rgba(255,255,255,0.65);
          --shadow: 0 20px 70px rgba(0,0,0,0.55);
          --ring: rgba(136, 180, 255, 0.38);
          --good: rgba(90, 255, 180, 0.95);
          --bad: rgba(255, 105, 130, 0.95);
          --warn: rgba(255, 210, 110, 0.95);
          --chip: rgba(255,255,255,0.10);
        }
        :root[data-theme="light"] {
          --bg0: #f6f7fb;
          --bg1: #ffffff;
          --card: rgba(0,0,0,0.04);
          --card2: rgba(0,0,0,0.06);
          --border: rgba(0,0,0,0.10);
          --text: rgba(0,0,0,0.85);
          --muted: rgba(0,0,0,0.60);
          --shadow: 0 20px 70px rgba(0,0,0,0.12);
          --ring: rgba(45, 120, 255, 0.25);
          --chip: rgba(0,0,0,0.06);
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: var(--bg0); color: var(--text); }
        .sv {
          min-height: 100vh;
          background:
            radial-gradient(900px 600px at 15% 12%, rgba(120, 140, 255, 0.22), transparent 60%),
            radial-gradient(900px 600px at 85% 20%, rgba(80, 255, 190, 0.14), transparent 60%),
            radial-gradient(1000px 700px at 50% 100%, rgba(255, 155, 70, 0.12), transparent 60%),
            linear-gradient(180deg, var(--bg0), var(--bg1));
          padding: 22px;
        }
        .shell {
          max-width: 1150px;
          margin: 0 auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--card);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 14px;
          z-index: 10;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 240px;
        }
        .logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background:
            radial-gradient(12px 12px at 30% 30%, rgba(255,255,255,0.75), transparent 60%),
            linear-gradient(135deg, rgba(120,140,255,0.9), rgba(80,255,190,0.55));
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.18);
        }
        .title {
          display: grid;
          gap: 2px;
        }
        .title h1 { margin: 0; font-size: 16px; letter-spacing: 0.3px; }
        .title .sub { font-size: 12px; color: var(--muted); }

        .controls {
          display: grid;
          grid-template-columns: 1fr auto auto auto auto;
          gap: 10px;
          align-items: center;
          flex: 1;
        }
        .input {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--card2);
          box-shadow: 0 0 0 0 rgba(0,0,0,0);
        }
        .input:focus-within { outline: none; box-shadow: 0 0 0 4px var(--ring); }
        .input input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 13px;
        }
        .kbd {
          font-size: 11px;
          color: var(--muted);
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.10);
          padding: 4px 7px;
          border-radius: 10px;
        }
        :root[data-theme="light"] .kbd { background: rgba(0,0,0,0.04); }

        .btn {
          border: 1px solid var(--border);
          background: var(--card2);
          color: var(--text);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.08s ease, filter 0.08s ease;
        }
        .btn:hover { filter: brightness(1.06); }
        .btn:active { transform: translateY(1px); }
        .btn.primary {
          background: linear-gradient(135deg, rgba(120,140,255,0.85), rgba(80,255,190,0.55));
          border-color: rgba(255,255,255,0.22);
        }
        .btn.ghost { background: transparent; }
        .btn.small { padding: 8px 10px; border-radius: 12px; font-size: 12px; }
        .btn.danger { border-color: rgba(255, 105, 130, 0.35); }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--card2);
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--warn);
          box-shadow: 0 0 0 4px rgba(255, 210, 110, 0.14);
        }
        .dot.good { background: var(--good); box-shadow: 0 0 0 4px rgba(90, 255, 180, 0.12); }
        .dot.bad { background: var(--bad); box-shadow: 0 0 0 4px rgba(255, 105, 130, 0.12); }

        .grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 16px;
          margin-top: 16px;
        }
        @media (max-width: 980px) {
          .controls { grid-template-columns: 1fr auto auto; }
          .grid { grid-template-columns: 1fr; }
          .brand { min-width: unset; }
        }

        .panel {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--card);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }
        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
        }
        :root[data-theme="light"] .panelHeader { background: rgba(0,0,0,0.02); }
        .panelHeader h2 { margin: 0; font-size: 13px; letter-spacing: 0.25px; }
        .panelBody { padding: 14px; }

        .field { display: grid; gap: 6px; margin-bottom: 10px; }
        .label { font-size: 12px; color: var(--muted); display: flex; justify-content: space-between; gap: 10px; }
        .label .hint { opacity: 0.9; }
        .text, .select, .textarea {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--card2);
          border-radius: 14px;
          padding: 10px 12px;
          outline: none;
          color: var(--text);
          font-size: 13px;
        }
        .text:focus, .select:focus, .textarea:focus { box-shadow: 0 0 0 4px var(--ring); }
        .textarea { min-height: 170px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; line-height: 1.5; }

        .row { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .row .left { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .row .right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .muted { color: var(--muted); font-size: 12px; }
        .error {
          border: 1px solid rgba(255,105,130,0.35);
          background: rgba(255,105,130,0.10);
          padding: 10px 12px;
          border-radius: 14px;
          color: var(--text);
          font-size: 13px;
          margin-top: 10px;
        }

        .listHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px;
          border-bottom: 1px solid var(--border);
        }
        .chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--chip);
          font-size: 12px;
          color: var(--muted);
          cursor: pointer;
        }
        .chip.active {
          color: var(--text);
          background: rgba(120,140,255,0.20);
          border-color: rgba(120,140,255,0.35);
        }

        .cards {
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .cards.list { grid-template-columns: 1fr; }
        @media (max-width: 740px) {
          .cards { grid-template-columns: 1fr; }
        }

        .card {
          border: 1px solid var(--border);
          background: var(--card2);
          border-radius: 16px;
          padding: 12px;
          overflow: hidden;
          position: relative;
        }
        .cardTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .cardTitle {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .cardTitle strong {
          font-size: 14px;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.10);
          font-size: 11px;
          color: var(--muted);
        }
        :root[data-theme="light"] .badge { background: rgba(0,0,0,0.04); }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
        }
        .codeBox {
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.14);
          padding: 10px 12px;
          border-radius: 14px;
          overflow: auto;
          max-height: 200px;
        }
        :root[data-theme="light"] .codeBox { background: rgba(0,0,0,0.05); }
        pre { margin: 0; white-space: pre-wrap; word-break: break-word; }

        .skeleton {
          position: relative;
          overflow: hidden;
        }
        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer { 100% { transform: translateX(100%); } }

        .toasts {
          position: fixed;
          bottom: 18px;
          right: 18px;
          display: grid;
          gap: 10px;
          z-index: 50;
        }
        .toast {
          border: 1px solid var(--border);
          background: var(--card);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
        }
        .toast .tDot { width: 10px; height: 10px; border-radius: 50%; background: var(--warn); }
        .toast.success .tDot { background: var(--good); }
        .toast.error .tDot { background: var(--bad); }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: grid;
          place-items: center;
          padding: 18px;
          z-index: 60;
        }
        :root[data-theme="light"] .modalBackdrop { background: rgba(0,0,0,0.35); }
        .modal {
          width: 100%;
          max-width: 460px;
          border: 1px solid var(--border);
          background: var(--card);
          box-shadow: var(--shadow);
          border-radius: 18px;
          overflow: hidden;
          backdrop-filter: blur(14px);
        }
        .modalHeader { padding: 14px; border-bottom: 1px solid var(--border); }
        .modalHeader strong { font-size: 14px; }
        .modalBody { padding: 14px; color: var(--muted); font-size: 13px; }
        .modalFooter { padding: 14px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
      `}</style>

      <div className="shell">
        {/* Top bar: brand + search + quick controls */}
        <div className="topbar">
          <div className="brand">
            <div className="logo" aria-hidden="true" />
            <div className="title">
              <h1>Code Snippet Vault App V1.2</h1>
              <div className="sub">Fast snippets, clean UI, real API</div>
            </div>
          </div>

          <div className="controls">
            <div className="input" title="Search snippets (Ctrl/Cmd+K)">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, language, or code…"
              />
              <span className="kbd">Ctrl K</span>
            </div>

            <button
              className="btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle theme"
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>

            <button
              className="btn"
              onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
              title="Toggle layout"
            >
              {view === 'grid' ? 'Grid' : 'List'}
            </button>

            <button
              className="btn"
              onClick={async () => {
                try {
                  setLoading(true);
                  await load();
                  toast('Refreshed.', 'success');
                } catch (e) {
                  const msg = String(e?.message || e);
                  setError(msg);
                  toast(msg, 'error');
                } finally {
                  setLoading(false);
                }
              }}
              title="Refresh"
            >
              Refresh
            </button>

            <span className="pill" title="Backend status from /api/health">
              <span className={`dot ${health?.ok ? 'good' : health ? 'bad' : ''}`} />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid">
          {/* Left panel: Create snippet */}
          <div className="panel">
            <div className="panelHeader">
              <h2>Create Snippet</h2>
              <button className="btn small ghost" onClick={() => setDrawerOpen((o) => !o)}>
                {drawerOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {drawerOpen ? (
              <div className="panelBody">
                <form onSubmit={onCreate}>
                  <div className="field">
                    <div className="label">
                      <span>Title</span>
                      <span className="hint muted">Pro tip: Ctrl/Cmd+Enter to save</span>
                    </div>
                    <input
                      ref={titleRef}
                      className="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Fetch snippets with React"
                    />
                  </div>

                  <div className="field">
                    <div className="label">
                      <span>Language</span>
                      <span className="hint muted">Used for filtering + label</span>
                    </div>
                    <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                      {languages.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <div className="label">
                      <span>Code</span>
                      <span className="hint muted">Keep it simple, copy-friendly</span>
                    </div>
                    <textarea
                      className="textarea"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste your snippet here…"
                      spellCheck={false}
                    />
                  </div>

                  <div className="row">
                    <div className="left">
                      <button id="sv-create-btn" className="btn primary" disabled={saving} type="submit">
                        {saving ? 'Saving…' : 'Save Snippet'}
                      </button>

                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setTitle('Hello World (JS)');
                          setLanguage('js');
                          setCode("console.log('Hello from Snippet Vault!');");
                          toast('Example loaded.', 'info');
                        }}
                      >
                        Load Example
                      </button>

                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setTitle('');
                          setCode('');
                          toast('Cleared.', 'info');
                          titleRef.current?.focus();
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="right">
                      <span className="muted">
                        Draft auto-saves • <span className="mono">{snippets.length}</span> total snippets
                      </span>
                    </div>
                  </div>
                </form>

                {error ? <div className="error">{error}</div> : null}
              </div>
            ) : (
              <div className="panelBody">
                <div className="muted">Create panel collapsed. Click “Expand” to add new snippets.</div>
              </div>
            )}
          </div>

          {/* Right panel: Snippets list */}
          <div className="panel">
            <div className="listHeader">
              <div className="row" style={{ width: '100%' }}>
                <div className="left">
                  <strong style={{ fontSize: 13, letterSpacing: 0.2 }}>Snippets</strong>

                  <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 160 }}>
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="title">Sort: Title</option>
                  </select>
                </div>

                <div className="right">
                  <span className="muted">
                    Showing <span className="mono">{visibleSnippets.length}</span>
                    {query.trim() ? (
                      <>
                        {' '}
                        for <span className="mono">"{query.trim()}"</span>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>

            <div className="panelBody" style={{ paddingBottom: 0 }}>
              <div className="chips" aria-label="Language filter">
                <button
                  className={`chip ${filterLang === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterLang('all')}
                  type="button"
                >
                  All
                </button>
                {languages.map((l) => (
                  <button
                    key={l}
                    className={`chip ${filterLang === l ? 'active' : ''}`}
                    onClick={() => setFilterLang(l)}
                    type="button"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className={`cards ${view === 'list' ? 'list' : ''}`}>
              {/* Loading skeletons for “premium” feel */}
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card skeleton" style={{ height: 160 }} />
                ))
              ) : visibleSnippets.length === 0 ? (
                <div className="muted" style={{ padding: 10 }}>
                  No snippets yet. Create one on the left, or clear filters/search.
                </div>
              ) : (
                visibleSnippets.map((s) => (
                  <div key={s._id} className="card">
                    <div className="cardTop">
                      <div className="cardTitle">
                        <strong title={s.title || ''}>{s.title || 'Untitled'}</strong>
                        <span className="badge">
                          <span className="mono">{String(s.language || 'text')}</span>
                          {s.createdAt ? <span className="muted">• {new Date(s.createdAt).toLocaleString()}</span> : null}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn small" onClick={() => onCopy(String(s.code || ''))} type="button">
                          Copy
                        </button>
                        <button className="btn small danger" onClick={() => askDelete(s)} type="button">
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="codeBox">
                      <pre className="mono">{String(s.code || '')}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Delete confirm modal */}
        {confirmDelete.open ? (
          <div className="modalBackdrop" onMouseDown={() => setConfirmDelete({ open: false, id: null, title: '' })}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <strong>Delete snippet?</strong>
              </div>
              <div className="modalBody">
                This will permanently delete <span className="mono">"{confirmDelete.title}"</span>.
              </div>
              <div className="modalFooter">
                <button className="btn" onClick={() => setConfirmDelete({ open: false, id: null, title: '' })}>
                  Cancel
                </button>
                <button className="btn danger" onClick={doDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Toasts */}
        <div className="toasts" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span className="tDot" aria-hidden="true" />
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
