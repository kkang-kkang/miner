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
func FindBlockBody(ctx context.Context, blockHash []byte) (*block.Body, error) {
	var dst block.Body
	err := withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockBody)
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
	}, ObjStoreBlockBody)

	if err != nil {
		return nil, err
	}

	return &dst, nil
}

func InsertBlockBody(ctx context.Context, hash []byte, body *block.Body) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockBody)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		b, err := json.Marshal(body)
		if err != nil {
			return errors.Wrap(err, "failed to marshal block")
		}

		req, _ := objStore.AddKey(js.ValueOf(hash), js.ValueOf(b))
		if err := req.Await(ctx); err != nil {
			return errors.Wrap(err, "request failed")
		}

		return nil
	}, ObjStoreBlockBody)
}
