package key

import (
	"crypto/ecdsa"
	"miner/internal/misc/util"

	"github.com/pkg/errors"
)

func MarshalECDSAPublicKey(key *ecdsa.PublicKey) ([]byte, error) {
	ecdhKey, err := key.ECDH()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get ecdh key")
	}
	return util.EncodeHex(ecdhKey.Bytes()), nil
}

func MarshalECDSAPrivateKey(key *ecdsa.PrivateKey) ([]byte, error) {
	ecdhKey, err := key.ECDH()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get ecdh key")
	}
	return util.EncodeHex(ecdhKey.Bytes()), nil
}
