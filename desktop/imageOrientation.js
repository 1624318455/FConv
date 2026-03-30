/**
 * FConv 图片方向自动校正模块
 * 
 * 功能：
 * 1. 解析 JPEG 图片的 EXIF Orientation 标签
 * 2. 根据方向信息旋转图片
 * 3. 集成到 OCR 流程中
 */

const EXIF_ORIENTATION = {
    NORMAL: 1,
    HORIZONTAL_FLIP: 2,
    ROTATE_180: 3,
    VERTICAL_FLIP: 4,
    HORIZONTAL_FLIP_ROTATE_270_CW: 5,
    ROTATE_90_CW: 6,
    HORIZONTAL_FLIP_ROTATE_90_CW: 7,
    ROTATE_270_CW: 8
};

const EXIF_TAG_ORIENTATION = 0x0112;

function getArrayBufferFromSource(source) {
    if (source instanceof ArrayBuffer) {
        return source;
    }
    if (source instanceof Blob) {
        return source.arrayBuffer();
    }
    if (source instanceof File) {
        return source.arrayBuffer();
    }
    if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
        return Promise.reject(new Error('Canvas and Image elements require different handling'));
    }
    return Promise.reject(new Error('Unsupported source type'));
}

function findMarker(data, marker) {
    let i = 0;
    if (data[i++] !== 0xFF || data[i++] !== marker) {
        return -1;
    }
    return i;
}

function readUint16(data, offset, littleEndian) {
    if (littleEndian) {
        return data[offset] | (data[offset + 1] << 8);
    }
    return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data, offset, littleEndian) {
    if (littleEndian) {
        return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
    }
    return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

async function getExifOrientation(buffer) {
    try {
        const data = new Uint8Array(buffer);
        
        if (data[0] !== 0xFF || data[1] !== 0xD8) {
            return 1;
        }
        
        let i = 2;
        while (i < data.length) {
            if (data[i] !== 0xFF) {
                break;
            }
            
            const marker = data[i + 1];
            
            if (marker === 0xE1) {
                const length = readUint16(data, i + 2, false);
                const exifHeader = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
                
                if (exifHeader === 'Exif') {
                    const tiffOffset = i + 10;
                    const littleEndian = data[tiffOffset] === 0x49;
                    
                    const ifdOffset = readUint32(data, tiffOffset + 4, littleEndian);
                    const ifdStart = tiffOffset + ifdOffset;
                    
                    const entries = readUint16(data, ifdStart, littleEndian);
                    
                    for (let j = 0; j < entries; j++) {
                        const entryOffset = ifdStart + 2 + (j * 12);
                        const tag = readUint16(data, entryOffset, littleEndian);
                        
                        if (tag === EXIF_TAG_ORIENTATION) {
                            const type = readUint16(data, entryOffset + 2, littleEndian);
                            if (type === 3) {
                                const value = readUint16(data, entryOffset + 8, littleEndian);
                                return value >= 1 && value <= 8 ? value : 1;
                            }
                        }
                    }
                }
                return 1;
            }
            
            if (marker === 0xD9 || marker === 0xDA) {
                break;
            }
            
            const length = readUint16(data, i + 2, false);
            i += 2 + length;
        }
        
        return 1;
    } catch (error) {
        return 1;
    }
}

function rotateCanvas(canvas, orientation) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width;
    let height = canvas.height;
    
    let rotation = 0;
    let flipHorizontal = false;
    let flipVertical = false;
    
    switch (orientation) {
        case EXIF_ORIENTATION.ROTATE_90_CW:
            rotation = 90;
            break;
        case EXIF_ORIENTATION.ROTATE_180:
            rotation = 180;
            break;
        case EXIF_ORIENTATION.ROTATE_270_CW:
            rotation = 270;
            break;
        case EXIF_ORIENTATION.HORIZONTAL_FLIP:
            flipHorizontal = true;
            break;
        case EXIF_ORIENTATION.VERTICAL_FLIP:
            flipVertical = true;
            break;
        case EXIF_ORIENTATION.HORIZONTAL_FLIP_ROTATE_90_CW:
            rotation = 90;
            flipHorizontal = true;
            break;
        case EXIF_ORIENTATION.HORIZONTAL_FLIP_ROTATE_270_CW:
            rotation = 270;
            flipHorizontal = true;
            break;
        default:
            return canvas;
    }
    
    if (rotation === 90 || rotation === 270) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = height;
        newCanvas.height = width;
        const newCtx = newCanvas.getContext('2d');
        
        newCtx.translate(newCanvas.width / 2, newCanvas.height / 2);
        newCtx.rotate((rotation * Math.PI) / 180);
        newCtx.translate(-canvas.width / 2, -canvas.height / 2);
        
        if (flipHorizontal) {
            newCtx.scale(-1, 1);
            newCtx.translate(-canvas.width, 0);
        }
        
        newCtx.drawImage(canvas, 0, 0);
        return newCanvas;
    }
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    const newCtx = newCanvas.getContext('2d');
    
    if (flipHorizontal || flipVertical) {
        newCtx.translate(width / 2, height / 2);
        newCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        newCtx.translate(-width / 2, -height / 2);
    } else {
        newCtx.translate(width / 2, height / 2);
        newCtx.rotate((rotation * Math.PI) / 180);
        newCtx.translate(-width / 2, -height / 2);
    }
    
    newCtx.drawImage(canvas, 0, 0);
    return newCanvas;
}

async function correctImageOrientation(source, imageWidth, imageHeight) {
    let canvas;
    let orientation = 1;
    let rotated = false;
    
    if (source instanceof HTMLCanvasElement) {
        canvas = source;
    } else if (source instanceof HTMLImageElement) {
        canvas = document.createElement('canvas');
        canvas.width = source.naturalWidth || source.width;
        canvas.height = source.naturalHeight || source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
    } else {
        const arrayBuffer = await getArrayBufferFromSource(source);
        
        orientation = await getExifOrientation(arrayBuffer);
        
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);
        
        try {
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            
            canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            
            if (orientation !== EXIF_ORIENTATION.NORMAL) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                
                canvas = rotateCanvas(tempCanvas, orientation);
                rotated = true;
            } else {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
            }
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    
    return {
        canvas: canvas,
        rotated: rotated,
        orientation: orientation
    };
}

function filterWatermark(words, imgWidth, imgHeight) {
    if (!words || words.length === 0) return [];
    
    const avgConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
    const avgHeight = words.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / words.length;
    
    const watermarkKeywords = ['试用版', '演示版', 'sample', 'draft', 'confidential', '内部资料', '水印', '预览', 'trial', '测试版', 'beta'];
    
    return words.filter(word => {
        if (word.confidence < 45) return false;
        
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
}

async function parseImageWithOrientation(file, worker, logCallback) {
    logCallback(`正在识别图片: ${file.name}`);
    
    const { canvas, rotated, orientation } = await correctImageOrientation(file);
    
    if (rotated) {
        logCallback(`检测到图片方向: ${orientation}，已校正`, 'info');
    }
    
    const { data } = await worker.recognize(canvas);
    const filtered = filterWatermark(data.words, canvas.width, canvas.height);
    const cleanText = filtered.map(w => w.text).join(' ');
    
    logCallback(`✓ 图片识别完成，提取 ${filtered.length} 个词`, 'success');
    return { text: cleanText, words: filtered };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getExifOrientation,
        correctImageOrientation,
        rotateCanvas,
        filterWatermark,
        parseImageWithOrientation,
        EXIF_ORIENTATION
    };
}
