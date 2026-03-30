import UIKit
import Vision

class OCRService {
    
    func recognizeText(from image: UIImage) async -> String {
        guard let cgImage = image.cgImage else {
            return "无法处理图片"
        }
        
        return await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(returning: "识别失败: \(error.localizedDescription)")
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: "")
                    return
                }
                
                let imageWidth = CGFloat(cgImage.width)
                let imageHeight = CGFloat(cgImage.height)
                
                var filteredTexts: [String] = []
                let watermarkKeywords = ["试用版", "演示版", "Sample", "Draft", "Confidential", "水印", "预览"]
                
                for observation in observations {
                    guard let topCandidate = observation.topCandidates(1).first,
                          topCandidate.confidence > 0.45 else {
                        continue
                    }
                    
                    let boundingBox = observation.boundingBox
                    let isAtEdge = boundingBox.minX < 0.08 || boundingBox.maxX > 0.92 ||
                                   boundingBox.minY < 0.08 || boundingBox.maxY > 0.92
                    if isAtEdge { continue }
                    
                    let text = topCandidate.string
                    
                    let containsWatermark = watermarkKeywords.contains { keyword in
                        text.lowercased().contains(keyword.lowercased())
                    }
                    if containsWatermark { continue }
                    
                    filteredTexts.append(text)
                }
                
                let result = filteredTexts.joined(separator: " ")
                continuation.resume(returning: result)
            }
            
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["zh-Hans", "en-US"]
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try? handler.perform([request])
        }
    }
}
