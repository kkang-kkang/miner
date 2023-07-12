package main

func main() {

	exposeWasmApis()

	// wait for nothing
	<-make(chan struct{})
}

func exposeWasmApis() {}
