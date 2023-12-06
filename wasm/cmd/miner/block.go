package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/pkg/errors"

	"miner/internal/block"
	"miner/internal/hash"
	"miner/internal/misc/promise"
	"miner/internal/misc/util"
	"miner/internal/processor"
	"miner/internal/storage"
	"miner/internal/tx"
)

func createBlock() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			candidate := args[0]
			hashStrings := candidate.Get("transactionHashes")

			txHashes := make([]hash.Hash, hashStrings.Length())
			for i := 0; i < len(txHashes); i++ {
				h := hashStrings.Index(i).String()
				txHashes[i] = hash.Hash(util.StrToBytes(h))
			}

			ctx := context.Background()

			txs, err := storage.FindTxsFromMempool(ctx, txHashes)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to find txs: %v", err))
			}

			// TODO: change this or whatever.
			prevHash := []byte("ffffffffffff")
			minerAddr := []byte("ffffffffffff")
			const difficulty = 8

			block, err := block.New(minerAddr, txs, prevHash, difficulty)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to create block: %v", err))
			}

			in, err := block.Header.MakeHashInput()
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to make hash input: %v", err))
			}

			result := processor.FindNonceUsingGPU(ctx, in, difficulty)
			nonce := <-result

			block.Header.Nonce = nonce
			hash, err := block.Header.MakeHash()
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to make hash: %v", err))
			}

			block.Header.CurHash = hash

			if err := saveBlockToStorage(ctx, block); err != nil {
				return reject.Invoke(err.Error())
			}

			block.Body.CoinbaseTxHash = nil
			block.Body.TxHashes = nil

			b, _ := json.Marshal(block)
			return resolve.Invoke(util.ToJSObject(b))
		}))
	})
}

func insertBroadcastedBlock() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			candidate := util.FromJSObject(args[0])

			var block block.Block
			if err := json.Unmarshal(candidate, &block); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to unmarshal block: %v", err))
			}

			ctx := context.Background()

			// TODO: should change this to real value.
			var blockHeadHash = []byte("ffffffffffff")
			var difficulty uint8 = 6

			if !bytes.Equal(block.Header.PrevHash, blockHeadHash) {
				return reject.Invoke("block is not up-to-date")
			}

			if block.Header.Difficulty != difficulty {
				return reject.Invoke("block difficulty does not match")
			}

			valid := util.CheckPrefix(block.Header.CurHash, block.Header.Difficulty)
			if !valid {
				return reject.Invoke("block prefix is not valid")
			}

			hash, err := block.Header.MakeHash()
			if err != nil {
				return reject.Invoke(err.Error())
			}

			if !bytes.Equal(block.Header.CurHash, hash) {
				return reject.Invoke("hash is not valid")
			}

			if valid = block.ValidateDataHash(); !valid {
				return reject.Invoke("block's data hash is not valid")
			}

			coinbaseFound := false
			for _, tx := range append(block.Body.Txs, block.Body.CoinbaseTx) {
				isCoinbase, err := validateTx(ctx, tx)
				if err != nil {
					return reject.Invoke(fmt.Sprintf("transaction is not valid: %v", err))
				}

				if isCoinbase {
					if coinbaseFound {
						return reject.Invoke("coinbase already found")
					}

					if tx.Outputs[0].Amount != uint64(len(block.Body.Txs)*10) {
						return reject.Invoke("coinbase transaction is fake")
					}

					coinbaseFound = true
				}
			}

			block.Body.CoinbaseTxHash = block.Body.CoinbaseTx.Hash
			for _, tx := range block.Body.Txs {
				block.Body.TxHashes = append(block.Body.TxHashes, tx.Hash)
			}

			if err := saveBlockToStorage(ctx, &block); err != nil {
				return reject.Invoke(err.Error())
			}

			return resolve.Invoke()
		}))
	})
}

func saveBlockToStorage(ctx context.Context, block *block.Block) error {
	if err := storage.InsertBlockHeader(ctx, block.Header); err != nil {
		return errors.Wrap(err, "failed to insert block header")
	}

	// copy block body so we can use original one later.
	newBlockBody := *block.Body
	newBlockBody.CoinbaseTx = nil
	newBlockBody.Txs = nil

	if err := storage.InsertBlockBody(ctx, block.Header.CurHash, &newBlockBody); err != nil {
		return errors.Wrap(err, "failed to insert block body")
	}

	if err := deleteUsedTxOutputs(ctx, block); err != nil {
		return errors.Wrap(err, "failed to delete used tx outputs")
	}

	if err := storage.DeleteTxsFromMempool(ctx, block.Body.TxHashes); err != nil {
		return errors.Wrap(err, "failed to delete txs from mempool")
	}

	if err := storage.InsertTxs(ctx, append(block.Body.Txs, block.Body.CoinbaseTx)); err != nil {
		return errors.Wrap(err, "failed to insert transactions")
	}

	return nil
}

func deleteUsedTxOutputs(ctx context.Context, block *block.Block) error {
	updatable := make([]*tx.Transaction, 0, len(block.Body.Txs))
	deletable := make([][]byte, 0, len(block.Body.Txs))

	for _, tx := range block.Body.Txs {
		for _, in := range tx.Inputs {
			hash := in.TxHash.ToHex()

			targetTx, err := storage.FindTx(ctx, hash)
			if err != nil {
				return errors.Wrap(err, "failed to find transaction to classify")
			}

			targetTx.Outputs[in.OutIdx].Addr = []byte{0x00}

			// check if all the tx outputs are used.
			if empty := checkTxEmpty(targetTx); empty {
				deletable = append(deletable, hash)
				continue
			}
			updatable = append(updatable, targetTx)
		}
	}

	if err := storage.UpdateTxs(ctx, updatable); err != nil {
		return errors.Wrap(err, "failed to update txs")
	}

	if err := storage.DeleteTxs(ctx, deletable); err != nil {
		return errors.Wrap(err, "failed to delete txs")
	}

	return nil
}

func checkTxEmpty(tx *tx.Transaction) bool {
	for _, out := range tx.Outputs {
		if !bytes.Equal([]byte{0x00}, out.Addr) {
			return false
		}
	}
	return true
}
