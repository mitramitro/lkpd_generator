// Backend penyimpanan key-value yang dipakai repository. Abstraction ini
// memungkinkan repository diuji di Node (memory backend) tanpa perlu browser,
// sekaligus memakai IndexedDB asli di browser.

export interface DbBackend {
  get<T>(store: string, key: string): Promise<T | undefined>
  put<T>(store: string, value: T, key?: string): Promise<void>
  delete(store: string, key: string): Promise<void>
  getAll<T>(store: string): Promise<T[]>
}

const DB_NAME = 'lkpd-builder'
const DB_VERSION = 1
const STORES = ['documents', 'images', 'meta']

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB
    if (!idb) {
      reject(new Error('IndexedDB tidak tersedia'))
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = idb.open(DB_NAME, DB_VERSION)
    } catch (error) {
      reject(error instanceof Error ? error : new Error('IndexedDB tidak tersedia'))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      for (const storeName of STORES) {
        if (db.objectStoreNames.contains(storeName)) continue
        if (storeName === 'documents') db.createObjectStore(storeName, { keyPath: 'id' })
        else if (storeName === 'images') db.createObjectStore(storeName, { keyPath: 'id' })
        else db.createObjectStore(storeName, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Gagal membuka IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB diblokir'))
  })
}

export class IndexedDbBackend implements DbBackend {
  private readonly database: Promise<IDBDatabase>

  constructor(database: Promise<IDBDatabase>) {
    this.database = database
  }

  static async open(): Promise<IndexedDbBackend> {
    const database = await openDatabase()
    return new IndexedDbBackend(Promise.resolve(database))
  }

  private async ready(): Promise<IDBDatabase> {
    return this.database
  }

  private static requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Operasi IndexedDB gagal'))
    })
  }

  async get<T>(store: string, key: string): Promise<T | undefined> {
    const db = await this.ready()
    const transaction = db.transaction(store, 'readonly')
    return IndexedDbBackend.requestToPromise(transaction.objectStore(store).get(key)) as Promise<T | undefined>
  }

  // Object store memakai in-line keys (keyPath) sehingga key parameter tidak
  // boleh diberikan — nilai sudah membawa kuncinya sendiri.
  async put<T>(store: string, value: T, _key?: string): Promise<void> {
    const db = await this.ready()
    const transaction = db.transaction(store, 'readwrite')
    await IndexedDbBackend.requestToPromise(transaction.objectStore(store).put(value))
  }

  async delete(store: string, key: string): Promise<void> {
    const db = await this.ready()
    const transaction = db.transaction(store, 'readwrite')
    await IndexedDbBackend.requestToPromise(transaction.objectStore(store).delete(key))
  }

  async getAll<T>(store: string): Promise<T[]> {
    const db = await this.ready()
    const transaction = db.transaction(store, 'readonly')
    return IndexedDbBackend.requestToPromise(transaction.objectStore(store).getAll()) as Promise<T[]>
  }
}

// Backend in-memory untuk test (Node). Tidak digunakan di aplikasi browser.
export class MemoryDbBackend implements DbBackend {
  private readonly data = new Map<string, Map<string, unknown>>()

  private storeMap(store: string): Map<string, unknown> {
    let map = this.data.get(store)
    if (!map) {
      map = new Map()
      this.data.set(store, map)
    }
    return map
  }

  async get<T>(store: string, key: string): Promise<T | undefined> {
    return this.storeMap(store).get(key) as T | undefined
  }

  async put<T>(store: string, value: T, key?: string): Promise<void> {
    const map = this.storeMap(store)
    if (key === undefined) {
      const record = value as Record<string, unknown>
      const recordKey = record['id'] ?? record['key']
      if (recordKey === undefined) throw new Error('Value harus memiliki key "id" atau "key"')
      map.set(String(recordKey), value)
    } else {
      map.set(key, value)
    }
  }

  async delete(store: string, key: string): Promise<void> {
    this.storeMap(store).delete(key)
  }

  async getAll<T>(store: string): Promise<T[]> {
    return Array.from(this.storeMap(store).values()) as T[]
  }

  clear(): void {
    this.data.clear()
  }
}
