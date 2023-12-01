package processor

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"runtime"

	"miner/internal/misc/util"
)

const batchSize = 5000

type Result struct {
	Hash  []byte
	Nonce uint64
}

// TODO: this should be refactored.
func FindNonceUsingCPU(ctx context.Context, data []byte, difficulty uint8) (procCnt uint32, _ <-chan []byte, _ <-chan Result) {
	procCnt = uint32(runtime.GOMAXPROCS(0))

	candidateStream := make(chan []byte)
	result := make(chan Result)

	ctx, cancel := context.WithCancel(ctx)
	go func() {
		finished := make(chan struct{})

		defer close(candidateStream)
		defer close(result)
		defer close(finished)

		var nonce uint64
		for i := uint32(0); i < procCnt; i++ {
			go makeRunner(ctx, data, nonce, difficulty, cancel, candidateStream, result, finished)
			nonce += batchSize
		}

		for {
			select {
			case r := <-result:
				result <- r
				return
			case <-finished:
				go makeRunner(ctx, data, nonce, difficulty, cancel, candidateStream, result, finished)
				nonce += batchSize
			}
		}
	}()

	return procCnt, candidateStream, result
}

func makeRunner(ctx context.Context, data []byte, nonce uint64, diff uint8, cancel func(), candidateStream chan<- []byte, result chan<- Result, finished chan<- struct{}) {
	done := make(chan struct{})
	defer close(done)

	candStream, res := findUsingCPU(data, nonce, diff, done)
	for {
		select {
		case <-ctx.Done():
			done <- struct{}{}
			return
		case candidate := <-candStream:
			select {
			case <-ctx.Done():
				done <- struct{}{}
				return
			case candidateStream <- candidate:
			default:
			}
		case r := <-res:
			select {
			case <-ctx.Done():
				done <- struct{}{}
				return
			default:
			}

			if r.Hash == nil {
				finished <- struct{}{}
				return
			}
			cancel()
			result <- r

		}
	}
}

func findUsingCPU(data []byte, nonce uint64, difficulty uint8, done <-chan struct{}) (_ <-chan []byte, _ <-chan Result) {
	limit := nonce + batchSize

	candidateStream := make(chan []byte)
	result := make(chan Result)

	go func() {
		defer close(candidateStream)
		defer close(result)

		hash := sha256.New()
		for nonce < limit {
			if _, err := hash.Write(data); err != nil {
				panic(err)
			}

			if err := binary.Write(hash, binary.LittleEndian, nonce); err != nil {
				panic(err)
			}

			sum := hash.Sum(nil)
			ok := util.CheckPrefix(sum, difficulty)

			select {
			case <-done:
				return
			default:
			}

			if nonce%100 == 0 {
				select {
				case <-done:
					return
				case candidateStream <- sum:
				}
			}

			if ok {
				select {
				case <-done:
				case result <- Result{
					Hash:  sum,
					Nonce: nonce,
				}:
					<-done
				}
				return
			}
			hash.Reset()
			nonce++
		}

		result <- Result{}
	}()

	return candidateStream, result
}
