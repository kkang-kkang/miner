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

	select {}
}
