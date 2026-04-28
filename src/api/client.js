const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'orion.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // Probablemente CORS o red caída
    throw new ApiError(
      `No se pudo conectar con la API en ${API_URL}. Revisa VITE_API_URL y que el backend esté levantado.`,
      0
    );
  }

  // Solo tratamos 401 como "sesión expirada" si NO es del endpoint de login
  // (en login un 401 significa "credencial inválida", no "tu sesión caducó").
  const isLoginAttempt = path === '/auth/google';

  if (res.status === 401 && !isLoginAttempt) {
    tokenStore.clear();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError('Sesión expirada', 401);
  }

  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Error ${res.status} en ${path}`,
      res.status,
      data?.details
    );
  }

  if (data == null) {
    throw new ApiError(`Respuesta vacía del servidor en ${path}`, res.status);
  }

  return data;
}

export const api = {
  // Auth
  loginWithGoogle: (idToken) => request('/auth/google', { method: 'POST', body: { idToken } }),
  me: () => request('/auth/me'),

  // Categorías
  listCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PATCH', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Gastos
  listExpenses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`);
  },
  createExpense: (data) => request('/expenses', { method: 'POST', body: data }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PATCH', body: data }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  suggestCategory: (description) =>
    request('/expenses/suggest', { method: 'POST', body: { description } }),
  dashboard: () => request('/expenses/dashboard'),

  // Presupuestos
  listBudgets: () => request('/budgets'),
  setBudget: (data) => request('/budgets', { method: 'POST', body: data }),
  clearBudget: (categoryId = 'global') => request(`/budgets/${categoryId || 'global'}`, { method: 'DELETE' }),
};
