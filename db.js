const DB_NAME = 'mi-billetera-lite';
const STORE_NAME = 'expenses';
let databasePromise;

export function openDatabase() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB no está disponible en este navegador.')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
    request.onerror = () => { databasePromise = undefined; reject(request.error); };
    request.onblocked = () => { databasePromise = undefined; reject(new Error('Cierra las otras pestañas de la app y vuelve a abrirla.')); };
  });
  return databasePromise;
}

async function operation(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    let request;
    try { request = action(transaction.objectStore(STORE_NAME)); }
    catch (error) { reject(error); return; }
    // Resolver al confirmar la transacción, nunca antes de que el dato sea durable.
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error || request.error);
    transaction.onabort = () => reject(transaction.error || new Error('No se pudo completar el guardado.'));
  });
}

export const getExpenses = async () => {
  const expenses = await operation('readonly', store => store.getAll());
  return expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
};
export const addExpense = expense => operation('readwrite', store => store.add(expense));
export const deleteExpense = id => operation('readwrite', store => store.delete(id));
