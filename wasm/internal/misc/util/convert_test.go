package util_test

import (
	"miner/internal/misc/util"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStrToBytes(t *testing.T) {
	str := "hithere"
	bytes := util.StrToBytes(str)

	assert.IsType(t, []byte{}, bytes)
	assert.Equal(t, []byte(str), bytes)
}

func BenchmarkStrToBytes(b *testing.B) {
	str := "aekfjahelfkahflekajfhaklfjhalkefjhawlkefjahflkeajhfljkehflkajfhelajfheljah"
	for i := 0; i < b.N; i++ {
		util.StrToBytes(str)
	}
}
