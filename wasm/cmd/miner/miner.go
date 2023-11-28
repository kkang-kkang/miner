package main

import (
	"syscall/js"
)

func main() {
	js.Global().Set("createNewTx", createNewTx())
	js.Global().Set("createBlock", createBlock())
	js.Global().Set("insertBroadcastedTx", insertBroadcastedTx())
	js.Global().Set("insertBroadcastedBlock", insertBroadcastedBlock())

	select {}
}
