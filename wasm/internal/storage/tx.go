package storage

import (
	"bytes"
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

// FindUTxOutputs finds unspent transaction outputs from database.
// Notice that this function iterates all over the keys.
func FindUTxOutputs(ctx context.Context, pubKey []byte, amount uint64) (_ []*tx.UTxOutput, got uint64, err error) {
	uTxOuts := make([]*tx.UTxOutput, 0)

	err = withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreTransaction)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		cursor, _ := objStore.OpenCursor(idb.CursorNext)
		cursor.Iter(ctx, func(cwv *idb.CursorWithValue) error {
			val, err := cwv.Value()
			if err != nil {
				return errors.Wrap(err, "failed to get value")
			}

			var transaction tx.Transaction
			if err := json.Unmarshal(util.FromJSObject(val), &transaction); err != nil {
				return errors.Wrap(err, "failed to unmarshal transaction")
			}

			for idx, out := range transaction.Outputs {
				if bytes.Equal(pubKey, out.Addr) {
					uTxOuts = append(uTxOuts, &tx.UTxOutput{
						TxHash: transaction.Hash,
						Amount: amount,
						OutIdx: uint16(idx),
					})

					got += out.Amount
					if got >= amount {
						break
					}
				}
			}

			return nil
		})
		return nil
	},
		ObjStoreTransaction,
	)

	if err != nil {
		return nil, 0, err
	}

	return uTxOuts, got, nil
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
