package util

const byteSize = 8

func CheckPrefix(hash []byte, difficulty uint8) bool {
	var mask byte
	for _, b := range hash {
		if difficulty == 0 {
			break
		}

		diff := difficulty
		if diff > byteSize {
			diff = byteSize
		}

		mask = (1 << (byteSize - diff)) - 1
		if mask|b != mask {
			return false
		}

		difficulty -= diff
	}

	return true
}
