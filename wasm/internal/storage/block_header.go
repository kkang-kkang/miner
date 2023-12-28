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

func InsertBlockHeader(ctx context.Context, header *block.Header) error {
	return withTx(idb.TransactionReadWrite, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockHeader)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		b, err := json.Marshal(header)
		if err != nil {
			return errors.Wrap(err, "failed to marshal block")
		}

		objStore.AddKey(
			js.ValueOf(util.BytesToStr(header.CurHash.ToHex())),
			util.ToJSObject(b),
		)

		return nil
	}, ObjStoreBlockHeader)
}

func FindBlockchainHead() ([]byte, error) {
	var hash []byte
	var cur, ref string
	refMap := make(map[string]string)

	err := withTx(idb.TransactionReadOnly, func(tranx *idb.Transaction) error {
		objStore, err := tranx.ObjectStore(ObjStoreBlockHeader)
		if err != nil {
			return errors.Wrap(err, "failed to get object store")
		}

		var header block.Header
		err = iterate(context.Background(), objStore, func(_, val js.Value) (bool, error) {
			if err := json.Unmarshal(util.FromJSObject(val), &header); err != nil {
				return false, errors.Wrap(err, "failed to unmarshal block")
			}

			cur = util.BytesToStr(util.EncodeHex(header.CurHash))
			ref = util.BytesToStr(util.EncodeHex(header.PrevHash))

			if newRef, ok := refMap[ref]; ok {
				delete(refMap, ref)
				ref = newRef
			}
			refMap[cur] = ref

			return true, nil
		})
		if err != nil {
			return err
		}

		for cur, ref := range refMap {
			if _, ok := refMap[ref]; ok && cur != "00" {
				delete(refMap, ref)
				continue
			}
		}

		if len(refMap) != 1 {
			return errors.New("finding hash did not successfully finish")
		}
		for cur := range refMap {
			hash, _ = util.DecodeHex(util.StrToBytes(cur))
		}

		return nil
	}, ObjStoreBlockHeader)
	if err != nil {
		return nil, err
	}

	return hash, nil
}
