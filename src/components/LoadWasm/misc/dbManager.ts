export enum ObjectStore {
  TRANSACTION = "transaction",
  BLOCK_BODIES = "blockBodies",
  BLOCK_HEADERS = "blockHeaders",
  MEMPOOL = "mempool",
}

export class DBManager {
  public async iterateAll(
    objStore: ObjectStore,
    f: (key: string, value: any) => void,
  ): Promise<void> {
    const tx = await this.open(objStore, "readonly");
    const storage = tx.objectStore(objStore);
    const req = storage.openCursor();

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve();

        f(cursor.key as string, cursor.value);

        cursor.continue();
      };
    });
  }

  public async insert(objStore: ObjectStore, key: string, val: string) {
    await this.withTx(objStore, "readwrite", (tx: IDBTransaction) => {
      const storage = tx.objectStore(objStore);
      storage.add(JSON.parse(val), key);
    });
  }

  private async withTx(
    objStore: ObjectStore,
    mode: IDBTransactionMode,
    f: (tx: IDBTransaction) => Promise<void> | void,
  ): Promise<void> {
    const tx = await this.open(objStore, mode);
    try {
      await f(tx);
    } catch (e) {
      tx.abort();
      throw e;
    }
    tx.commit();
  }

  private open(objStore: ObjectStore, mode: IDBTransactionMode): Promise<IDBTransaction> {
    return new Promise((resolve) => {
      const request = indexedDB.open(objStore);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(objStore, mode);
        resolve(tx);
      };
    });
  }
}
