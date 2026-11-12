export const CATEGORIES = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Otros'];
export const formatMoney = (cents) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(cents / 100);

// Guardamos centavos enteros para evitar errores como 0.1 + 0.2.
export function parseAmount(value) {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents > 0 && Number.isSafeInteger(cents) ? cents : null;
}

export function validateExpense(concept, amount, category) {
  const cleanConcept = String(concept).trim();
  if (!cleanConcept || cleanConcept.length > 80) throw new Error('Escribe un concepto de 1 a 80 caracteres.');
  const amountCents = parseAmount(amount);
  if (amountCents === null) throw new Error('Escribe un monto mayor a 0, de hasta 99,999,999.99 y con máximo 2 decimales.');
  if (!CATEGORIES.includes(category)) throw new Error('Selecciona una categoría para tu gasto.');
  return { concept: cleanConcept, amountCents, category, createdAt: new Date().toISOString() };
}

export function summarize(expenses, now = new Date()) {
  const categories = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  let total = 0, today = 0;
  for (const expense of expenses) {
    total += expense.amountCents;
    if (new Date(expense.createdAt).toDateString() === now.toDateString()) today += expense.amountCents;
    categories[expense.category] += expense.amountCents;
  }
  return { total, today, categories, count: expenses.length };
}
