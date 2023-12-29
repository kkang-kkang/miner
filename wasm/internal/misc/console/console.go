package console

import "syscall/js"

var logger = js.Global().Get("console")

func Log(args ...any) {
	logger.Call("log", args...)
}

func Warn(args ...any) {
	logger.Call("warn", args...)
}

func Error(args ...any) {
	logger.Call("error", args...)
}
