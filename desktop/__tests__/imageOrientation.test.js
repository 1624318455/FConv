/**
 * FConv 图片方向校正模块 - 单元测试
 */

const {
    getExifOrientation,
    filterWatermark,
    EXIF_ORIENTATION
} = require('../imageOrientation.js');

function createMinimalJpeg() {
    return new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0xFF, 0xD9
    ]).buffer;
}

function createJpegWithApp1Exif(orientation) {
    const exifData = [];
    
    exifData.push(0xFF, 0xE1);
    const app1LengthIdx = exifData.length;
    exifData.push(0x00, 0x00);
    
    exifData.push(0x45, 0x78, 0x69, 0x66, 0x00, 0x00);
    
    exifData.push(0x49, 0x49, 0x2A, 0x00);
    exifData.push(0x08, 0x00, 0x00, 0x00);
    
    exifData.push(0x01, 0x00);
    exifData.push(0x12, 0x01);
    exifData.push(0x03, 0x00);
    exifData.push(0x01, 0x00, 0x00, 0x00);
    exifData.push(orientation & 0xFF, 0x00, 0x00, 0x00);
    
    exifData.push(0x00, 0x00, 0x00, 0x00);
    
    const app1Length = exifData.length - 2 + 2;
    exifData[app1LengthIdx] = (app1Length >> 8) & 0xFF;
    exifData[app1LengthIdx + 1] = app1Length & 0xFF;
    
    const result = new Uint8Array(2 + app1Length + 2);
    result[0] = 0xFF;
    result[1] = 0xD8;
    result.set(new Uint8Array(exifData), 2);
    result[result.length - 2] = 0xFF;
    result[result.length - 1] = 0xD9;
    
    return result.buffer;
}

function createJpegWithoutExif() {
    return new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0x18, 0xA5, 0x7F, 0xFF,
        0xD9
    ]).buffer;
}

describe('EXIF Orientation Detection', () => {
    test('should return 1 for minimal valid JPEG', async () => {
        const buffer = createMinimalJpeg();
        const orientation = await getExifOrientation(buffer);
        expect(orientation).toBe(1);
    });

    test('should return 1 for JPEG without EXIF', async () => {
        const buffer = createJpegWithoutExif();
        const orientation = await getExifOrientation(buffer);
        expect(orientation).toBe(1);
    });

    test('should return 1 for non-JPEG data', async () => {
        const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
        const orientation = await getExifOrientation(buffer);
        expect(orientation).toBe(1);
    });

    test('should return 1 for empty buffer', async () => {
        const buffer = new Uint8Array([]).buffer;
        const orientation = await getExifOrientation(buffer);
        expect(orientation).toBe(1);
    });
});

describe('EXIF_ORIENTATION constants', () => {
    test('should have correct values for all orientations', () => {
        expect(EXIF_ORIENTATION.NORMAL).toBe(1);
        expect(EXIF_ORIENTATION.HORIZONTAL_FLIP).toBe(2);
        expect(EXIF_ORIENTATION.ROTATE_180).toBe(3);
        expect(EXIF_ORIENTATION.VERTICAL_FLIP).toBe(4);
        expect(EXIF_ORIENTATION.HORIZONTAL_FLIP_ROTATE_270_CW).toBe(5);
        expect(EXIF_ORIENTATION.ROTATE_90_CW).toBe(6);
        expect(EXIF_ORIENTATION.HORIZONTAL_FLIP_ROTATE_90_CW).toBe(7);
        expect(EXIF_ORIENTATION.ROTATE_270_CW).toBe(8);
    });

    test('should have 8 orientation values', () => {
        const keys = Object.keys(EXIF_ORIENTATION);
        expect(keys).toHaveLength(8);
    });
});

