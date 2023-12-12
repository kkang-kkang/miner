package main

import (
	"context"
	"encoding/json"
	"fmt"
	"miner/internal/blockchain"
	"miner/internal/key"
	"miner/internal/misc/promise"
	"miner/internal/misc/util"
	"miner/internal/storage"
	"syscall/js"
)

func createKeyPair() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			keyPair, err := key.Generate()
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to generate key: %v", err))
			}

			b, _ := json.Marshal(keyPair)
			return resolve.Invoke(util.ToJSObject(b))
		}))
	})
}

func setMinerAddress() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			addr, err := util.DecodeHex(util.StrToBytes(args[0].String()))
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to decode hex: %v", err))
			}

			blockchain.MinerAddr = addr

			return resolve.Invoke()
		}))
	})
}

func getHeadHash() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			head := util.BytesToStr(util.EncodeHex(blockchain.HeadHash))
			return resolve.Invoke(head)
		}))
	})
}

func getBalance() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewHandler(func(resolve, reject js.Value) any {
			addr, err := util.DecodeHex(util.StrToBytes(args[0].String()))
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to decode hex: %v", err))
			}

			ctx := context.Background()

			_, got, err := storage.FindUTxOutputs(ctx, addr)
			if err != nil {
				return reject.Invoke(fmt.Sprintf("failed to find uTxOutputs: %v", err))
			}

			return resolve.Invoke(got)
		}))
	})
}
