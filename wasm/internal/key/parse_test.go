package key_test

import (
	"miner/internal/key"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseECDSAPublicKey(t *testing.T) {
	k := "0495da71c13a4b1b8c0847b2ad4ba93c353d925385dc3c50ced0d9c40f7b86127fad5a968ba25fd035e5a80f155ace52e7c06f4cc53f7a12d222e7206a094f75f4"
	key, err := key.ParseECDSAPublicKey([]byte(k))
	assert.NoError(t, err)
	assert.NotNil(t, key)
}

func TestParseECDSAPrivateKey(t *testing.T) {
	k := "db63fbe51f69ac44a966a1b18bd5c1b661c19dea3a615da1ee9550b2692b2761"
	key, err := key.ParseECDSAPrivateKey([]byte(k))
	assert.NoError(t, err)
	assert.NotNil(t, key)
}