describe('Watermark Filtering', () => {
    test('should filter words with low confidence', () => {
        const words = [
            { text: 'Hello', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'World', confidence: 30, bbox: { x0: 100, y0: 200, x1: 200, y1: 250 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Hello');
    });

    test('should filter words at left edge', () => {
        const words = [
            { text: 'Normal', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'Edge', confidence: 90, bbox: { x0: 10, y0: 100, x1: 110, y1: 150 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Normal');
    });

    test('should filter words at right edge', () => {
        const words = [
            { text: 'Normal', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'Edge', confidence: 90, bbox: { x0: 920, y0: 100, x1: 980, y1: 150 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Normal');
    });

    test('should filter words at top edge', () => {
        const words = [
            { text: 'Normal', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'Edge', confidence: 90, bbox: { x0: 100, y0: 10, x1: 200, y1: 60 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Normal');
    });

    test('should filter words at bottom edge', () => {
        const words = [
            { text: 'Normal', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'Edge', confidence: 90, bbox: { x0: 100, y0: 940, x1: 200, y1: 990 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Normal');
    });

    test('should filter tiny words', () => {
        const words = [
            { text: 'Normal', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
            { text: 'Tiny', confidence: 90, bbox: { x0: 300, y0: 100, x1: 310, y1: 105 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Normal');
    });

    test('should return empty array for null words', () => {
        const result = filterWatermark(null, 1000, 1000);
        expect(result).toEqual([]);
    });

    test('should return empty array for empty words', () => {
        const result = filterWatermark([], 1000, 1000);
        expect(result).toEqual([]);
    });

    test('should pass through valid words', () => {
        const words = [
            { text: 'Document', confidence: 95, bbox: { x0: 200, y0: 200, x1: 500, y1: 300 } },
            { text: 'Content', confidence: 88, bbox: { x0: 250, y0: 350, x1: 450, y1: 420 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(2);
    });

    test('should filter watermark keywords (sample)', () => {
        const words = [
            { text: 'Valid', confidence: 90, bbox: { x0: 200, y0: 200, x1: 400, y1: 250 } },
            { text: 'sample', confidence: 90, bbox: { x0: 500, y0: 200, x1: 700, y1: 250 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Valid');
    });

    test('should filter watermark keywords (draft)', () => {
        const words = [
            { text: 'Important', confidence: 90, bbox: { x0: 200, y0: 200, x1: 500, y1: 300 } },
            { text: 'draft', confidence: 90, bbox: { x0: 600, y0: 200, x1: 800, y1: 300 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Important');
    });

    test('should filter Chinese watermark keywords (水印)', () => {
        const words = [
            { text: '测试', confidence: 90, bbox: { x0: 200, y0: 200, x1: 400, y1: 300 } },
            { text: '水印', confidence: 90, bbox: { x0: 500, y0: 200, x1: 700, y1: 300 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('测试');
    });

    test('should filter Chinese watermark keywords (试用版)', () => {
        const words = [
            { text: '正文', confidence: 90, bbox: { x0: 200, y0: 200, x1: 400, y1: 300 } },
            { text: '试用版', confidence: 90, bbox: { x0: 500, y0: 200, x1: 700, y1: 300 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('正文');
    });

    test('should filter confidence exactly at threshold', () => {
        const words = [
            { text: 'High', confidence: 50, bbox: { x0: 200, y0: 200, x1: 400, y1: 300 } },
            { text: 'Low', confidence: 44, bbox: { x0: 500, y0: 200, x1: 700, y1: 300 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('High');
    });

    test('should handle mixed valid and invalid words', () => {
        const words = [
            { text: 'Valid1', confidence: 95, bbox: { x0: 200, y0: 200, x1: 400, y1: 300 } },
            { text: 'Invalid', confidence: 30, bbox: { x0: 500, y0: 200, x1: 700, y1: 300 } },
            { text: 'Valid2', confidence: 80, bbox: { x0: 200, y0: 400, x1: 400, y1: 500 } }
        ];
        const result = filterWatermark(words, 1000, 1000);
        expect(result).toHaveLength(2);
    });
});

describe('Module exports', () => {
    test('should export getExifOrientation function', () => {
        expect(typeof getExifOrientation).toBe('function');
    });

    test('should export filterWatermark function', () => {
        expect(typeof filterWatermark).toBe('function');
    });

    test('should export EXIF_ORIENTATION constants', () => {
        expect(typeof EXIF_ORIENTATION).toBe('object');
    });
});
