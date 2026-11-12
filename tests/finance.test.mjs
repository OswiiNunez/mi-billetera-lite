import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, validateExpense, summarize } from '../finance.js';

test('registra montos en centavos, incluyendo coma decimal', () => {
  assert.equal(parseAmount('45.50'), 4550);
  assert.equal(parseAmount('150'), 15000);
  assert.equal(parseAmount('0,01'), 1);
  assert.equal(parseAmount('99999999.99'), 9999999999);
});
test('rechaza cero, negativos, notación exponencial y precisión inválida', () => {
  for (const invalid of ['', '0', '-10', '1.001', '1e2', 'NaN', 'Infinity', '100000000', '1,234.50']) {
    assert.equal(parseAmount(invalid), null, invalid);
  }
});
test('valida concepto y categorías sin interpretar HTML', () => {
  assert.throws(() => validateExpense('  ', '10', 'Comida'));
  assert.throws(() => validateExpense('x'.repeat(81), '10', 'Comida'));
  assert.throws(() => validateExpense('Café', '10', 'Inexistente'));
  const expense = validateExpense(' <b>Café</b> ', '45,5', 'Comida');
  assert.equal(expense.concept, '<b>Café</b>');
  assert.equal(expense.amountCents, 4550);
  assert.ok(Number.isFinite(Date.parse(expense.createdAt)));
});
test('el total y las categorías no pierden centavos; hoy respeta la fecha local', () => {
  const now = new Date(2026, 10, 10, 12);
  const today = now.toISOString();
  const yesterday = new Date(2026, 10, 9, 12).toISOString();
  const result = summarize([
    { amountCents: parseAmount('0.10'), category: 'Comida', createdAt: today },
    { amountCents: parseAmount('0.20'), category: 'Comida', createdAt: today },
    { amountCents: 15000, category: 'Transporte', createdAt: yesterday }
  ], now);
  assert.equal(result.total, 15030);
  assert.equal(result.today, 30);
  assert.equal(result.categories.Comida, 30);
  assert.equal(result.categories.Transporte, 15000);
  assert.equal(result.count, 3);
});
