import { CATEGORIES } from '../finance.js';

const STORAGE_KEY = 'mi-billetera-lite:expenses:v1';

export function createExpenseStorage(storage) {
  return {
    loadExpenses: () => loadExpenses(storage),
    saveExpenses: expenses => storage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  };
}

async function loadExpenses(storage) {
  const saved = await storage.getItem(STORAGE_KEY);
  if (saved === null) return [];
  const expenses = JSON.parse(saved);
  if (!Array.isArray(expenses) || expenses.some(expense => (
    !expense || typeof expense.id !== 'string' || !expense.id.trim() ||
    typeof expense.concept !== 'string' || !expense.concept.trim() || expense.concept.length > 80 ||
    !Number.isSafeInteger(expense.amountCents) || expense.amountCents <= 0 || expense.amountCents > 9999999999 ||
    !CATEGORIES.includes(expense.category) || typeof expense.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(expense.createdAt))
  ))) throw new Error('El historial guardado no es valido.');
  return expenses.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}