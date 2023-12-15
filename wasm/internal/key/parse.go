package key

import (
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"math/big"
	"miner/internal/misc/util"

	"github.com/pkg/errors"
)

func ParseECDSAPublicKey(b []byte) (*ecdsa.PublicKey, error) {
	b, err := util.DecodeHex(b)
	if err != nil {
		return nil, err
	}

	key, err := ecdh.P256().NewPublicKey(b)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate public key from bytes")
	}

	return ecdhPublicToEcdsa(key), nil
}

func ParseECDSAPrivateKey(b []byte) (*ecdsa.PrivateKey, error) {
	b, err := util.DecodeHex(b)
	if err != nil {
		return nil, err
	}

	key, err := ecdh.P256().NewPrivateKey(b)
	if err != nil {
		return nil, errors.Wrap(err, "cannot create ecdsa private key from bytes")
	}

	pubKey := ecdhPublicToEcdsa(key.PublicKey())
	privKey := &ecdsa.PrivateKey{
		PublicKey: *pubKey,
		D:         new(big.Int).SetBytes(key.Bytes()),
	}

	return privKey, nil
}

func ecdhPublicToEcdsa(key *ecdh.PublicKey) *ecdsa.PublicKey {
	b := key.Bytes()
	return &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     big.NewInt(0).SetBytes(b[1:33]),
		Y:     big.NewInt(0).SetBytes(b[33:]),
	}
}
