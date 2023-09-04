package promise

import "syscall/js"

func New(promiseHandler js.Func) any {
	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(promiseHandler)
}
