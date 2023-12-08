package storage

import (
	"context"
	"encoding/json"
	"syscall/js"

	"github.com/hack-pad/go-indexeddb/idb"
	"github.com/pkg/errors"

	"miner/internal/hash"
	"miner/internal/misc/util"
	"miner/internal/tx"
)

// FindTx finds a transaction from the database.
func FindTx(ctx context.Context, txHash hash.Hash) (*tx.Transaction, error) {
	var dst tx.Transaction
	err := withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreTransaction)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		req, _ := objStore.Get(js.ValueOf(util.BytesToStr(txHash.ToHex())))
		val, err := req.Await(ctx)
		if err != nil {
			return errors.Wrap(err, "request failed")
		}

		if err := json.Unmarshal(util.FromJSObject(val), &dst); err != nil {
			return errors.Wrap(err, "failed to unmarshal transaction")
		}

		return nil
	},
		ObjStoreTransaction,
	)

	if err != nil {
		return nil, err
	}

	return &dst, nil
}

// InsertTxs inserts transactions.
func InsertTxs(ctx context.Context, txs []*tx.Transaction) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreTransaction)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		for _, tx := range txs {
			b, err := json.Marshal(tx)
			if err != nil {
				return errors.Wrap(err, "failed to marshal transaction")
			}

			objStore.AddKey(
				js.ValueOf(util.BytesToStr(tx.Hash.ToHex())),
				util.ToJSObject(b),
			)
		}

		return nil
	}, ObjStoreTransaction)
}

// DeleteTxs deletes transactions.
func DeleteTxs(ctx context.Context, txHashes [][]byte) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreTransaction)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		for _, hash := range txHashes {
			objStore.Delete(js.ValueOf(util.BytesToStr(hash)))
		}

		return nil
	}, ObjStoreTransaction)
}

// UpdateTxs deletes transactions.
func UpdateTxs(ctx context.Context, txs []*tx.Transaction) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreTransaction)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		for _, tx := range txs {
			b, err := json.Marshal(tx)
			if err != nil {
				return errors.Wrap(err, "failed to marshal transaction")
			}

			objStore.PutKey(
				js.ValueOf(util.BytesToStr(tx.Hash.ToHex())),
				util.ToJSObject(b),
			)
		}

		return nil
	}, ObjStoreTransaction)
}
