package storage

import (
	"context"
	"encoding/json"
	"syscall/js"

	"github.com/hack-pad/go-indexeddb/idb"
	"github.com/pkg/errors"

	"miner/internal/block"
	"miner/internal/misc/util"
)

// FindBlockHeader finds block header of given blockHash
func FindBlockHeader(ctx context.Context, blockHash []byte) (*block.Header, error) {
	var dst block.Header
	err := withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockHeader)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		req, _ := objStore.Get(js.ValueOf(blockHash))
		val, err := req.Await(ctx)
		if err != nil {
			return errors.Wrap(err, "request failed")
		}

		marshaled := util.StrToBytes(val.String())

		if err := json.Unmarshal(marshaled, &dst); err != nil {
			return errors.Wrap(err, "failed to unmarshal block")
		}

		return nil
	}, ObjStoreBlockHeader)

	if err != nil {
		return nil, err
	}

	return &dst, nil
}

func InsertBlockHeader(ctx context.Context, block *block.Block) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockHeader)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		b, err := json.Marshal(block.Header)
		if err != nil {
			return errors.Wrap(err, "failed to marshal block")
		}

		req, _ := objStore.AddKey(js.ValueOf(block.Header.CurHash), js.ValueOf(b))
		if err := req.Await(ctx); err != nil {
			return errors.Wrap(err, "request failed")
		}

		return nil
	}, ObjStoreBlockHeader)
}
