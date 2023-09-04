package network

import (
	"encoding/json"
	"miner/internal/promise"
	"miner/pkg/network/internal/conn"
	"syscall/js"
)

func InitRTCConn() any {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return promise.New(promise.NewPromiseHandler(func(resolve, reject js.Value) any {
			connection, err := conn.CreatePeer()
			if err != nil {
				return reject.Invoke(err)
			}

			js.Global().Get("console").Get("log").Invoke(json.Marshal(connection))

			// create connections with other peers
			// 

			return resolve.Invoke()
		}))
	})
}
