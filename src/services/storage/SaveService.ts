import {
  createDefaultSave,
  normalizeSave,
  type GameSave,
} from '../../domain/saving/saveModel';

const DATABASE_NAME = 'ultima-companhia';
const STORE_NAME = 'progress';
const SAVE_KEY = 'primary';
const FALLBACK_KEY = 'ultima-companhia-save';

export class SaveService {
  public async load(): Promise<GameSave> {
    try {
      const stored = await this.readIndexedDb();
      if (stored) {
        return normalizeSave(stored);
      }
    } catch {
      const fallback = localStorage.getItem(FALLBACK_KEY);
      if (fallback) {
        return normalizeSave(JSON.parse(fallback) as unknown);
      }
    }

    const fresh = createDefaultSave();
    await this.save(fresh);
    return fresh;
  }

  public async save(value: GameSave): Promise<void> {
    const normalized = normalizeSave(value);
    try {
      await this.writeIndexedDb(normalized);
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(normalized));
    } catch {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(normalized));
    }
  }

  public export(value: GameSave): Blob {
    return new Blob([JSON.stringify(normalizeSave(value), null, 2)], {
      type: 'application/json',
    });
  }

  public async import(file: File): Promise<GameSave> {
    if (file.size > 256_000) {
      throw new Error('O arquivo de save ultrapassa 256 KB.');
    }
    const parsed = JSON.parse(await file.text()) as unknown;
    const normalized = normalizeSave(parsed);
    await this.save(normalized);
    return normalized;
  }

  private async readIndexedDb(): Promise<unknown> {
    const database = await this.openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result as unknown);
      request.onerror = () => reject(request.error ?? new Error('Falha ao ler o save.'));
      transaction.oncomplete = () => database.close();
    });
  }

  private async writeIndexedDb(value: GameSave): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, SAVE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('Falha ao gravar o save.'));
      };
      transaction.onabort = transaction.onerror;
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB não está disponível.'));
    });
  }
}
