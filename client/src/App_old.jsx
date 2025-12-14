import { useEffect, useState } from 'react'; // React hooks

export default function App() {
  const [health, setHealth] = useState(null); // /health response
  const [snippets, setSnippets] = useState([]); // /snippets response

  const [title, setTitle] = useState(''); // form title
  const [language, setLanguage] = useState('js'); // form language
  const [code, setCode] = useState("console.log('hi')"); // form code
  const [saving, setSaving] = useState(false); // button loading state
  const [error, setError] = useState(''); // error display

  const load = async () => {
    const h = await fetch('/api/health').then((r) => r.json()); // fetch health
    setHealth(h); // save to state

    const s = await fetch('/api/snippets').then((r) => r.json()); // fetch snippets
    setSnippets(s); // save to state
  };

  useEffect(() => {
    load().catch((e) => console.error(e)); // initial load
  }, []);

  const onCreate = async (e) => {
    e.preventDefault(); // stop page refresh
    setError(''); // clear old errors
    setSaving(true); // start loading

    if (!title.trim() || !language.trim() || !code.trim()) {
  setSaving(false);
  return setError('Title, language, and code are required.');
}


    try {
      const res = await fetch('/api/snippets', {
        method: 'POST', // create
        headers: { 'Content-Type': 'application/json' }, // send JSON
        body: JSON.stringify({ title, language, code }), // request body
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})); // try read error JSON
        throw new Error(data.message || `Create failed (${res.status})`); // throw readable error
      }

      setTitle(''); // clear title after save
      setCode(''); // clear code after save
      await load(); // refresh list
    } catch (err) {
      setError(String(err.message || err)); // show error in UI
    } finally {
      setSaving(false); // stop loading
    }
  };

  const onDelete = async (id) => {
    setError(''); // clear error
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' }); // delete call
      if (!res.ok) throw new Error(`Delete failed (${res.status})`); // handle failure
      await load(); // refresh list
    } catch (err) {
      setError(String(err.message || err)); // show error
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h1>Snippet Vault</h1>

      <h2>Health</h2>
      <pre>{health ? JSON.stringify(health, null, 2) : 'Loading...'}</pre>

      <h2>Create Snippet</h2>
      <form onSubmit={onCreate} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="js">js</option>
          <option value="ts">ts</option>
          <option value="python">python</option>
          <option value="java">java</option>
        </select>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code..."
          rows={6}
        />
        <button disabled={saving}>
          {saving ? 'Saving...' : 'Save Snippet'}
        </button>
      </form>

      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <h2>Snippets</h2>
      {snippets.map((s) => (
        <div key={s._id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong>{s.title}</strong>
            <button onClick={() => onDelete(s._id)}>Delete</button>
          </div>
          <div style={{ opacity: 0.7 }}>{s.language}</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{s.code}</pre>
        </div>
      ))}
    </div>
  );
}
