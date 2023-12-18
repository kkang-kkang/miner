package blockchain

import (
	"crypto/ecdsa"
	"miner/internal/key"
	"miner/internal/misc/util"
)

var adminPublicKeyHex = []byte("0495521500a56f6b7c8564d7d3b0fd724ca9bc710c8c2557a0661a94bef0d8a4248141dbc249d7be36803b0fa8b98810c48c18d394bb0aef2fe323834b86111a41")

const (
	MiningPrize = 10
	Difficulty  = 22
)

var (
	HeadHash = GenesisHash()

	MinerAddr []byte
)

func GenesisHash() []byte {
	return []byte{0x00}
}

func AdminPublicKey() *ecdsa.PublicKey {
	b, _ := util.DecodeHex(adminPublicKeyHex)
	key, _ := key.ParseECDSAPublicKey(b)
	return key
}

func AdminHash() []byte {
	return []byte("admin babe")
}
