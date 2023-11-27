package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/pkg/errors"

	"miner/internal/key"
	"miner/internal/misc/promise"
	"miner/internal/misc/util"
	"miner/internal/storage"
	"miner/internal/tx"
)

// TODO: get explicit input from js. it could be JSON.stringified value.
func createNewTx() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			candidate := args[0]

			amount := uint64(candidate.Get("amount").Int())
			privKeyBytes := util.StrToBytes(candidate.Get("privateKey").String())

			srcAddr, err := util.DecodeHex(util.StrToBytes(candidate.Get("srcAddress").String()))
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to decode hex: %v", err))
			}

			dstAddr, err := util.DecodeHex(util.StrToBytes(candidate.Get("dstAddress").String()))
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to decode hex: %v", err))
			}

			privKey, err := key.ParseECDSAPrivateKey(privKeyBytes)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to parse private key: %v", err))
			}

			ctx := context.Background()

			uTxOuts, got, err := storage.FindUTxOutputs(ctx, srcAddr, amount)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to find uTxOutputs: %v", err))
			}

			if got < amount {
				return reject.Invoke(fmt.Sprintf("not enough coins. got: %d, need: %d", got, amount))
			}

			tx, err := tx.New(uTxOuts, amount, privKey, dstAddr)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to create tx: %v", err))
			}

			if err := storage.PutTxToMempool(ctx, tx); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to put tx to mempool: %v", err))
			}

			b, _ := json.Marshal(tx)
			return resolve.Invoke(util.ToJSObject(b))
		}))
	})
}

func insertBroadcastedTx() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			candidate := util.FromJSObject(args[0])

			var transaction tx.Transaction
			if err := json.Unmarshal(candidate, &transaction); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to unmarshal transaction: %v", err))
			}

			ctx := context.Background()

			if err := validateTx(ctx, &transaction); err != nil {
				return reject.Invoke(err.Error())
			}

			if err := storage.PutTxToMempool(ctx, &transaction); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to put tx to mempool: %v", err))
			}

			return resolve.Invoke()
		}))
	})
}

func validateTx(ctx context.Context, transaction *tx.Transaction) error {
	if isValid := transaction.ValidateHash(); !isValid {
		return errors.New("transaction hash is not valid")
	}

	var sum uint64
	for _, in := range transaction.Inputs {
		tx, err := storage.FindTx(ctx, in.TxHash)
		if err != nil {
			return errors.Wrap(err, "failed to find transaction")
		}

		if int(in.OutIdx) >= len(tx.Outputs) {
			return errors.New("outIdx cannot be reached")
		}

		out := tx.Outputs[in.OutIdx]

		publicKey, err := key.ParseECDSAPublicKey(out.Addr)
		if err != nil {
			return errors.Wrap(err, "failed to parse ecdsa public key")
		}

		valid := ecdsa.VerifyASN1(publicKey, tx.Hash, in.Signature)
		if !valid {
			return errors.New("signature is not valid")
		}

		sum += out.Amount
	}

	for _, out := range transaction.Outputs {
		sum -= out.Amount
	}

	if sum != 0 {
		return errors.New("tx input and output does not match")
	}

	return nil
}
