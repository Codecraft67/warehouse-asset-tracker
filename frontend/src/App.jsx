import { useCallback, useEffect, useState } from "react";
import { getCategories, getStats, listAssets } from "./api";
import AssetCard from "./components/AssetCard";
import AssetForm from "./components/AssetForm";
import AssetModal from "./components/AssetModal";
import { GridIcon, PlusIcon, SearchIcon } from "./components/Icons";

const PER_PAGE = 12;
const idFromHash = () => {
  const m = window.location.hash.match(/^#\/asset\/(\d+)$/);
  return m ? Number(m[1]) : null;
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced search text
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(idFromHash());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // debounce search so we don't call the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, st, cats] = await Promise.all([
        listAssets({ search: query, category, page, perPage: PER_PAGE }),
        getStats(),
        getCategories(),
      ]);
      setData(list); setStats(st); setCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query, category, page]);

  useEffect(() => { refresh(); }, [refresh]);

  // deep-linking: #/asset/5 opens a record directly
  useEffect(() => {
    const onHash = () => setSelected(idFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const openRecord = (id) => { window.location.hash = `/asset/${id}`; };
  const closeRecord = () => { history.pushState("", document.title, window.location.pathname + window.location.search); setSelected(null); };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const onSaved = (asset) => {
    setToast(`Saved ${asset.asset_id}`);
    setView("dashboard");
    setSearch(""); setCategory(""); setPage(1);
    refresh();
  };
  const onDeleted = (assetId) => { closeRecord(); setToast(`Deleted ${assetId}`); refresh(); };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: <GridIcon /> },
    { id: "new", label: "New entry", icon: <PlusIcon /> },
  ];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div><strong>Asset Register</strong><small>Warehouse floor</small></div>
        </div>
        <nav>
          {nav.map((n) => (
            <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        {view === "new" ? (
          <AssetForm categories={categories} onSaved={onSaved} />
        ) : (
          <>
            <header className="top">
              <div>
                <h1>Asset records</h1>
                {stats && (
                  <p className="summary">
                    <b>{stats.total}</b> assets logged, <b>{stats.today}</b> today, across <b>{stats.categories}</b> categories
                    {stats.automated > 0 && <>, <b>{stats.automated}</b> added automatically</>}
                  </p>
                )}
              </div>
              <button className="btn primary desk-only" onClick={() => setView("new")}><PlusIcon /> New entry</button>
            </header>

            <div className="filters">
              <label className="search">
                <SearchIcon />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Asset ID" aria-label="Search by Asset ID" />
              </label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <p className="notice error">{error} <button className="link-btn" onClick={refresh}>Try again</button></p>}

            {!error && !loading && data.items.length === 0 && (
              <div className="empty">
                <h3>{query || category ? "No assets match your search" : "No assets logged yet"}</h3>
                <p className="muted">{query || category ? "Check the Asset ID or clear the filters." : "Log the first asset to see it here."}</p>
                {!(query || category) && <button className="btn primary" onClick={() => setView("new")}>Log an asset</button>}
              </div>
            )}

            <div className={`grid ${loading ? "dim" : ""}`}>
              {data.items.map((a) => <AssetCard key={a.id} asset={a} onOpen={openRecord} />)}
            </div>

            {data.pages > 1 && (
              <div className="pager">
                <button className="btn ghost small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page} of {data.pages}</span>
                <button className="btn ghost small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {nav.map((n) => (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)}>
            {n.icon}<span>{n.label}</span>
          </button>
        ))}
      </nav>

      {selected && <AssetModal id={selected} onClose={closeRecord} onDeleted={onDeleted} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
