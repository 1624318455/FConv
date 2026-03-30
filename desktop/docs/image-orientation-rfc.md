# FConv 图片方向自动校正功能需求文档

## 1. 功能概述

**功能名称**: 图片方向自动校正 (Auto Image Orientation)

**功能描述**: 自动检测图片的 EXIF 方向信息，并将图片旋转到正确的方向后再进行 OCR 识别，解决用户上传倒置或旋转图片时识别效果差的问题。

**优先级**: 高

## 2. 用户场景

- 用户使用手机拍摄文档时，照片可能因手机方向传感器问题出现 90°、180°、270° 旋转
- 扫描仪扫描的图片可能以非标准方向存储
- 网络下载的图片可能带有方向信息但显示异常

## 3. 功能需求

### 3.1 核心功能

1. **EXIF 方向检测**
   - 解析图片文件的 EXIF Orientation 标签
   - 支持 EXIF Orientation 值: 1-8
   - Orientation 值说明:
     - 1: 正常方向
     - 2: 水平翻转
     - 3: 旋转180°
     - 4: 垂直翻转
     - 5: 顺时针90°+水平翻转
     - 6: 顺时针90°
     - 7: 逆时针90°+水平翻转
     - 8: 逆时针90°

2. **图片旋转校正**
   - 根据检测到的方向自动旋转图片
   - 旋转后移除 EXIF 方向标签（防止重复旋转）
   - 使用 Canvas API 进行无损旋转

3. **集成到 OCR 流程**
   - 在 `parseImage()` 函数中调用
   - 校正后的图片传递给 Tesseract OCR

### 3.2 接口设计

```javascript
/**
 * 检测并校正图片方向
 * @param {HTMLImageElement|HTMLCanvasElement|Blob|File} source - 图片源
 * @param {number} [imageWidth] - 图片宽度（可选，用于水印过滤）
 * @param {number} [imageHeight] - 图片高度（可选，用于水印过滤）
 * @returns {Promise<{canvas: HTMLCanvasElement, rotated: boolean, orientation: number}>}
 */
async function correctImageOrientation(source, imageWidth, imageHeight) {}

/**
 * 解析 JPEG 图片的 EXIF 方向
 * @param {ArrayBuffer} buffer - 图片数据
 * @returns {Promise<number>} - EXIF Orientation 值 (1-8)，默认为 1
 */
async function getExifOrientation(buffer) {}
```

### 3.3 数据流

```
用户上传图片
    ↓
parseImage() 调用 correctImageOrientation()
    ↓
getExifOrientation() 解析 EXIF
    ↓
如果方向 ≠ 1，使用 Canvas 旋转图片
    ↓
将旋转后的 Canvas 传递给 OCR 引擎
    ↓
返回识别结果
```

## 4. 兼容性要求

- 支持浏览器: Chrome 50+, Firefox 45+, Safari 14+, Edge 79+
- 支持图片格式: JPEG, PNG, WebP
- 不支持格式: GIF（无 EXIF），BMP（无 EXIF）

## 5. 测试用例

### 5.1 单元测试

| 测试用例 | 输入 | 预期结果 |
|---------|------|---------|
| 正常方向图片 | Orientation=1 | rotated=false |
| 旋转90°图片 | Orientation=6 | rotated=true, 90°旋转 |
| 旋转180°图片 | Orientation=3 | rotated=true, 180°旋转 |
| 旋转270°图片 | Orientation=8 | rotated=true, 270°旋转 |
| 无 EXIF 数据 | JPEG 无 EXIF | rotated=false, orientation=1 |
| PNG 图片 | PNG 格式 | rotated=false |

### 5.2 集成测试

| 测试用例 | 描述 |
|---------|------|
| 倒置图片 OCR | 上传倒置的文档图片，验证文字正确识别 |
| 多张不同方向图片 | 批量处理不同方向的图片 |

## 6. 风险与限制

1. **性能影响**: EXIF 解析和 Canvas 旋转会增加少量处理时间
2. **内存占用**: Canvas 操作可能增加内存使用
3. **非 JPEG 格式**: PNG/WebP 的 EXIF 支持较弱，需要特殊处理

## 7. 实现计划

- [ ] Phase 1: 基础 EXIF 解析和方向检测
- [ ] Phase 2: Canvas 旋转功能
- [ ] Phase 3: 集成到 OCR 流程
- [ ] Phase 4: 单元测试编写
- [ ] Phase 5: 集成测试和优化
