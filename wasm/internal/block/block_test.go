package block_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"miner/internal/block"
	"miner/internal/tx"
)

func TestVerifyDataHash(t *testing.T) {
	block := block.Block{
		Header: &block.Header{},
		Body: &block.Body{
			CoinbaseTx: &tx.Transaction{
				Inputs: []*tx.TxInput{
					{
						TxHash:    nil,
						OutIdx:    2,
						Signature: []byte("aefaelfkahflakehfalkejfhaljk"),
					},
				},
				Outputs: []*tx.TxOutput{
					{
						Addr:   []byte("aefefaefaa"),
						Amount: 32,
					},
				},
			},
			Txs: []*tx.Transaction{
				{
					Inputs: []*tx.TxInput{
						{
							TxHash:    nil,
							OutIdx:    2,
							Signature: []byte("aefaelfkahflakehfalkejfhaljk"),
						},
					},
					Outputs: []*tx.TxOutput{
						{
							Addr:   []byte("aefefaefaa"),
							Amount: 32,
						},
					},
				},
			},
		},
	}

	tree, err := block.CreateMerkleTree()
	assert.NoError(t, err)

	block.Header.DataHash = tree.MerkleRoot()

	valid := block.ValidateDataHash()
	assert.True(t, valid)
}

func TestNew(t *testing.T) {
	myAddr := []byte("aefafe")
	prevHash := []byte("dfskfjdshf")

	txs := []*tx.Transaction{
		{
			Hash: []byte("asdfs"),
			Inputs: []*tx.TxInput{{
				TxHash:    []byte("afef"),
				OutIdx:    1,
				Signature: []byte("aefeadfsdaf"),
			}},
			Outputs: []*tx.TxOutput{{
				Addr:   []byte("adafdsaf"),
				Amount: 20,
			}},
		},
		{
			Hash: []byte("aefaefaf"),
			Inputs: []*tx.TxInput{{
				TxHash:    []byte("afef"),
				OutIdx:    1,
				Signature: []byte("aefeadfsdaf"),
			}},
			Outputs: []*tx.TxOutput{{
				Addr:   []byte("adafdsaf"),
				Amount: 20,
			}},
		},
	}

	b, err := block.New(myAddr, txs, prevHash, 0)
	if !assert.NoError(t, err) {
		return
	}

	valid := b.ValidateDataHash()
	assert.True(t, valid)
}
