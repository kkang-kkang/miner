package tx_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"miner/internal/tx"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTx(t *testing.T) {
	privKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	var (
		got   uint64 = 40
		spent uint64 = 30
	)

	uTxOuts := []*tx.UTxOutput{
		{
			TxHash: []byte("asdfasdfasdfsadfasdf"),
			OutIdx: 0,
			Amount: got,
		},
	}

	tx, err := tx.New(uTxOuts, spent, privKey, []byte("helloThere"), []byte("hithere"))
	if assert.NoError(t, err) {
		// there is one input.
		assert.Len(t, tx.Inputs, 1)

		in := tx.Inputs[0]
		data := in.GetDataBytes()

		// signature is valid.
		valid := ecdsa.VerifyASN1(&privKey.PublicKey, data, in.Signature)
		assert.True(t, valid)

		// there is diff.
		assert.Len(t, tx.Outputs, 2)

		dstOut := tx.Outputs[0]
		srcOut := tx.Outputs[1]

		// dstOut is ok.
		assert.Equal(t, []byte("hithere"), dstOut.Addr)
		assert.Equal(t, uint64(30), dstOut.Amount)

		// srcOut is ok.
		assert.Equal(t, srcOut.Amount, uint64(got-spent))
	}
}
