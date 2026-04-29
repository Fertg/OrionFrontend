import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { QuickExpense } from '../components/QuickExpense.jsx';
import { ProgressRing } from '../components/ProgressRing.jsx';
import { Sparkline } from '../components/Sparkline.jsx';
import { useCountUp } from '../utils/useCountUp.js';
import {
  formatEur,
  splitEur,
  currentMonthLabel,
} from '../utils/format.js';
import './Dashboard.css';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [dash, cats, upcomingResp] = await Promise.all([
        api.dashboard(),
        api.listCategories(),
        api.upcomingRecurring(30).catch(() => ({ upcoming: [] })),
      ]);
      setData(dash);
      setCategories(cats.categories);
      setUpcoming(upcomingResp.upcoming || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="dashboard">
        <DashboardSkeleton />
      </div>
    );
  }
  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!data) return null;

  return (
    <div className="dashboard fade-in">
      <header className="dashboard-header">
        <div>
          <div className="month-label">{currentMonthLabel()}</div>
          <h1 className="dashboard-title">Resumen</h1>
        </div>
        <Sparkline
          values={buildDailySeries(data)}
          width={140}
          height={40}
          color="var(--ink-soft)"
          fill
        />
      </header>

      <QuickExpense categories={categories} onCreated={load} />

      <HeroCard data={data} />

      <StatGrid data={data} />

      <div className="dashboard-grid">
        <CategoryBreakdown data={data} />
        <PaceSection data={data} />
      </div>

      {upcoming.length > 0 && <UpcomingSection upcoming={upcoming} />}
    </div>
  );
}

/* ============= Hero Card con donut ============= */
function HeroCard({ data }) {
  const budget = data.monthlyBudgetCents;
  const spent = data.currentMonth.totalCents;
  const projected = data.currentMonth.projectedTotalCents;
  const { daysElapsed, daysInMonth } = data.period;
  const daysLeft = Math.max(0, daysInMonth - daysElapsed);

  const hasBudget = budget && budget > 0;
  const remaining = hasBudget ? budget - spent : 0;
  const overBudget = hasBudget && remaining < 0;
  const willOverBudget = hasBudget && !overBudget && projected > budget;

  const status = !hasBudget ? 'neutral' : overBudget ? 'over' : willOverBudget ? 'warn' : 'ok';
  const usedPct = hasBudget ? Math.min(100, (spent / budget) * 100) : 0;

  // Animación de números al cargar / actualizar
  const animatedSpent = useCountUp(spent);
  const animatedRemaining = useCountUp(Math.abs(remaining));

  if (!hasBudget) {
    return (
      <section className="hero-card hero-no-budget">
        <div className="hero-no-budget-content">
          <div className="hero-label">Gasto del mes</div>
          <div className="hero-amount-big mono tabular">
            {formatEur(animatedSpent)}
          </div>
          <Link to="/ajustes" className="hero-action">
            Fijar presupuesto mensual →
          </Link>
        </div>
      </section>
    );
  }

  const ringColor = `var(--ring-${status})`;

  return (
    <section className={`hero-card status-${status}`}>
      <div className="hero-ring">
        <ProgressRing
          value={usedPct}
          size={180}
          strokeWidth={10}
          color={ringColor}
          trackColor="var(--line)"
        >
          <div className="ring-pct mono tabular">{Math.round(usedPct)}<span>%</span></div>
          <div className="ring-pct-label">presupuesto</div>
        </ProgressRing>
      </div>

      <div className="hero-info">
        <div className="hero-row">
          <div className="hero-stat">
            <div className="hero-stat-label">Gastado</div>
            <div className="hero-stat-value hero-stat-spent mono tabular">
              {formatEur(animatedSpent, { withCents: false })}
            </div>
          </div>

          <div className="hero-divider" />

          <div className="hero-stat">
            <div className="hero-stat-label">{overBudget ? 'Excedido' : 'Te quedan'}</div>
            <div className={`hero-stat-value mono tabular hero-stat-remaining status-${status}`}>
              {overBudget && <span className="hero-sign">−</span>}
              {formatEur(animatedRemaining, { withCents: false })}
            </div>
          </div>
        </div>

        <div className="hero-budget-line mono tabular">
          de <strong>{formatEur(budget, { withCents: false })}</strong>
          <span className="hero-sep">·</span>
          día <strong>{daysElapsed}</strong> de {daysInMonth}
        </div>

        <HeroProjection
          status={status}
          remaining={remaining}
          projected={projected}
          budget={budget}
          daysLeft={daysLeft}
        />
      </div>
    </section>
  );
}

