package blockchain

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
