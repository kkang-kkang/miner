package key

import (
	"crypto/ecdsa"

	"github.com/pkg/errors"
)

func marshalECDSAPublicKey(key *ecdsa.PublicKey) ([]byte, error) {
	ecdhKey, err := key.ECDH()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get ecdh key")
	}
	return ecdhKey.Bytes(), nil
}

func marshalECDSAPrivateKey(key *ecdsa.PrivateKey) ([]byte, error) {
	ecdhKey, err := key.ECDH()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get ecdh key")
	}
	return ecdhKey.Bytes(), nil
}
