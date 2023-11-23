package storage

import (
	"context"
	"errors"
	"sync"

	"github.com/hack-pad/go-indexeddb/idb"
	errs "github.com/pkg/errors"
)

const (
	ObjStoreTransaction = "transaction"
	ObjStoreBlockBody   = "blockBodies"
	ObjStoreBlockHeader = "blockHeaders"
	ObjStoreMempool     = "mempool"
)

var db *idb.Database
var once sync.Once

func getDB() *idb.Database {
	once.Do(func() {
		if err := initDB(context.Background()); err != nil {
			panic(err)
		}
	})
	return db
}

func initDB(ctx context.Context) error {
	openRequest, err := idb.Global().Open(ctx, "blockchain", 0, func(db *idb.Database, oldVersion, newVersion uint) error {
		_, err := db.CreateObjectStore(ObjStoreTransaction, idb.ObjectStoreOptions{})
		if err != nil {
			return err
		}
		_, err = db.CreateObjectStore(ObjStoreBlockBody, idb.ObjectStoreOptions{})
		if err != nil {
			return err
		}
		_, err = db.CreateObjectStore(ObjStoreBlockHeader, idb.ObjectStoreOptions{})
		if err != nil {
			return err
		}
		_, err = db.CreateObjectStore(ObjStoreMempool, idb.ObjectStoreOptions{})
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return errs.Wrap(err, "failed to reqeust open db")
	}

	d, err := openRequest.Await(ctx)
	if err != nil {
		return errs.Wrap(err, "open db request failed")
	}

	db = d

	return nil
}

func withTx(mode idb.TransactionMode, f func(tranx *idb.Transaction) error, objStoreName string, objStoreNames ...string) error {
	tranx, err := getDB().Transaction(mode, objStoreName, objStoreNames...)
	if err != nil {
		return errs.Wrap(err, "failed to start transaction")
	}

	if err = f(tranx); err != nil {
		if e := tranx.Abort(); err != nil {
			return errors.Join(err, e)
		}
		return err
	}

	return tranx.Commit()
}
