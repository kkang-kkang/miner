package main

import (
	"miner/pkg/network"
	"syscall/js"
)

func main() {

	exposeWasmApis()

	// wait for nothing
	<-make(chan struct{})
}

func exposeWasmApis() {
	js.Global().Set("initRTCConnection", network.InitRTCConn())
}
