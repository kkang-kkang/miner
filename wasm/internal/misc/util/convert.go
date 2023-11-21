package util

import "unsafe"

func StrToBytes(str string) []byte {
	return unsafe.Slice(unsafe.StringData(str), len(str))
}
