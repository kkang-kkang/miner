package tx

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/gob"

	"github.com/cbergoon/merkletree"
	"github.com/pkg/errors"

	"miner/internal/hash"
	"miner/internal/key"
)

// TxInput is used in transaction to determine which transaction output
// is used in this transaction.
type TxInput struct {
	TxHash    hash.Hash `json:"txHash"`
	OutIdx    uint16    `json:"outIdx"`
	Signature hash.Hash `json:"sig"`
}

func (in *TxInput) GetDataBytes() ([]byte, error) {
	buf := bytes.NewBuffer(nil)

	if _, err := buf.Write(in.TxHash); err != nil {
		return nil, errors.Wrap(err, "failed to write txHash")
	}

	if err := binary.Write(buf, binary.LittleEndian, in.OutIdx); err != nil {
		return nil, errors.Wrap(err, "failed to write outIdx")
	}

	return buf.Bytes(), nil
}

// TxOutput is result of the transaction.
type TxOutput struct {
	Addr   hash.Hash `json:"addr"`
	Amount uint64    `json:"amount"`
}

// UTxOutput is unspent transaction output.
type UTxOutput struct {
	TxHash hash.Hash
	OutIdx uint16
	Amount uint64
}

// Transactions is data of the blockchain.
type Transaction struct {
	Hash    hash.Hash   `json:"hash"`
	Inputs  []*TxInput  `json:"inputs"`
	Outputs []*TxOutput `json:"outputs"`
}

func New(uTxOuts []*UTxOutput, amount uint64, privKey *ecdsa.PrivateKey, dstAddr []byte) (*Transaction, error) {
	tx := &Transaction{
		Inputs:  make([]*TxInput, 0, len(uTxOuts)),
		Outputs: make([]*TxOutput, 0),
	}

	var sum uint64
	for _, out := range uTxOuts {
		input := &TxInput{
			TxHash: out.TxHash,
			OutIdx: out.OutIdx,
		}

		b, err := input.GetDataBytes()
		if err != nil {
			return nil, err
		}

		signature, err := ecdsa.SignASN1(rand.Reader, privKey, b)
		if err != nil {
			return nil, errors.Wrap(err, "failed to sign")
		}

		input.Signature = signature

		tx.Inputs = append(tx.Inputs, input)
		sum += out.Amount
	}

	dstOut := &TxOutput{
		Addr:   dstAddr,
		Amount: amount,
	}

	tx.Outputs = append(tx.Outputs, dstOut)

	if diff := sum - amount; diff > 0 {
		addr, err := key.MarshalECDSAPublicKey(&privKey.PublicKey)
		if err != nil {
			return nil, errors.Wrap(err, "failed to get src address")
		}

		srcOut := &TxOutput{
			Addr:   addr,
			Amount: diff,
		}

		tx.Outputs = append(tx.Outputs, srcOut)
	}

	hash, err := tx.MakeHash()
	if err != nil {
		return nil, errors.Wrap(err, "failed to make hash of tx")
	}

	tx.Hash = hash

	return tx, nil
}

func (tx *Transaction) ValidateHash() bool {
	hash, err := tx.MakeHash()
	if err != nil {
		return false
	}
	return bytes.Equal(tx.Hash, hash)
}

func (tx *Transaction) MakeHash() ([]byte, error) {
	hash := sha256.New()
	buf := bytes.NewBuffer(nil)
	enc := gob.NewEncoder(buf)

	if err := enc.Encode(tx.Inputs); err != nil {
		return nil, errors.Wrap(err, "failed to encode tx inputs")
	}

	if _, err := hash.Write(buf.Bytes()); err != nil {
		return nil, errors.Wrap(err, "failed to write hash")
	}

	buf.Reset()

	if err := enc.Encode(tx.Outputs); err != nil {
		return nil, errors.Wrap(err, "failed to encode tx outputs")
	}

	if _, err := hash.Write(buf.Bytes()); err != nil {
		return nil, errors.Wrap(err, "failed to write hash")
	}

	return hash.Sum(nil), nil
}

func (tx *Transaction) CalculateHash() ([]byte, error) {
	return tx.Hash, nil
}

func (tx *Transaction) Equals(other merkletree.Content) (bool, error) {
	otherTx, ok := other.(*Transaction)
	if !ok {
		return false, errors.New("value is not type of *tx.Transaction")
	}
	return bytes.Equal(tx.Hash, otherTx.Hash), nil
}
