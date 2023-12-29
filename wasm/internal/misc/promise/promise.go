package promise

import "syscall/js"

// New creates new Promise. The argument should be created with NewHandler.
func New(promiseHandler js.Func) any {
	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(promiseHandler)
}

// NewHandler creates new promise's handler.
func NewHandler(handler func(resolve, reject js.Value) any) js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		resolve := args[0]
		reject := args[1]

		go handler(resolve, reject)
		return nil
	})
}
