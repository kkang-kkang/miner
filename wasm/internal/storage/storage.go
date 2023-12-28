package storage

import (
	"context"
	"errors"
	"syscall/js"

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

func InitDB(ctx context.Context) error {
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
	tranx, err := db.Transaction(mode, objStoreName, objStoreNames...)
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

func iterate(ctx context.Context, objStore *idb.ObjectStore, each func(key, val js.Value) (bool, error)) error {
	req, _ := objStore.OpenCursor(idb.CursorNext)

	return req.Iter(ctx, func(cur *idb.CursorWithValue) error {
		key, _ := cur.Key()
		val, _ := cur.Value()

		doContinue, err := each(key, val)
		if !doContinue || err != nil {
			return err
		}

		return cur.Continue()
	})
}
