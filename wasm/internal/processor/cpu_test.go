package processor_test

import (
	"context"
	"testing"

	"miner/internal/misc/util"
	"miner/internal/processor"

	"github.com/stretchr/testify/assert"
	"go.uber.org/goleak"
)

func TestFindNonce(t *testing.T) {
	defer goleak.VerifyNone(t)

	b := []byte{0x11, 0x53, 0x42, 0xFF, 0xEA}
	_, candidateStream, result := processor.FindNonceUsingCPU(context.Background(), b, 12)

	for {
		select {
		case candidate := <-candidateStream:
			t.Logf("%x", candidate)
		case r := <-result:
			assert.True(t, util.CheckPrefix(r.Hash, 8))

			t.Logf("%x", r.Hash)
			t.Log(r.Nonce)
			return
		}
	}

}
