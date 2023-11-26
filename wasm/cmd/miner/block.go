package main

import (
	"bytes"
	"context"
	"fmt"
	"syscall/js"

	"github.com/pkg/errors"

	"miner/internal/block"
	"miner/internal/gpu"
	"miner/internal/misc/promise"
	"miner/internal/misc/util"
	"miner/internal/storage"
	"miner/internal/tx"
)

func createBlock() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			ctx := context.Background()
			minerAddr := []byte{}
			prevHash := []byte{}
			var txs []*tx.Transaction

			block, err := block.New(minerAddr, txs, prevHash)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to create block: %v", err))
			}

			// TODO: change this or whatever.
			const difficulty = 6

			in, err := block.Header.MakeHashInput()
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to make hash input: %v", err))
			}

			_, candidateStream, result := gpu.FindNonce(ctx, in, difficulty)
			for block.Header.CurHash == nil {
				select {
				case <-candidateStream:
					// TODO: throw this to ui.
				case r := <-result:
					block.Header.CurHash = r.Hash
					block.Header.Nonce = r.Nonce
				}
			}
			if err := saveBlockToStorage(ctx, block); err != nil {
				return reject.Invoke(err.Error())
			}

			return resolve.Invoke()
		}))
	})
}

func insertBroadcastedBlock() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			ctx := context.Background()
			block := &block.Block{}

			var blockHeadHash = []byte{}
			var difficulty uint8 = 0

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

			for _, tx := range append(block.Body.Txs, block.Body.CoinbaseTx) {
				if err := validateTx(ctx, tx); err != nil {
					return reject.Invoke(fmt.Sprintf("transaction is not valid: %v", err))
				}
			}

			if err := saveBlockToStorage(ctx, block); err != nil {
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

	newBlockBody := *block.Body
	newBlockBody.CoinbaseTx = nil
	newBlockBody.Txs = nil
	if err := storage.InsertBlockBody(ctx, block.Header.CurHash, &newBlockBody); err != nil {
		return errors.Wrap(err, "failed to insert block body")
	}

	if err := deleteTxInputs(ctx, block); err != nil {
		return errors.Wrap(err, "failed to delete tx inputs")
	}

	if err := storage.DeleteTxsFromMempool(ctx, block.Body.TxHashes); err != nil {
		return errors.Wrap(err, "failed to delete txs from mempool")
	}

	if err := storage.InsertTxs(ctx, append(block.Body.Txs, block.Body.CoinbaseTx)); err != nil {
		return errors.Wrap(err, "failed to insert transactions")
	}

	return nil
}

func deleteTxInputs(ctx context.Context, block *block.Block) error {
	txHashes := make([][]byte, 0)

	for _, tx := range block.Body.Txs {
		for _, in := range tx.Inputs {
			txHashes = append(txHashes, in.TxHash)
		}
	}

	// what if index 0 is used and 1 is not?
	// let's just keep it as todo for now.

	if err := storage.DeleteTxs(ctx, txHashes); err != nil {
		return errors.Wrap(err, "failed to delete txs")
	}

	return nil
}
