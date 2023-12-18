package main

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/pkg/errors"

	"miner/internal/blockchain"
	"miner/internal/key"
	"miner/internal/misc/promise"
	"miner/internal/misc/util"
	"miner/internal/storage"
	"miner/internal/tx"
)

func createNewTx() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			candidate := args[0]

			amount := uint64(candidate.Get("amount").Int())
			privKeyBytes := util.StrToBytes(candidate.Get("privateKey").String())

			dstAddr, err := util.DecodeHex(util.StrToBytes(candidate.Get("dstAddress").String()))
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to decode hex: %v", err))
			}

			privKey, err := key.ParseECDSAPrivateKey(privKeyBytes)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to parse private key: %v", err))
			}

			publicKey, _ := privKey.PublicKey.ECDH()
			ctx := context.Background()

			var tranx *tx.Transaction
			if sig, isAdmin := compareAdmin(privKey); isAdmin {
				tranx = &tx.Transaction{
					Inputs: []*tx.TxInput{{
						TxHash:    []byte{0x00},
						OutIdx:    0,
						Signature: sig,
					}},
					Outputs: []*tx.TxOutput{{
						Addr:   dstAddr,
						Amount: amount,
					}},
				}
				hash, _ := tranx.MakeHash()
				tranx.Hash = hash
			} else {
				uTxOuts, got, err := storage.FindUTxOutputs(ctx, publicKey.Bytes())
				if err != nil {
					return reject.Invoke(fmt.Sprintf("failed to find uTxOutputs: %v", err))
				}

				if got < amount {
					return reject.Invoke(fmt.Sprintf("not enough coins. got: %d, need: %d", got, amount))
				}

				tranx, err = tx.New(uTxOuts, amount, privKey, publicKey.Bytes(), dstAddr)
				if err != nil {
					return reject.Invoke(fmt.Sprintf("failed to create tx: %v", err))
				}
			}

			if err := storage.PutTxToMempool(ctx, tranx); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to put tx to mempool: %v", err))
			}

			b, _ := json.Marshal(tranx)
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

			if _, err := validateTx(ctx, &transaction); err != nil {
				return reject.Invoke(err.Error())
			}

			if err := storage.PutTxToMempool(ctx, &transaction); err != nil {
				return reject.Invoke(fmt.Sprintf("failed to put tx to mempool: %v", err))
			}

			return resolve.Invoke()
		}))
	})
}

func validateTx(ctx context.Context, transaction *tx.Transaction) (isCoinbase bool, err error) {
	if isValid := transaction.ValidateHash(); !isValid {
		return false, errors.New("transaction hash is not valid")
	}

	if len(transaction.Inputs) > 0 {
		first := transaction.Inputs[0]

		if bytes.Equal(first.TxHash, tx.COINBASE) {
			return true, nil
		}

		adminKey := blockchain.AdminPublicKey()
		adminHash := blockchain.AdminHash()

		if ecdsa.VerifyASN1(adminKey, adminHash, first.Signature) {
			return false, nil
		}
	}

	var sum uint64
	for _, in := range transaction.Inputs {
		tx, err := storage.FindTx(ctx, in.TxHash)
		if err != nil {
			return false, errors.Wrap(err, "failed to find transaction")
		}

		if int(in.OutIdx) >= len(tx.Outputs) {
			return false, errors.New("outIdx cannot be reached")
		}

		out := tx.Outputs[in.OutIdx]

		publicKey, err := key.ParseECDSAPublicKey(out.Addr)
		if err != nil {
			return false, errors.Wrap(err, "failed to parse ecdsa public key")
		}

		valid := ecdsa.VerifyASN1(publicKey, tx.Hash, in.Signature)
		if !valid {
			return false, errors.New("signature is not valid")
		}

		sum += out.Amount
	}

	for _, out := range transaction.Outputs {
		sum -= out.Amount
	}

	if sum != 0 {
		return false, errors.New("tx input and output does not match")
	}

	return false, nil
}

func compareAdmin(privKey *ecdsa.PrivateKey) (sig []byte, isAdmin bool) {
	adminKey := blockchain.AdminPublicKey()
	adminHash := blockchain.AdminHash()

	sig, err := ecdsa.SignASN1(rand.Reader, privKey, adminHash)
	if err != nil {
		return nil, false
	}

	return sig, ecdsa.VerifyASN1(adminKey, adminHash, sig)
}
