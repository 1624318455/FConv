/**
 * FConv 增强模块 - 可用性和识别准确率优化
 */

const ImagePreprocessor = {
    toGrayscale(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    },

    enhanceContrast(canvas, contrast = 1.5) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    },

    sharpen(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const tempData = new Uint8ClampedArray(data);
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    data[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    },

    preprocess(canvas, options = {}) {
        if (options.grayscale !== false) {
            this.toGrayscale(canvas);
        }
        if (options.contrast !== false) {
            this.enhanceContrast(canvas, 1.3);
        }
        if (options.sharpen !== false) {
            this.sharpen(canvas);
        }
        return canvas;
    }
};

const OCROptimizer = {
    defaultSettings: {
        enablePreprocess: true,
        ocrMode: 'auto',
        ocrLang: 'eng+chi_sim',
        enableWatermark: true,
        enablePunctuation: true,
        confidenceThreshold: 45
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('fconv_settings');
            return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
        } catch {
            return this.defaultSettings;
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem('fconv_settings', JSON.stringify(settings));
        } catch (e) {}
    },

    getPSM(mode) {
        const psmMap = {
            'auto': '6',
            'single': '7',
            'sparse': '11',
            'accurate': '3'
        };
        return psmMap[mode] || '6';
    },

    async createOptimizedWorker(settings) {
        const worker = await Tesseract.createWorker();
        await worker.load();
        await worker.loadLanguage(settings.ocrLang);
        await worker.initialize(settings.ocrLang);
        await worker.setParameters({
            tessedit_pageseg_mode: this.getPSM(settings.ocrMode),
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: ''
        });
        return worker;
    }
};

const PostProcessor = {
    recoverPunctuation(text) {
        const rules = [
            { pattern: /([。！？])\s*/g, replacement: '$1\n' },
            { pattern: /([,.，])([A-Za-z0-9\u4e00-\u9fa5])/g, replacement: '$1 $2' },
            { pattern: /([、·])\s*/g, replacement: '$1 ' },
            { pattern: /([（\[{])\s*/g, replacement: '$1' },
            { pattern: /\s*([）\]}])/g, replacement: '$1' },
            { pattern: /([：;；])\s*/g, replacement: '$1 ' },
            { pattern: /"\s*([^"]+)\s*"/g, replacement: '"$1"' },
            { pattern: /'\s*([^']+)\s*'/g, replacement: "'$1'" }
        ];
        let result = text;
        rules.forEach(rule => {
            result = result.replace(rule.pattern, rule.replacement);
        });
        return result;
    },

    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    },

    filterWatermark(words, imgWidth, imgHeight, settings) {
        if (!words || words.length === 0 || !settings.enableWatermark) return words;
        
        const threshold = settings.confidenceThreshold || 45;
        const avgHeight = words.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / words.length;
        
        const watermarkKeywords = [
            '试用版', '演示版', 'sample', 'draft', 'confidential', 
            '内部资料', '水印', '预览', 'trial', '测试版', 'beta',
            'confidential', 'proprietary', 'do not copy'
        ];
        
        return words.filter(word => {
            if (word.confidence < threshold) return false;
            
            const bbox = word.bbox;
            const isAtEdge = bbox.x0 < imgWidth * 0.08 || bbox.x1 > imgWidth * 0.92 ||
                             bbox.y0 < imgHeight * 0.08 || bbox.y1 > imgHeight * 0.92;
            if (isAtEdge) return false;
            
            const wordHeight = bbox.y1 - bbox.y0;
            if (wordHeight < avgHeight * 0.4) return false;
            
            const wordText = word.text.toLowerCase();
            if (watermarkKeywords.some(kw => wordText.includes(kw))) return false;
            
            return true;
        });
    },

    process(text, words, imgWidth, imgHeight, settings) {
        let result = text;
        
        if (settings.enablePunctuation) {
            result = this.recoverPunctuation(result);
        }
        
        result = this.cleanText(result);
        
        return result;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ImagePreprocessor,
        OCROptimizer,
        PostProcessor
    };
}
