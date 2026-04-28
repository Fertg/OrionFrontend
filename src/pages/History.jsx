import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client.js';
import { formatEur, formatDateLong, formatDateRelative, todayIso } from '../utils/format.js';
import { DatePicker } from '../components/DatePicker.jsx';
import './History.css';

// Atajos de fecha
const DATE_PRESETS = [
  { id: 'all', label: 'Todo' },
  { id: 'this-month', label: 'Este mes' },
  { id: 'last-month', label: 'Mes anterior' },
  { id: 'last-30', label: 'Últimos 30 días' },
];

function presetRange(preset) {
  const now = new Date();
  const today = todayIso();
  if (preset === 'all') return { from: null, to: null };
  if (preset === 'this-month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: first.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'last-month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    };
  }
  if (preset === 'last-30') {
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to: today };
  }
  return { from: null, to: null };
}

export function HistoryPage() {
  const [expenses, setExpenses] = useState([]);
  const [totalCents, setTotalCents] = useState(0);
  const [count, setCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [datePreset, setDatePreset] = useState('this-month');
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Debounce de la búsqueda para no saturar el backend
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Calcula el rango efectivo
  const range = useMemo(() => {
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    return presetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        api.listExpenses({
          from: range.from,
          to: range.to,
          categoryId: categoryId || undefined,
          search: searchDebounced || undefined,
        }),
        categories.length === 0 ? api.listCategories() : Promise.resolve(null),
      ]);
      setExpenses(list.expenses);
      setTotalCents(list.totalCents);
      setCount(list.count);
      if (cats) setCategories(cats.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, categoryId, searchDebounced, categories.length]);

  useEffect(() => { load(); }, [load]);

  const handleChangeCategory = async (id, newCategoryId) => {
    await api.updateExpense(id, { categoryId: newCategoryId });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.deleteExpense(id);
    load();
  };

  // Agrupar por día
  const byDay = expenses.reduce((acc, e) => {
    (acc[e.occurred_at] ||= []).push(e);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <div className="history fade-in">
      <header className="history-header">
        <h1 className="history-title">Histórico</h1>
        <div className="history-summary">
          <span className="history-count mono">{count} {count === 1 ? 'gasto' : 'gastos'}</span>
          <span className="history-total mono tabular">{formatEur(totalCents)}</span>
        </div>
      </header>

      <Filters
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        customFrom={customFrom}
        customTo={customTo}
        setCustomFrom={setCustomFrom}
        setCustomTo={setCustomTo}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        categories={categories}
        search={search}
        setSearch={setSearch}
      />

      {error && <div className="error-banner">{error}</div>}

      {loading && expenses.length === 0 ? (
        <div className="loading" style={{ padding: 'var(--s-5) 0' }}>Cargando</div>
      ) : days.length === 0 ? (
        <div className="empty-state">No hay gastos que coincidan con los filtros.</div>
      ) : (
        <div className="history-list">
          {days.map((day) => {
            const dayTotal = byDay[day].reduce((s, e) => s + Number(e.amount_cents), 0);
            return (
              <section key={day} className="day-group">
                <header className="day-header">
                  <div className="day-name">{formatDateRelative(day)}</div>
                  <div className="day-date">{formatDateLong(day)}</div>
                  <div className="day-total mono tabular">{formatEur(dayTotal)}</div>
                </header>
                <ul className="exp-list">
                  {byDay[day].map((e) => (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      categories={categories}
                      onChangeCategory={(catId) => handleChangeCategory(e.id, catId)}
                      onDelete={() => handleDelete(e.id)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============= Filtros ============= */
function Filters({
  datePreset, setDatePreset,
  customFrom, customTo, setCustomFrom, setCustomTo,
  categoryId, setCategoryId, categories,
  search, setSearch,
}) {
  const [pickerOpen, setPickerOpen] = useState(null); // 'from' | 'to' | null

  return (
    <div className="filters">
      <div className="filters-row">
        <div className="search-input-wrap">
          <span className="search-icon mono">⌕</span>
          <input
            className="search-input"
            type="text"
            placeholder="Buscar por descripción o comercio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} title="Limpiar">×</button>
          )}
        </div>

        <select
          className="cat-filter"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="filters-row date-presets">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`preset-chip ${datePreset === p.id ? 'active' : ''}`}
            onClick={() => setDatePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`preset-chip ${datePreset === 'custom' ? 'active' : ''}`}
          onClick={() => {
            setDatePreset('custom');
            setCustomFrom(customFrom || todayIso());
            setCustomTo(customTo || todayIso());
          }}
        >
          Personalizado
        </button>

        {datePreset === 'custom' && (
          <div className="custom-range">
            <div className="custom-date-wrap">
              <button
                type="button"
                className="custom-date-btn"
                onClick={() => setPickerOpen(pickerOpen === 'from' ? null : 'from')}
              >
                {customFrom ? formatDateRelative(customFrom) : 'Desde…'}
              </button>
              {pickerOpen === 'from' && (
                <DatePicker
                  value={customFrom}
                  maxDate={customTo || todayIso()}
                  onChange={(iso) => { setCustomFrom(iso); setPickerOpen(null); }}
                  onClose={() => setPickerOpen(null)}
                />
              )}
            </div>
            <span className="custom-sep">→</span>
            <div className="custom-date-wrap">
              <button
                type="button"
                className="custom-date-btn"
                onClick={() => setPickerOpen(pickerOpen === 'to' ? null : 'to')}
              >
                {customTo ? formatDateRelative(customTo) : 'Hasta…'}
              </button>
              {pickerOpen === 'to' && (
                <DatePicker
                  value={customTo}
                  minDate={customFrom}
                  onChange={(iso) => { setCustomTo(iso); setPickerOpen(null); }}
                  onClose={() => setPickerOpen(null)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============= Fila de gasto ============= */
function ExpenseRow({ expense, categories, onChangeCategory, onDelete }) {
  const [editingCat, setEditingCat] = useState(false);

  return (
    <li className="exp-row">
      <span
        className="cat-dot"
        style={{ background: `#${expense.category_color || '8B8B8B'}` }}
      />
      <div className="exp-desc">{expense.description}</div>
      <button
        className="exp-cat"
        onClick={() => setEditingCat((v) => !v)}
        type="button"
      >
        {expense.category_name || 'Otros'}
      </button>
      <div className="exp-amount mono tabular">{formatEur(expense.amount_cents)}</div>
      <button
        className="exp-delete"
        onClick={onDelete}
        title="Eliminar"
        type="button"
      >
        ×
      </button>

      {editingCat && (
        <div className="exp-cat-menu">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChangeCategory(c.id);
                setEditingCat(false);
              }}
              className="exp-cat-option"
              type="button"
            >
              <span className="cat-dot" style={{ background: `#${c.color}` }} />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
