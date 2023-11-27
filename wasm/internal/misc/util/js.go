package util

import (
	"syscall/js"
)

// b should be json.Marshaled.
func ToJSObject(b []byte) js.Value {
	str := BytesToStr(b)
	return js.Global().Get("JSON").Call("parse", str)
}

// return value should be json.Marshaled bytes.
func FromJSObject(val js.Value) []byte {
	v := js.Global().Get("JSON").Call("stringify", val)
	return StrToBytes(v.String())
}
