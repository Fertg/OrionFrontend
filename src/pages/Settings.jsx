import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { formatEur, parseAmountToCents } from '../utils/format.js';
import './Settings.css';

export function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, buds] = await Promise.all([
        api.listCategories(),
        api.listBudgets(),
      ]);
      setCategories(cats.categories);
      setBudgets(buds.budgets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Archivar esta categoría? Los gastos asociados quedarán sin categoría.')) return;
    await api.deleteCategory(id);
    load();
  };

  if (loading) return <div className="loading">Cargando</div>;

  return (
    <div className="settings fade-in">
      <header className="settings-header">
        <h1 className="settings-title">Ajustes</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <BudgetSection budgets={budgets} onChange={load} />

      <section className="settings-section">
        <div className="section-head">
          <h2 className="section-title">Categorías</h2>
          <button className="btn-ghost section-action" onClick={() => setCreating(true)}>
            + Nueva
          </button>
        </div>

        <ul className="cat-settings-list">
          {categories.map((c) => (
            <li key={c.id} className="cat-settings-row">
              <span className="cat-dot" style={{ background: `#${c.color}` }} />
              <span className="cat-settings-name">{c.name}</span>
              {c.is_default && <span className="cat-default-badge">por defecto</span>}
              <button
                className="cat-settings-delete"
                onClick={() => handleDelete(c.id)}
                title="Archivar"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      {creating && (
        <NewCategoryForm
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ============= Sección de presupuesto ============= */
function BudgetSection({ budgets, onChange }) {
  const globalBudget = budgets.find((b) => b.category_id === null);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const startEdit = () => {
    setAmount(globalBudget ? String(globalBudget.monthly_cents / 100).replace('.', ',') : '');
    setEditing(true);
    setErr(null);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!cents) {
      setErr('Importe inválido');
      return;
    }
    setSubmitting(true);
    try {
      await api.setBudget({ categoryId: null, monthlyCents: cents });
      setEditing(false);
      onChange();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('¿Eliminar el presupuesto mensual?')) return;
    await api.clearBudget('global');
    onChange();
  };

  return (
    <section className="settings-section">
      <div className="section-head">
        <h2 className="section-title">Presupuesto mensual</h2>
        {globalBudget && !editing && (
          <button className="btn-ghost section-action" onClick={startEdit}>
            Editar
          </button>
        )}
      </div>

      {!editing && globalBudget && (
        <div className="budget-current">
          <div className="budget-current-amount mono tabular">
            {formatEur(globalBudget.monthly_cents, { withCents: false })}
          </div>
          <div className="budget-current-meta">al mes</div>
          <button className="btn-ghost budget-clear" onClick={handleClear}>
            Eliminar
          </button>
        </div>
      )}

      {!editing && !globalBudget && (
        <div className="budget-empty">
          <p>No tienes presupuesto fijado. Define un máximo mensual y Orion te avisará cuando vayas a pasarte.</p>
          <button className="btn btn-secondary" onClick={startEdit}>
            Fijar presupuesto
          </button>
        </div>
      )}

      {editing && (
        <form className="budget-form" onSubmit={handleSave}>
          <label className="label">Importe máximo al mes</label>
          <div className="budget-input-row">
            <input
              className="input mono tabular"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500"
              autoFocus
            />
            <span className="budget-currency mono">€</span>
          </div>
          {err && <div className="error-banner" style={{ marginTop: 'var(--s-3)' }}>{err}</div>}
          <div className="budget-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !amount}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function NewCategoryForm({ onCancel, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('8B8B8B');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await api.createCategory({ name, color });
      onCreated();
    } catch (error) {
      setErr(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const palette = [
    '7B6F47', '4A5568', 'A8472C', '5D6B5C', '8B6F8E',
    'B8893E', '4A6670', '6B7B8C', 'A06B7E', '5C6B47',
  ];

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">Nueva categoría</h2>

        <label className="label">Nombre</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          maxLength={50}
        />

        <label className="label" style={{ marginTop: 'var(--s-4)' }}>Color</label>
        <div className="color-grid">
          {palette.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`color-swatch ${color === hex ? 'selected' : ''}`}
              style={{ background: `#${hex}` }}
              onClick={() => setColor(hex)}
            />
          ))}
        </div>

        {err && <div className="error-banner" style={{ marginTop: 'var(--s-3)' }}>{err}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !name}>
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
