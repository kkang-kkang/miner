package util_test

import (
	"crypto/rand"
	"miner/internal/misc/util"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCheckPrefix(t *testing.T) {
	difficulty := 16

	t.Run("ok", func(t *testing.T) {
		bytes := []byte{
			0x00,
			0x00,
			0xf1,
			0x95,
		}

		ok := util.CheckPrefix(bytes, uint8(difficulty))
		assert.True(t, ok)
	})

	t.Run("not ok", func(t *testing.T) {
		bytes := []byte{
			0x01,
			0x00,
			0x51,
			0x95,
		}

		ok := util.CheckPrefix(bytes, uint8(difficulty))
		assert.False(t, ok)
	})
}

func BenchmarkCheckPrefix(b *testing.B) {
	const diff = 32
	bytes := make([]byte, 32)
	rand.Read(bytes)

	for i := 0; i < b.N; i++ {
		util.CheckPrefix(bytes, diff)
	}
}
