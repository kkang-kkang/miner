package processor

import (
	"context"
	_ "embed"
	"syscall/js"

	"github.com/mokiat/gog/opt"
	"github.com/mokiat/wasmgpu"
)

const (
	x = 8
	y = 8

	cntPerCore   = 100
	gpuBatchSize = x * y * cntPerCore
)

//go:embed process.wgsl
var code string

func FindNonceUsingGPU(ctx context.Context, data []byte, difficulty uint8) (_ chan uint32) {
	dataUint32 := bytesToUint32Arr(data)

	device := wasmgpu.NewDevice(js.Global().Call("getDevice"))
	shaderModule := device.CreateShaderModule(wasmgpu.GPUShaderModuleDescriptor{Code: code})

	pipeline := device.CreateComputePipeline(wasmgpu.GPUComputePipelineDescriptor{
		Compute: wasmgpu.GPUProgrammableStage{
			Module:     shaderModule,
			EntryPoint: "main",
		},
	})

	inputBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:             wasmgpu.GPUSize64(len(data) * 4),
		Usage:            wasmgpu.GPUBufferUsageFlagsStorage,
		MappedAtCreation: opt.V(true),
	})
	uint32Array(inputBuf.GetMappedRange(0, 0)).Call("set", dataUint32)
	inputBuf.Unmap()

	prefixBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:             wasmgpu.GPUSize64(4),
		Usage:            wasmgpu.GPUBufferUsageFlagsStorage,
		MappedAtCreation: opt.V(true),
	})
	uint32Array(prefixBuf.GetMappedRange(0, 0)).Call("set", []interface{}{uint32(difficulty)})
	prefixBuf.Unmap()

	inputSizeBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:             wasmgpu.GPUSize64(4),
		Usage:            wasmgpu.GPUBufferUsageFlagsStorage,
		MappedAtCreation: opt.V(true),
	})
	uint32Array(inputSizeBuf.GetMappedRange(0, 0)).Call("set", []interface{}{uint32(len(data) + 4)})
	inputSizeBuf.Unmap()

	resultBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:             wasmgpu.GPUSize64(4),
		Usage:            wasmgpu.GPUBufferUsageFlagsStorage | wasmgpu.GPUBufferUsageFlagsCopySrc,
		MappedAtCreation: opt.V(true),
	})
	resultBuf.Unmap()

	startBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:  wasmgpu.GPUSize64(4),
		Usage: wasmgpu.GPUBufferUsageFlagsStorage | wasmgpu.GPUBufferUsageFlagsCopyDst,
	})

	startInputBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:  wasmgpu.GPUSize64(4),
		Usage: wasmgpu.GPUBufferUsageFlagsMapWrite | wasmgpu.GPUBufferUsageFlagsCopySrc,
	})

	tmpBuf := device.CreateBuffer(wasmgpu.GPUBufferDescriptor{
		Size:  wasmgpu.GPUSize64(4),
		Usage: wasmgpu.GPUBufferUsageFlagsCopyDst | wasmgpu.GPUBufferUsageFlagsMapRead,
	})

	result := make(chan uint32, 1)

	go func() {
		defer close(result)

		defer inputBuf.Destroy()
		defer prefixBuf.Destroy()
		defer inputSizeBuf.Destroy()
		defer resultBuf.Destroy()
		defer tmpBuf.Destroy()

		start, n := uint32(0), uint32(0)
		for n == 0 {
			mapBuffer(startInputBuf, wasmgpu.GPUMapModeFlagsWrite, 4, func(arr js.Value) {
				arr.Call("set", []interface{}{start})
			})

			copyCmd := createCopyCmd(device, startInputBuf, startBuf, 4)
			device.Queue().Submit([]wasmgpu.GPUCommandBuffer{copyCmd})

			bindGroup := device.CreateBindGroup(wasmgpu.GPUBindGroupDescriptor{
				Layout: pipeline.GetBindGroupLayout(0),
				Entries: []wasmgpu.GPUBindGroupEntry{
					{
						Binding:  0,
						Resource: wasmgpu.GPUBufferBinding{Buffer: inputBuf},
					},
					{
						Binding:  1,
						Resource: wasmgpu.GPUBufferBinding{Buffer: inputSizeBuf},
					},
					{
						Binding:  2,
						Resource: wasmgpu.GPUBufferBinding{Buffer: resultBuf},
					},
					{
						Binding:  3,
						Resource: wasmgpu.GPUBufferBinding{Buffer: startBuf},
					},
					{
						Binding:  4,
						Resource: wasmgpu.GPUBufferBinding{Buffer: prefixBuf},
					},
				},
			})

			cmdEncoder := device.CreateCommandEncoder()

			pass := cmdEncoder.BeginComputePass(opt.V(wasmgpu.GPUComputePassDescriptor{}))
			pass.SetPipeline(pipeline)
			pass.SetBindGroup(0, bindGroup, []wasmgpu.GPUBufferDynamicOffset{})
			pass.DispatchWorkgroups(1, 1, 0)
			pass.End()

			waitUntilWorkDone(device)
			device.Queue().Submit([]wasmgpu.GPUCommandBuffer{cmdEncoder.Finish()})

			copyCmd = createCopyCmd(device, resultBuf, tmpBuf, 4)
			waitUntilWorkDone(device)
			device.Queue().Submit([]wasmgpu.GPUCommandBuffer{copyCmd})

			mapBuffer(tmpBuf, wasmgpu.GPUMapModeFlagsRead, 4, func(arr js.Value) {
				nonce := uint32(arr.Index(0).Int())
				if nonce != 0 {
					result <- nonce
				}
			})

			select {
			case n = <-result:
				result <- n
			default:
			}

			start += gpuBatchSize
		}
	}()

	return result
}

func waitUntilWorkDone(device wasmgpu.GPUDevice) {
	done := make(chan struct{})
	device.Queue().ToJS().(js.Value).Call("onSubmittedWorkDone").Call("then",
		js.FuncOf(func(this js.Value, args []js.Value) any {
			done <- struct{}{}
			return nil
		}))
	<-done
}

func mapBuffer(buf wasmgpu.GPUBuffer, mode wasmgpu.GPUMapModeFlags, size wasmgpu.GPUSize64, f func(arr js.Value)) {
	done := make(chan struct{})
	buf.MapAsync(mode, 0, size).Call("then",
		js.FuncOf(func(this js.Value, args []js.Value) any {
			defer buf.Unmap()
			defer func() { done <- struct{}{} }()

			arr := uint32Array(buf.GetMappedRange(0, 0))
			f(arr)

			return nil
		}))
	<-done
}

func createCopyCmd(
	device wasmgpu.GPUDevice,
	src wasmgpu.GPUBuffer,
	dst wasmgpu.GPUBuffer,
	size wasmgpu.GPUSize64,
) wasmgpu.GPUCommandBuffer {
	copyCmdEncoder := device.CreateCommandEncoder()
	copyCmdEncoder.CopyBufferToBuffer(src, 0, dst, 0, size)
	return copyCmdEncoder.Finish()
}

func bytesToUint32Arr(b []byte) (arr []interface{}) {
	arr = make([]interface{}, len(b))
	for i := 0; i < len(arr); i++ {
		arr[i] = uint32(b[i])
	}
	return
}

func uint32Array(args ...any) js.Value { return js.Global().Get("Uint32Array").New(args...) }
