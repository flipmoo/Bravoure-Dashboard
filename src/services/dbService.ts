import type { GrippProject } from '../types/gripp';

const DB_NAME = 'bravoure-dashboard';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const CACHE_STORE = 'cache';

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }

        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getAllProjects(): Promise<GrippProject[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(PROJECTS_STORE, 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveProjects(projects: GrippProject[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(PROJECTS_STORE, 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);

      const timestamp = new Date().toISOString();
      projects.forEach(project => {
        const enhancedProject = {
          ...project,
          lastModified: timestamp
        };
        store.put(enhancedProject);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getLastModified(): Promise<string | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(PROJECTS_STORE, 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const index = store.index('lastModified');
      const request = index.openCursor(null, 'prev');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value.lastModified);
        } else {
          resolve(null);
        }
      };
    });
  }

  async setItem<T>(key: string, value: T & { timestamp: number }): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      const request = store.put({
        key,
        ...value
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE, 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key: _, ...value } = result;
          resolve(value as T);
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearDatabase(): Promise<void> {
    if (!this.db) await this.init();
    return Promise.all([
      new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(PROJECTS_STORE, 'readwrite');
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(CACHE_STORE, 'readwrite');
        const store = transaction.objectStore(CACHE_STORE);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      })
    ]).then(() => undefined);
  }
}

export const dbService = new DatabaseService(); 
