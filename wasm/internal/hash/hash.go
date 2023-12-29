package hash

import (
	"bytes"
	"miner/internal/misc/util"
)

type Hash []byte

func (h Hash) ToHex() []byte {
	return util.EncodeHex(h)
}

func (h Hash) MarshalJSON() ([]byte, error) {
	return bytes.Join([][]byte{nil, h.ToHex(), nil}, []byte(`"`)), nil
}

func (h *Hash) UnmarshalJSON(data []byte) (err error) {
	*h, err = util.DecodeHex(data[1 : len(data)-1])
	return
}
