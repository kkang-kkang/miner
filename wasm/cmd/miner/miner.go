package main

import (
	"context"
	"miner/internal/storage"
	"syscall/js"
)

func main() {
	if err := storage.InitDB(context.Background()); err != nil {
		panic(err)
	}

	js.Global().Set("createNewTx", createNewTx())
	js.Global().Set("createBlock", createBlock())
	js.Global().Set("createGenesis", createGenesis())
	js.Global().Set("insertBroadcastedTx", insertBroadcastedTx())
	js.Global().Set("insertBroadcastedBlock", insertBroadcastedBlock())
	js.Global().Set("createKeyPair", createKeyPair())
	js.Global().Set("setMinerAddress", setMinerAddress())
	js.Global().Set("getHeadHash", getHeadHash())
	js.Global().Set("getBalance", getBalance())

	select {}
}
