package util

import "unsafe"

func StrToBytes(str string) []byte {
	return unsafe.Slice(unsafe.StringData(str), len(str))
}

func BytesToStr(bytes []byte) string {
	return unsafe.String(unsafe.SliceData(bytes), len(bytes))
}
