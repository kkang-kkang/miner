package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"syscall/js"

	"github.com/hack-pad/go-indexeddb/idb"
	"github.com/pkg/errors"

	"miner/internal/block"
	"miner/internal/blockchain"
	"miner/internal/hash"
	"miner/internal/misc/util"
	"miner/internal/tx"
)

// FindBlockHeader finds block header of given blockHash
func FindBlockBody(ctx context.Context, blockHash hash.Hash) (*block.Body, error) {
	var dst block.Body
	err := withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockBody)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		req, _ := objStore.Get(js.ValueOf(util.BytesToStr(blockHash.ToHex())))
		val, err := req.Await(ctx)
		if err != nil {
			return errors.Wrap(err, "request failed")
		}

		if err := json.Unmarshal(util.FromJSObject(val), &dst); err != nil {
			return errors.Wrap(err, "failed to unmarshal block")
		}

		return nil
	}, ObjStoreBlockBody)

	if err != nil {
		return nil, err
	}

	return &dst, nil
}

func InsertBlockBody(ctx context.Context, hash hash.Hash, body *block.Body) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockBody)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		b, err := json.Marshal(body)
		if err != nil {
			return errors.Wrap(err, "failed to marshal block")
		}

		objStore.AddKey(
			js.ValueOf(util.BytesToStr(hash.ToHex())),
			util.ToJSObject(b),
		)

		return nil
	}, ObjStoreBlockBody)
}

// FindUTxOutputs finds unspent transaction outputs from blockchain.
// Notice that this function iterates all over the keys.
func FindUTxOutputs(ctx context.Context, pubKey []byte) (_ []*tx.UTxOutput, got uint64, err error) {
	uTxOuts := make([]*tx.UTxOutput, 0)

	var cur hash.Hash = blockchain.HeadHash

	err = withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		txStorage, _ := tranx.ObjectStore(ObjStoreTransaction)
		blockHeaderStorage, _ := tranx.ObjectStore(ObjStoreBlockHeader)
		blockBodyStorage, _ := tranx.ObjectStore(ObjStoreBlockBody)

		for {
			req, _ := blockHeaderStorage.Get(js.ValueOf(util.BytesToStr(cur.ToHex())))
			val, err := req.Await(ctx)
			if err != nil {
				return errors.Wrap(err, "request failed")
			}

			var header block.Header
			if err := json.Unmarshal(util.FromJSObject(val), &header); err != nil {
				return errors.Wrap(err, "failed to unmarshal block header")
			}

			if bytes.Equal(header.CurHash, blockchain.GenesisHash()) {
				return nil
			}

			req, _ = blockBodyStorage.Get(js.ValueOf(util.BytesToStr(header.CurHash.ToHex())))
			val, err = req.Await(ctx)
			if err != nil {
				return errors.Wrap(err, "request failed")
			}

			var body block.Body
			if err := json.Unmarshal(util.FromJSObject(val), &body); err != nil {
				return errors.Wrap(err, "failed to unmarshal block body")
			}

			var transaction tx.Transaction
			for _, txHash := range append(body.TxHashes, body.CoinbaseTxHash) {
				req, _ = txStorage.GetKey(js.ValueOf(util.BytesToStr(txHash.ToHex())))
				val, err = req.Await(ctx)
				if err != nil {
					return errors.Wrap(err, "request failed")
				}

				if err := json.Unmarshal(util.FromJSObject(val), &transaction); err != nil {
					return errors.Wrap(err, "failed to unmarshal transaction")
				}

				for idx, out := range transaction.Outputs {
					if bytes.Equal(pubKey, out.Addr) {
						uTxOuts = append(uTxOuts, &tx.UTxOutput{
							TxHash: transaction.Hash,
							Amount: out.Amount,
							OutIdx: uint16(idx),
						})

						got += out.Amount
					}
					if idx == 1 {
						return nil
					}
				}
			}

			cur = header.PrevHash
		}
	},
		ObjStoreTransaction,
		ObjStoreBlockHeader,
		ObjStoreBlockBody,
	)

	if err != nil {
		return nil, 0, err
	}

	return uTxOuts, got, nil
}
