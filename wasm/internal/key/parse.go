package key

import (
	"crypto/ecdsa"
	"crypto/x509"

	"github.com/pkg/errors"
)

func ParseECDSAPublicKey(b []byte) (*ecdsa.PublicKey, error) {
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

func ParseECDSAPrivateKey(b []byte) (*ecdsa.PrivateKey, error) {
	key, err := x509.ParseECPrivateKey(b)
	if err != nil {
		return nil, errors.Wrap(err, "cannot create ecdsa private key from bytes")
	}
	return key, nil
}
