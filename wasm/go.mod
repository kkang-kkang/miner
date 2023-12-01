module miner

go 1.20

require (
	github.com/cbergoon/merkletree v0.2.0
	github.com/hack-pad/go-indexeddb v0.3.2
	github.com/mokiat/gog v0.9.2
	github.com/mokiat/wasmgpu v0.0.0-20230730193614-46ebe799070a
	github.com/pkg/errors v0.9.1
	github.com/stretchr/testify v1.8.4
	go.uber.org/goleak v1.3.0
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/hack-pad/safejs v0.1.0 // indirect
	github.com/kr/text v0.1.0 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	gopkg.in/check.v1 v1.0.0-20190902080502-41f04d3bba15 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

replace github.com/mokiat/wasmgpu => github.com/hulkholden/wasmgpu v0.0.0-20231122081935-6fff6aa1eaa2