function HeroProjection({ status, remaining, projected, budget, daysLeft }) {
  if (status === 'over') {
    return (
      <div className="hero-projection over">
        <span className="proj-icon" />
        Has superado tu presupuesto en{' '}
        <strong className="mono tabular">{formatEur(Math.abs(remaining), { withCents: false })}</strong>
      </div>
    );
  }
  if (status === 'warn') {
    return (
      <div className="hero-projection warn">
        <span className="proj-icon" />
        A este ritmo cerrarás en{' '}
        <strong className="mono tabular">{formatEur(projected, { withCents: false })}</strong>
        {' '}— {formatEur(projected - budget, { withCents: false })} sobre límite
      </div>
    );
  }
  if (daysLeft === 0) {
    return (
      <div className="hero-projection ok">
        <span className="proj-icon" />
        Mes cerrado con {formatEur(remaining, { withCents: false })} de margen
      </div>
    );
  }
  const safeDaily = remaining / daysLeft;
  return (
    <div className="hero-projection ok">
      <span className="proj-icon" />
      Puedes gastar{' '}
      <strong className="mono tabular">{formatEur(safeDaily, { withCents: false })}</strong>
      {' '}al día durante {daysLeft} días
    </div>
  );
}

/* ============= Grid de stats ============= */
function StatGrid({ data }) {
  const { currentMonth, period, deltaVsPreviousPct, monthlyBudgetCents } = data;
  const hasDelta = deltaVsPreviousPct !== null && Number.isFinite(deltaVsPreviousPct);
  const hasBudget = monthlyBudgetCents && monthlyBudgetCents > 0;
  const remaining = hasBudget ? monthlyBudgetCents - currentMonth.totalCents : null;
  const daysLeft = Math.max(0, period.daysInMonth - period.daysElapsed);

  return (
    <div className="stat-grid">
      <StatCard
        label="Diario medio"
        value={formatEur(currentMonth.dailyAverageCents, { withCents: false })}
        delta={hasDelta ? deltaVsPreviousPct : null}
        deltaLabel="vs mes anterior"
      />
      <StatCard
        label="Proyección fin de mes"
        value={formatEur(currentMonth.projectedTotalCents, { withCents: false })}
        sub={hasBudget ?
          (currentMonth.projectedTotalCents > monthlyBudgetCents
            ? `+${formatEur(currentMonth.projectedTotalCents - monthlyBudgetCents, { withCents: false })} sobre límite`
            : `${formatEur(monthlyBudgetCents - currentMonth.projectedTotalCents, { withCents: false })} bajo límite`)
          : null
        }
        subTone={hasBudget && currentMonth.projectedTotalCents > monthlyBudgetCents ? 'negative' : 'positive'}
      />
      <StatCard
        label="Días restantes"
        value={String(daysLeft)}
        sub={`de ${period.daysInMonth} días totales`}
      />
      {hasBudget && (
        <StatCard
          label={remaining < 0 ? 'Excedido' : 'Margen restante'}
          value={formatEur(Math.abs(remaining), { withCents: false })}
          tone={remaining < 0 ? 'negative' : 'neutral'}
          sub={remaining >= 0 && daysLeft > 0
            ? `≈ ${formatEur(remaining / daysLeft, { withCents: false })}/día`
            : null
          }
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, subTone, delta, deltaLabel, tone = 'neutral' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value mono tabular">{value}</div>
      {delta !== null && delta !== undefined && (
        <div className={`stat-card-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}% <span>{deltaLabel}</span>
        </div>
      )}
      {sub && <div className={`stat-card-sub ${subTone || ''}`}>{sub}</div>}
    </div>
  );
}

/* ============= Ritmo (gráfico de barras del mes) ============= */
function PaceSection({ data }) {
  const { period, dailyTotals } = data;
  const elapsed = period.daysElapsed;
  const total = period.daysInMonth;
  const elapsedPct = (elapsed / total) * 100;
  const maxDay = Math.max(1, ...dailyTotals.map((d) => d.totalCents));

  return (
    <section className="panel-block">
      <h2 className="block-title">Actividad diaria</h2>

      <div className="pace-chart" aria-label="Gasto diario del mes">
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const dayStr = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const point = dailyTotals.find((d) => d.day === dayStr);
          const value = point?.totalCents || 0;
          const heightPct = maxDay > 0 ? (value / maxDay) * 100 : 0;
          const isFuture = day > elapsed;
          const isToday = day === elapsed;
          return (
            <div
              key={day}
              className={`pace-bar ${isFuture ? 'future' : ''} ${isToday ? 'today' : ''}`}
              style={{ height: `${Math.max(2, heightPct)}%` }}
              title={value > 0 ? `${formatEur(value)} · día ${day}` : `día ${day}`}
            />
          );
        })}
      </div>

      <div className="pace-axis">
        <span>1</span>
        <span>{Math.floor(total / 2)}</span>
        <span>{total}</span>
      </div>

      <div className="pace-progress">
        <div className="pace-progress-bar">
          <div
            className="pace-progress-fill"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
        <div className="pace-progress-text">
          {Math.round(elapsedPct)}% del mes
        </div>
      </div>
    </section>
  );
}

/* ============= Distribución por categoría ============= */
function CategoryBreakdown({ data }) {
  const total = data.currentMonth.totalCents;
  const items = data.byCategory.filter((c) => c.totalCents > 0);

  return (
    <section className="panel-block">
      <h2 className="block-title">Por categoría</h2>

      {items.length === 0 ? (
        <div className="empty-state">Aún no hay gastos este mes</div>
      ) : (
        <ul className="cat-list">
          {items.map((c) => {
            const pct = total > 0 ? (c.totalCents / total) * 100 : 0;
            return (
              <li key={c.id} className="cat-row">
                <div className="cat-row-head">
                  <div className="cat-row-name">
                    <span className="cat-dot" style={{ background: `#${c.color}` }} />
                    <span>{c.name}</span>
                    <span className="cat-row-count mono">{c.count}</span>
                  </div>
                  <div className="cat-row-amount mono tabular">
                    {formatEur(c.totalCents, { withCents: false })}
                  </div>
                </div>
                <div className="cat-row-bar">
                  <div
                    className="cat-row-fill"
                    style={{ width: `${pct}%`, background: `#${c.color}` }}
                  />
                </div>
                <div className="cat-row-pct mono">{pct.toFixed(0)}%</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ============= Próximos cargos ============= */
function UpcomingSection({ upcoming }) {
  const total = upcoming.reduce((s, u) => s + Number(u.amount_cents), 0);

  return (
    <section className="panel-block upcoming-section">
      <div className="upcoming-head">
        <h2 className="block-title">Próximos cargos · 30 días</h2>
        <div className="upcoming-total mono tabular">
          {formatEur(total, { withCents: false })}
        </div>
      </div>
      <ul className="upcoming-list">
        {upcoming.map((u) => (
          <li key={u.id} className="upcoming-row">
            <div className="upcoming-date mono">
              {formatUpcomingDate(u.next_date)}
            </div>
            <span
              className="cat-dot"
              style={{ background: `#${u.category_color || '8B8B8B'}` }}
            />
            <div className="upcoming-name">{u.description}</div>
            <div className="upcoming-amount mono tabular">{formatEur(u.amount_cents)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============= Skeleton ============= */
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-line w-80" />
      <div className="skeleton-line w-200 h-32" style={{ marginTop: 'var(--s-2)' }} />
      <div className="skeleton-input" />
      <div className="skeleton-hero" />
      <div className="skeleton-stats">
        <div className="skeleton-stat" />
        <div className="skeleton-stat" />
        <div className="skeleton-stat" />
        <div className="skeleton-stat" />
      </div>
    </div>
  );
}

/* ============= Helpers ============= */
function buildDailySeries(data) {
  const { period, dailyTotals } = data;
  const series = [];
  for (let day = 1; day <= period.daysElapsed; day++) {
    const dayStr = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const point = dailyTotals.find((d) => d.day === dayStr);
    series.push((point?.totalCents || 0) / 100);
  }
  return series;
}

function formatUpcomingDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  })();
  if (iso === today) return 'hoy';
  if (iso === tomorrow) return 'mañana';
  return `${d} ${months[m - 1]}`;
}
