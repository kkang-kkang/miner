package main

import (
	"context"
	"miner/internal/blockchain"
	"miner/internal/storage"
	"syscall/js"
)

func main() {
	if err := storage.InitDB(context.Background()); err != nil {
		panic(err)
	}

	hash, err := storage.FindBlockchainHead()
	if err != nil {
		panic(err)
	}
	blockchain.HeadHash = hash

	js.Global().Set("createNewTx", createNewTx())
	js.Global().Set("createBlock", createBlock())
	js.Global().Set("createGenesis", createGenesis())
	js.Global().Set("insertBroadcastedTx", insertBroadcastedTx())
	js.Global().Set("insertBroadcastedBlock", insertBroadcastedBlock())
	js.Global().Set("createKeyPair", createKeyPair())
	js.Global().Set("setMinerAddress", setMinerAddress())
	js.Global().Set("getHeadHash", getHeadHash())
	js.Global().Set("setHeadHash", setHeadHash())
	js.Global().Set("getBalance", getBalance())

	select {}
}
