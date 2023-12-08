package key

import (
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/x509"
	"math/big"
	"miner/internal/misc/util"

	"github.com/pkg/errors"
)

func ParseECDSAPublicKey(b []byte) (*ecdsa.PublicKey, error) {
	b, err := util.DecodeHex(b)
	if err != nil {
		return nil, err
	}

	return parsePublic(b)
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

	pubKey, err := parsePublic(key.PublicKey().Bytes())
	if err != nil {
		return nil, err
	}

	privKey := &ecdsa.PrivateKey{
		PublicKey: *pubKey,
		D:         new(big.Int).SetBytes(key.Bytes()),
	}

	return privKey, nil
}

func parsePublic(b []byte) (*ecdsa.PublicKey, error) {
	key, err := x509.ParsePKIXPublicKey(b)
	if err != nil {
		return nil, errors.Wrap(err, "cannot create ecdsa public key from bytes")
	}

	ecdsaKey, ok := key.(*ecdsa.PublicKey)
	if !ok {
		return nil, errors.New("key is not type of ecdsa.PublicKey")
	}
	return ecdsaKey, nil
}
