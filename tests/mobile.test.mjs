import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpenseStorage } from '../mobile/storage.js';

const older = { id: 'one', concept: 'Cafe', amountCents: 4550, category: 'Comida', createdAt: '2026-11-10T12:00:00.000Z' };
const newer = { id: 'two', concept: 'Taxis', amountCents: 15000, category: 'Transporte', createdAt: '2026-11-11T12:00:00.000Z' };

test('almacenamiento movil conserva gastos al volver a abrir y ordena los recientes primero', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); }
  };
  const firstSession = createExpenseStorage(storage);
  assert.deepEqual(await firstSession.loadExpenses(), []);
  await firstSession.saveExpenses([older, newer]);
  const reopened = createExpenseStorage(storage);
  assert.deepEqual(await reopened.loadExpenses(), [newer, older]);
  await reopened.saveExpenses([older]);
  assert.deepEqual(await reopened.loadExpenses(), [older]);
});

test('almacenamiento movil rechaza historial corrupto sin sobrescribirlo', async () => {
  for (const raw of ['invalid json', '{}', JSON.stringify([{ ...older, amountCents: -1 }]), JSON.stringify([{ ...older, category: 'Invalida' }])]) {
    let writes = 0;
    const repository = createExpenseStorage({
      async getItem() { return raw; },
      async setItem() { writes++; }
    });
    await assert.rejects(repository.loadExpenses());
    assert.equal(writes, 0);
  }
});

test('almacenamiento movil propaga errores de escritura', async () => {
  const repository = createExpenseStorage({ async setItem() { throw new Error('Sin espacio'); } });
  await assert.rejects(repository.saveExpenses([older]), /Sin espacio/);
});