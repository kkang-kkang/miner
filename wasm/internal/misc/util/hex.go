package util

import (
	"encoding/hex"

	"github.com/pkg/errors"
)

func EncodeHex(b []byte) []byte {
	buf := make([]byte, hex.EncodedLen(len(b)))
	hex.Encode(buf, b)
	return buf
}

func DecodeHex(b []byte) ([]byte, error) {
	buf := make([]byte, hex.DecodedLen(len(b)))
	if _, err := hex.Decode(buf, b); err != nil {
		return nil, errors.Wrap(err, "failed to decode hex")
	}
	return buf, nil
}
