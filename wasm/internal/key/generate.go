package key

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"miner/internal/hash"

	"github.com/pkg/errors"
)

type Pair struct {
	PublicKey  hash.Hash `json:"publicKey"`
	PrivateKey hash.Hash `json:"privateKey"`
}

func Generate() (*Pair, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create ecdsa key")
	}

	privKey, err := marshalECDSAPrivateKey(key)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal ecdsa private key")
	}

	publicKey, err := marshalECDSAPublicKey(&key.PublicKey)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal ecdsa public key")
	}

	return &Pair{
		PublicKey:  publicKey,
		PrivateKey: privKey,
	}, nil
}
