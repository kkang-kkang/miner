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

// PutTxToMempool puts the transaction to mempool.
func PutTxToMempool(ctx context.Context, transaction *tx.Transaction) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreMempool)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		b, err := json.Marshal(transaction)
		if err != nil {
			return errors.Wrap(err, "failed to marshal transaction")
		}

		req, _ := objStore.AddKey(
			js.ValueOf(util.BytesToStr(transaction.Hash.ToHex())),
			util.ToJSObject(b),
		)

		if err := req.Await(ctx); err != nil {
			return errors.Wrap(err, "request failed")
		}

		return nil
	},
		ObjStoreMempool,
	)
}

// DeleteTxsFromMempool deletes transactions from mempool.
func DeleteTxsFromMempool(ctx context.Context, txHashes []hash.Hash) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreMempool)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		for _, hash := range txHashes {
			objStore.Delete(js.ValueOf(hash.ToHex()))
		}

		if err := tranx.Await(ctx); err != nil {
			return errors.Wrap(err, "request failed")
		}

		return nil
	},
		ObjStoreMempool,
	)
}

// FindTxsFromMempool finds transactions from mempool.
func FindTxsFromMempool(ctx context.Context, txHashes []hash.Hash) ([]*tx.Transaction, error) {
	txs := make([]*tx.Transaction, 0, len(txHashes))
	err := withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreMempool)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		for _, hash := range txHashes {
			req, _ := objStore.GetKey(js.ValueOf(util.BytesToStr(hash.ToHex())))
			val, err := req.Await(ctx)
			if err != nil {
				return errors.Wrap(err, "request failed")
			}

			marshaled := util.StrToBytes(val.String())

			var dst tx.Transaction
			if err := json.Unmarshal(marshaled, &dst); err != nil {
				return errors.Wrap(err, "failed to unmarshal transaction")
			}

			txs = append(txs, &dst)
		}

		return nil
	},
		ObjStoreMempool,
	)

	if err != nil {
		return nil, err
	}

	return txs, nil
}
