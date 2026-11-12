import { CATEGORIES, formatMoney, validateExpense, summarize } from './finance.js';
import { getExpenses, addExpense, deleteExpense } from './db.js';

const $ = id => document.getElementById(id);
const form = $('expense-form');
const saveButton = $('save-button');
let expenses = [];
let installPrompt = null;
let toastTimer;
let undoExpense = null;
let isSaving = false;
let midnightTimer;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('mi-billetera-lite') : null;
const categoryStyles = {
  Comida: { color: '#a16c32', bg: '#f8efdd', path: '<path d="M5 3v6m3-6v6M3 6h7M6.5 9v12M17 3c-4 4-4 9 0 9h2V3h-2Zm2 9v9"/>' },
  Transporte: { color: '#5b79a5', bg: '#eaf0f9', path: '<path d="m5 8 2-5h10l2 5M4 8h16v10H4V8Zm0 6h16M7 18v3m10-3v3M7 11h.01M17 11h.01"/>' },
  Servicios: { color: '#a98b36', bg: '#f7f1df', path: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>' },
  Ocio: { color: '#9070a7', bg: '#f0eaf7', path: '<path d="M7 7h10c3 0 5 9 3 11-1 1-4-2-5-3H9c-1 1-4 4-5 3C2 16 4 7 7 7Zm0 3v4m-2-2h4m6-1h.01m3 2h.01"/>' },
  Otros: { color: '#638570', bg: '#eaf1e8', path: '<path d="M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4Z"/>' }
};

function categoryIcon(category) {
  const style = categoryStyles[category];
  const icon = document.createElement('span');
  icon.className = 'category-symbol';
  icon.style.setProperty('--category-color', style.color);
  icon.style.setProperty('--category-bg', style.bg);
  icon.setAttribute('aria-hidden', 'true');
  // Solo contiene SVG constantes definidos en esta aplicación; nunca datos del usuario.
  icon.innerHTML = `<svg viewBox="0 0 24 24">${style.path}</svg>`;
  return icon;
}

function showToast(message, deletedExpense = null) {
  clearTimeout(toastTimer);
  undoExpense = deletedExpense;
  $('toast-message').textContent = message;
  $('undo-button').hidden = !deletedExpense;
  $('toast').hidden = false;
  toastTimer = setTimeout(closeToast, deletedExpense ? 10000 : 5000);
}

function closeToast() {
  $('toast').hidden = true;
  undoExpense = null;
  clearTimeout(toastTimer);
}

function showFormError(message) {
  $('form-error').textContent = message;
  $('form-error').hidden = !message;
}

function showHistoryError(message) {
  $('history-error').textContent = message;
  $('history-error').hidden = !message;
}

function renderSummary() {
  const summary = summarize(expenses);
  $('total-amount').textContent = formatMoney(summary.total);
  $('today-amount').textContent = formatMoney(summary.today);
  $('expense-count').textContent = summary.count;
  $('count-caption').textContent = summary.count ? 'Cada registro cuenta' : 'Aquí empieza tu historial';
  $('history-count').textContent = `${summary.count} ${summary.count === 1 ? 'gasto' : 'gastos'}`;
  const fragment = document.createDocumentFragment();
  for (const category of CATEGORIES) {
    const value = summary.categories[category];
    const row = document.createElement('div');
    row.className = 'category-row';
    row.append(categoryIcon(category));
    const details = document.createElement('div');
    details.className = 'category-details';
    const topline = document.createElement('div');
    topline.className = 'category-topline';
    const label = document.createElement('span');
    label.textContent = category;
    const total = document.createElement('strong');
    total.textContent = formatMoney(value);
    topline.append(label, total);
    const bar = document.createElement('div');
    bar.className = 'category-bar';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.style.width = `${summary.total ? value / summary.total * 100 : 0}%`;
    fill.style.backgroundColor = categoryStyles[category].color;
    bar.append(fill);
    details.append(topline, bar);
    row.append(details);
    fragment.append(row);
  }
  $('category-summary').replaceChildren(fragment);
}

function renderHistory() {
  const query = $('search').value.trim().toLocaleLowerCase('es-MX');
  const category = $('filter-category').value;
  const filtered = expenses.filter(expense => (!category || expense.category === category) && expense.concept.toLocaleLowerCase('es-MX').includes(query));
  $('empty-state').hidden = expenses.length > 0;
  const fragment = document.createDocumentFragment();
  for (const expense of filtered) {
    const item = document.createElement('li');
    item.className = 'expense-item';
    item.append(categoryIcon(expense.category));
    const info = document.createElement('div');
    info.className = 'expense-info';
    const concept = document.createElement('p');
    concept.className = 'expense-concept';
    concept.textContent = expense.concept;
    const meta = document.createElement('p');
    meta.className = 'expense-meta';
    const date = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(expense.createdAt));
    meta.textContent = `${expense.category} · ${date}`;
    info.append(concept, meta);
    const amount = document.createElement('span');
    amount.className = 'expense-amount';
    amount.textContent = formatMoney(expense.amountCents);
    const remove = document.createElement('button');
    remove.className = 'delete-button';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Eliminar gasto: ${expense.concept}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/></svg>';
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      try {
        await deleteExpense(expense.id);
        expenses = expenses.filter(record => record.id !== expense.id);
        render();
        channel?.postMessage('changed');
        showToast('Gasto eliminado.', expense);
      } catch { showToast('No se pudo eliminar el gasto. Inténtalo de nuevo.'); remove.disabled = false; }
    });
    item.append(info, amount, remove);
    fragment.append(item);
  }
  $('expense-list').replaceChildren(fragment);
  const filtering = Boolean(query || category);
  $('filter-message').hidden = !filtering || !expenses.length;
  $('filter-message').textContent = filtered.length
    ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}. El total superior incluye todos tus gastos.`
    : 'No hay gastos que coincidan con tu búsqueda.';
}

function render() { renderSummary(); renderHistory(); }

async function refresh() {
  expenses = await getExpenses();
  showHistoryError('');
  render();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (isSaving) return;
  showFormError('');
  let expense;
  try { expense = validateExpense($('concept').value, $('amount').value, $('category').value); }
  catch (error) { showFormError(error.message); return; }
  isSaving = true;
  saveButton.disabled = true;
  try {
    const id = await addExpense(expense);
    expenses.unshift({ ...expense, id });
    form.reset();
    render();
    channel?.postMessage('changed');
    showToast('Gasto guardado en tu dispositivo.');
    $('concept').focus();
  } catch {
    showFormError('No se pudo guardar. Revisa que el navegador permita almacenamiento y tenga espacio disponible. Tus datos del formulario siguen aquí.');
  } finally { isSaving = false; saveButton.disabled = false; }
});

$('search').addEventListener('input', renderHistory);
$('filter-category').addEventListener('change', renderHistory);
$('toast-close').addEventListener('click', closeToast);
$('undo-button').addEventListener('click', async () => {
  if (!undoExpense) return;
  const expense = undoExpense;
  undoExpense = null;
  $('undo-button').disabled = true;
  try {
    await addExpense(expense);
    await refresh();
    channel?.postMessage('changed');
    showToast('Gasto restaurado.');
  } catch { showToast('No se pudo restaurar. Actualiza el historial e inténtalo de nuevo.'); }
  finally { $('undo-button').disabled = false; }
});

function updateConnection() {
  const online = navigator.onLine;
  $('connection-status').classList.toggle('offline', !online);
  $('connection-status').lastElementChild.textContent = online ? 'En línea' : 'Sin conexión';
  $('connection-status').setAttribute('aria-label', online ? 'Con conexión a internet' : 'Sin conexión a internet');
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();

function updateDate() {
  const now = new Date();
  $('current-date').textContent = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const next = new Date(now);
  next.setHours(24, 0, 0, 10);
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(() => { updateDate(); renderSummary(); }, next - now);
}
updateDate();

channel?.addEventListener('message', () => refresh().catch(() => showHistoryError('No se pudo actualizar el historial. Recarga la página.')));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateDate();
    refresh().catch(() => showHistoryError('No se pudo leer el historial. Recarga la página.'));
  }
});

function updateInstallButton() {
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('install-button').hidden = Boolean(installed);
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = null; updateInstallButton(); showToast('Mi Billetera Lite ya está instalada.'); });
window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstallButton);
updateInstallButton();
$('install-button').addEventListener('click', async () => {
  if (!installPrompt) { $('install-dialog').showModal(); return; }
  const prompt = installPrompt;
  installPrompt = null;
  try { await prompt.prompt(); await prompt.userChoice; }
  catch { $('install-dialog').showModal(); }
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    $('offline-note').textContent = 'Lista para usarse sin conexión. Todo queda en este dispositivo.';
  });
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    if (navigator.serviceWorker.controller) $('offline-note').textContent = 'Lista para usarse sin conexión. Todo queda en este dispositivo.';
  }).catch(() => {
    $('offline-note').textContent = 'No se pudo preparar el modo offline. Recarga con conexión.';
  });
} else {
  $('offline-note').textContent = 'Para activar el modo offline, abre la app con HTTPS o localhost.';
}

try { await refresh(); saveButton.disabled = false; }
catch {
  render();
  $('empty-state').hidden = true;
  showFormError('No se pudo abrir el almacenamiento local. Habilita los datos del sitio y recarga para registrar gastos.');
  showHistoryError('No se pudo leer el historial de este dispositivo.');
}
