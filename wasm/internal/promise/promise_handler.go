package promise

import "syscall/js"

func NewPromiseHandler(handler func(resolve, reject js.Value) any) js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		resolve := args[0]
		reject := args[1]

		go handler(resolve, reject)
		return nil
	})
}
