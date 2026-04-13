/**
 * FConv 增强模块 - 单元测试
 */

const { ImagePreprocessor, OCROptimizer, PostProcessor } = require('../fconv-enhance.js');

describe('PostProcessor', () => {
    test('should add space after comma', () => {
        const input = 'abc,def';
        const result = PostProcessor.recoverPunctuation(input);
        expect(result).toBe('abc, def');
    });

    test('should add space after Chinese comma', () => {
        const input = '你好，世界';
        const result = PostProcessor.recoverPunctuation(input);
        expect(result).toBe('你好， 世界');
    });

    test('should clean text', () => {
        const input = 'abc,def';
        const result = PostProcessor.recoverPunctuation(input);
        expect(result).toBe('abc, def');
    });

    test('should clean text', () => {
        const input = '  多个   空格  和\n\n\n换行  ';
        const result = PostProcessor.cleanText(input);
        expect(result).toBe('多个 空格 和\n\n换行');
    });

    test('should clean text with CRLF', () => {
        const input = 'Line1\r\nLine2\r\nLine3';
        const result = PostProcessor.cleanText(input);
        expect(result).toContain('Line1');
    });
});

describe('OCROptimizer', () => {
    test('should load default settings', () => {
        const defaults = OCROptimizer.defaultSettings;
        expect(defaults.confidenceThreshold).toBe(45);
        expect(defaults.enableWatermark).toBe(true);
        expect(defaults.enablePunctuation).toBe(true);
    });

    test('should get PSM for auto mode', () => {
        expect(OCROptimizer.getPSM('auto')).toBe('6');
    });

    test('should get PSM for single line mode', () => {
        expect(OCROptimizer.getPSM('single')).toBe('7');
    });

    test('should get PSM for accurate mode', () => {
        expect(OCROptimizer.getPSM('accurate')).toBe('3');
    });

    test('should get default PSM for unknown mode', () => {
        expect(OCROptimizer.getPSM('unknown')).toBe('6');
    });
});

describe('ImagePreprocessor', () => {
    test('should have toGrayscale method', () => {
        expect(typeof ImagePreprocessor.toGrayscale).toBe('function');
    });

    test('should have enhanceContrast method', () => {
        expect(typeof ImagePreprocessor.enhanceContrast).toBe('function');
    });

    test('should have sharpen method', () => {
        expect(typeof ImagePreprocessor.sharpen).toBe('function');
    });

    test('should have preprocess method', () => {
        expect(typeof ImagePreprocessor.preprocess).toBe('function');
    });
});

describe('Module exports', () => {
    test('should export ImagePreprocessor', () => {
        expect(typeof ImagePreprocessor).toBe('object');
    });

    test('should export OCROptimizer', () => {
        expect(typeof OCROptimizer).toBe('object');
    });

    test('should export PostProcessor', () => {
        expect(typeof PostProcessor).toBe('object');
    });
});
