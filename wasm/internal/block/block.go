package block

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"time"

	"github.com/cbergoon/merkletree"
	"github.com/pkg/errors"

	"miner/internal/hash"
	"miner/internal/tx"
)

const (
	BlockMiningPrize = 10
)

// Header is header part of the block.
type Header struct {
	CurHash  hash.Hash `json:"curHash"`
	PrevHash hash.Hash `json:"prevHash"`

	DataHash   hash.Hash `json:"dataHash"`
	Difficulty uint8     `json:"difficulty"`
	Nonce      uint32    `json:"nonce"`

	Timestamp time.Time `json:"timestamp"`
}

// Body is body part of the block.
type Body struct {
	CoinbaseTxHash hash.Hash         `json:"coinbaseTxHash,omitempty"`
	TxHashes       []hash.Hash       `json:"txHashes,omitempty"`
	CoinbaseTx     *tx.Transaction   `json:"coinbaseTx,omitempty"`
	Txs            []*tx.Transaction `json:"txs,omitempty"`
}

type Block struct {
	Header *Header `json:"header"`
	Body   *Body   `json:"body"`
}

// New creates new block from given arguments.
// You still have to configure [nonce, hash].
func New(minerAddr []byte, txs []*tx.Transaction, prevHash []byte, difficulty uint8) (*Block, error) {
	coinBaseTx := &tx.Transaction{
		Inputs: []*tx.TxInput{{
			TxHash: tx.COINBASE,
			OutIdx: 0,
		}},
		Outputs: []*tx.TxOutput{{
			Addr:   minerAddr,
			Amount: BlockMiningPrize * uint64(len(txs)), // TODO: change this to actual algorithm.
		}},
	}

	h, err := coinBaseTx.MakeHash()
	if err != nil {
		return nil, errors.Wrap(err, "failed to create hash of coinbaseTx")
	}
	coinBaseTx.Hash = h

	block := &Block{
		Header: &Header{PrevHash: prevHash, Difficulty: difficulty},
		Body: &Body{
			CoinbaseTxHash: coinBaseTx.Hash,
			CoinbaseTx:     coinBaseTx,
			Txs:            txs,
			TxHashes:       make([]hash.Hash, 0, len(txs)),
		},
	}

	tree, err := block.CreateMerkleTree()
	if err != nil {
		return nil, errors.Wrap(err, "merkle tree creation failed")
	}

	block.Header.DataHash = tree.MerkleRoot()

	for _, tx := range block.Body.Txs {
		block.Body.TxHashes = append(block.Body.TxHashes, tx.Hash)
	}

	block.Header.Timestamp = time.Now()

	return block, nil
}

func (h *Header) MakeHash() []byte {
	hash := sha256.New()

	hash.Write(h.MakeHashInput())
	binary.Write(hash, binary.LittleEndian, h.Nonce)

	return hash.Sum(nil)
}

func (h *Header) MakeHashInput() []byte {
	buf := bytes.NewBuffer(nil)

	buf.Write(h.PrevHash)
	buf.Write(h.DataHash)
	binary.Write(buf, binary.LittleEndian, h.Timestamp.UnixNano())
	binary.Write(buf, binary.LittleEndian, h.Difficulty)

	return buf.Bytes()
}

// CreateMerkleTree creates merkle tree from block's transactions.
func (b *Block) CreateMerkleTree() (*merkletree.MerkleTree, error) {
	nodes := make([]merkletree.Content, 0, len(b.Body.Txs)+1)

	nodes = append(nodes, b.Body.CoinbaseTx)
	for _, tx := range b.Body.Txs {
		nodes = append(nodes, tx)
	}
	return merkletree.NewTree(nodes)
}

// ValidateDataHash validates that the block's dataHash(merkletree's root hash)
// equals to the actual hash of calculated merkle tree.
func (b *Block) ValidateDataHash() bool {
	tree, err := b.CreateMerkleTree()
	return err == nil && bytes.Equal(b.Header.DataHash, tree.MerkleRoot())
}
