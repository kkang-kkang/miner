package main

func main() {

	// wait for nothing
	<-make(chan struct{})
}
