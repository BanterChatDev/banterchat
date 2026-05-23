package fileutil

import "encoding/binary"

var mp4StripBoxes = map[string]bool{
	"udta": true,
	"meta": true,
	"uuid": true,
}

var mp4ContainerBoxes = map[string]bool{
	"moov": true,
	"trak": true,
	"mdia": true,
	"minf": true,
	"edts": true,
	"stbl": true,
}

func stripMP4(data []byte) ([]byte, bool) {
	out := make([]byte, len(data))
	copy(out, data)
	if !walkMP4(out, 0, len(out)) {
		return nil, false
	}
	return out, true
}

func walkMP4(buf []byte, start, end int) bool {
	i := start
	for i+8 <= end {
		size := int(binary.BigEndian.Uint32(buf[i : i+4]))
		boxType := string(buf[i+4 : i+8])
		headerSize := 8
		boxEnd := 0
		switch {
		case size == 0:
			boxEnd = end
		case size == 1:
			if i+16 > end {
				return false
			}
			large := binary.BigEndian.Uint64(buf[i+8 : i+16])
			if large > uint64(end-i) {
				return false
			}
			boxEnd = i + int(large)
			headerSize = 16
		default:
			if size < 8 || i+size > end {
				return false
			}
			boxEnd = i + size
		}
		if mp4StripBoxes[boxType] {
			copy(buf[i+4:i+8], []byte("free"))
			for k := i + headerSize; k < boxEnd; k++ {
				buf[k] = 0
			}
		} else if mp4ContainerBoxes[boxType] {
			if !walkMP4(buf, i+headerSize, boxEnd) {
				return false
			}
		}
		i = boxEnd
		if size == 0 {
			break
		}
	}
	return true
}