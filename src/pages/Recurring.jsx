import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { formatEur, parseAmountToCents } from '../utils/format.js';
import './Recurring.css';

export function RecurringPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([
        api.listRecurring(),
        categories.length === 0 ? api.listCategories() : Promise.resolve(null),
      ]);
      setItems(list.recurring);
      if (cats) setCategories(cats.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categories.length]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    await api.toggleRecurring(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta suscripción? Los gastos ya creados no se borrarán.')) return;
    await api.deleteRecurring(id);
    load();
  };

  if (loading) return <div className="loading">Cargando</div>;

  const active = items.filter((i) => !i.paused_at);
  const paused = items.filter((i) => i.paused_at);
  const monthlyTotal = active.reduce((s, i) => s + Number(i.amount_cents), 0);

  return (
    <div className="recurring fade-in">
      <header className="recurring-header">
        <div>
          <h1 className="recurring-title">Suscripciones</h1>
          <p className="recurring-sub">
            Cargos automáticos cada mes. Orion los crea solo en su día.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Nueva
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {active.length > 0 && (
        <div className="rec-summary">
          <div className="rec-summary-item">
            <div className="rec-summary-label">Activas</div>
            <div className="rec-summary-value mono tabular">{active.length}</div>
          </div>
          <div className="rec-summary-item">
            <div className="rec-summary-label">Coste mensual</div>
            <div className="rec-summary-value mono tabular">
              {formatEur(monthlyTotal, { withCents: false })}
            </div>
          </div>
          <div className="rec-summary-item">
            <div className="rec-summary-label">Coste anual</div>
            <div className="rec-summary-value mono tabular muted">
              {formatEur(monthlyTotal * 12, { withCents: false })}
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Aún no tienes suscripciones registradas.</p>
          <p className="empty-hint">
            Añade tus servicios fijos (Spotify, gimnasio, seguros…) y Orion creará el gasto cada mes en su día.
          </p>
        </div>
      ) : (
        <>
          <RecList items={active} onEdit={setEditing} onToggle={handleToggle} onDelete={handleDelete} />
          {paused.length > 0 && (
            <>
              <h2 className="rec-section-title">Pausadas</h2>
              <RecList items={paused} onEdit={setEditing} onToggle={handleToggle} onDelete={handleDelete} dimmed />
            </>
          )}
        </>
      )}

      {editing && (
        <RecurringForm
          item={editing === 'new' ? null : editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ============= Lista ============= */
function RecList({ items, onEdit, onToggle, onDelete, dimmed }) {
  return (
    <ul className={`rec-list ${dimmed ? 'dimmed' : ''}`}>
      {items.map((r) => (
        <li key={r.id} className="rec-row">
          <div className="rec-day mono">
            <span className="rec-day-num">{r.day_of_month}</span>
            <span className="rec-day-label">cada mes</span>
          </div>
          <div className="rec-content">
            <div className="rec-name">{r.description}</div>
            <div className="rec-meta">
              {r.category_name && (
                <span className="rec-cat">
                  <span className="cat-dot" style={{ background: `#${r.category_color || '8B8B8B'}` }} />
                  {r.category_name}
                </span>
              )}
            </div>
          </div>
          <div className="rec-amount mono tabular">{formatEur(r.amount_cents)}</div>
          <div className="rec-actions">
            <button className="rec-action" onClick={() => onEdit(r)} title="Editar">
              ✎
            </button>
            <button
              className="rec-action"
              onClick={() => onToggle(r.id)}
              title={r.paused_at ? 'Reanudar' : 'Pausar'}
            >
              {r.paused_at ? '▶' : '⏸'}
            </button>
            <button className="rec-action rec-action-delete" onClick={() => onDelete(r.id)} title="Eliminar">
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============= Formulario ============= */
function RecurringForm({ item, categories, onCancel, onSaved }) {
  const isEdit = !!item;
  const [description, setDescription] = useState(item?.description || '');
  const [amount, setAmount] = useState(
    item ? String(item.amount_cents / 100).replace('.', ',') : ''
  );
  const [day, setDay] = useState(item?.day_of_month || new Date().getDate());
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!cents) {
      setErr('Importe inválido');
      return;
    }
    if (!description.trim()) {
      setErr('Descripción requerida');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload = {
        description: description.trim(),
        amountCents: cents,
        dayOfMonth: parseInt(day, 10),
        categoryId: categoryId || null,
      };
      if (isEdit) {
        await api.updateRecurring(item.id, payload);
      } else {
        await api.createRecurring(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">{isEdit ? 'Editar suscripción' : 'Nueva suscripción'}</h2>

        <label className="label">Descripción</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Spotify, Gimnasio, Netflix…"
          autoFocus
          required
          maxLength={100}
        />

        <div className="form-row">
          <div className="form-col">
            <label className="label" style={{ marginTop: 'var(--s-4)' }}>Importe</label>
            <input
              className="input mono tabular"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="9,99"
              required
            />
          </div>
          <div className="form-col">
            <label className="label" style={{ marginTop: 'var(--s-4)' }}>Día del mes</label>
            <input
              className="input mono tabular"
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
            />
          </div>
        </div>

        <label className="label" style={{ marginTop: 'var(--s-4)' }}>Categoría</label>
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {err && <div className="error-banner" style={{ marginTop: 'var(--s-3)' }}>{err}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
