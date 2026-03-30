import UIKit
import Vision
import PDFKit
import UniformTypeIdentifiers

class ViewController: UIViewController {
    
    @IBOutlet weak var uploadView: UIView!
    @IBOutlet weak var resultTextView: UITextView!
    @IBOutlet weak var logTextView: UITextView!
    @IBOutlet weak var progressView: UIProgressView!
    @IBOutlet weak var progressLabel: UILabel!
    @IBOutlet weak var activityIndicator: UIActivityIndicatorView!
    
    private var currentText = ""
    private var isProcessing = false
    private let ocrService = OCRService()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupGestures()
    }
    
    private func setupUI() {
        title = "智能文档文字提取器"
        view.backgroundColor = UIColor.systemBackground
        
        uploadView.layer.borderWidth = 2
        uploadView.layer.borderColor = UIColor.systemGray4.cgColor
        uploadView.layer.cornerRadius = 20
        uploadView.backgroundColor = UIColor.systemGray6
        
        resultTextView.layer.cornerRadius = 12
        resultTextView.layer.borderWidth = 1
        resultTextView.layer.borderColor = UIColor.systemGray4.cgColor
        
        logTextView.layer.cornerRadius = 12
        logTextView.layer.borderWidth = 1
        logTextView.layer.borderColor = UIColor.systemGray4.cgColor
        
        progressView.isHidden = true
        progressLabel.isHidden = true
        activityIndicator.hidesWhenStopped = true
    }
    
    private func setupGestures() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(uploadTapped))
        uploadView.addGestureRecognizer(tapGesture)
    }
    
    @objc private func uploadTapped() {
        showDocumentPicker()
    }
    
    @IBAction func selectFileTapped(_ sender: UIButton) {
        showDocumentPicker()
    }
    
    @IBAction func copyTapped(_ sender: UIButton) {
        UIPasteboard.general.string = currentText
        addLog("📋 已复制到剪贴板", type: .success)
        
        let originalTitle = sender.title(for: .normal)
        sender.setTitle("✅ 已复制", for: .normal)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            sender.setTitle(originalTitle, for: .normal)
        }
    }
    
    @IBAction func exportTxtTapped(_ sender: UIButton) {
        exportToTXT()
    }
    
    @IBAction func exportMdTapped(_ sender: UIButton) {
        exportToMarkdown()
    }
    
    @IBAction func clearTapped(_ sender: UIButton) {
        currentText = ""
        resultTextView.text = ""
        addLog("🗑️ 已清空结果", type: .info)
    }
    
    private func showDocumentPicker() {
        let types = [UTType.image, UTType.pdf, UTType.text, UTType.plainText]
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = true
        present(picker, animated: true)
    }
    
    private func processFile(url: URL) {
        guard !isProcessing else {
            addLog("等待当前处理完成...", type: .warning)
            return
        }
        
        isProcessing = true
        progressView.isHidden = false
        progressLabel.isHidden = false
        activityIndicator.startAnimating()
        
        let fileName = url.lastPathComponent
        addLog("📄 处理: \(fileName)", type: .info)
        
        let fileExtension = url.pathExtension.lowercased()
        
        Task {
            var extractedText = ""
            
            if ["png", "jpg", "jpeg", "bmp", "webp"].contains(fileExtension) {
                extractedText = await processImage(url: url)
            } else if fileExtension == "pdf" {
                extractedText = processPDF(url: url)
            } else if fileExtension == "txt" {
                extractedText = processTXT(url: url)
            } else {
                extractedText = "不支持的文件类型: \(fileExtension)"
            }
            
            await MainActor.run {
                if !extractedText.isEmpty && extractedText != "不支持的文件类型: \(fileExtension)" {
                    self.currentText += "\n\n========== \(fileName) ==========\n\(extractedText)"
                    self.resultTextView.text = self.currentText
                    self.addLog("✅ 处理成功: \(fileName)", type: .success)
                } else {
                    self.addLog("❌ 处理失败: \(fileName)", type: .error)
                }
                
                self.isProcessing = false
                self.progressView.isHidden = true
                self.progressLabel.isHidden = true
                self.activityIndicator.stopAnimating()
            }
        }
    }
    
    private func processImage(url: URL) async -> String {
        guard let image = UIImage(contentsOfFile: url.path) else {
            return "无法加载图片"
        }
        
        return await ocrService.recognizeText(from: image)
    }
    
    private func processPDF(url: URL) -> String {
        guard let pdf = PDFDocument(url: url) else {
            return "无法加载PDF"
        }
        
        var text = ""
        for i in 1...pdf.pageCount {
            guard let page = pdf.page(at: i - 1) else { continue }
            if let pageText = page.string {
                text += pageText + "\n"
            }
            DispatchQueue.main.async {
                self.progressLabel.text = "解析PDF: 第 \(i)/\(pdf.pageCount) 页"
                self.progressView.progress = Float(i) / Float(pdf.pageCount)
            }
        }
        return text
    }
    
    private func processTXT(url: URL) -> String {
        do {
            return try String(contentsOf: url, encoding: .utf8)
        } catch {
            return "读取文本失败: \(error.localizedDescription)"
        }
    }
    
    private func exportToTXT() {
        let fileName = "extract_\(Date().timeIntervalSince1970).txt"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        do {
            try currentText.write(to: tempURL, atomically: true, encoding: .utf8)
            let activityVC = UIActivityViewController(activityItems: [tempURL], applicationActivities: nil)
            present(activityVC, animated: true)
            addLog("📄 已导出 TXT", type: .success)
        } catch {
            addLog("导出失败: \(error.localizedDescription)", type: .error)
        }
    }
    
    private func exportToMarkdown() {
        let markdown = """
        # 文字提取结果
        
        **生成时间**: \(Date())
        
        ---
        
        \(currentText)
        
        ---
        *由智能文档文字提取器生成*
        """
        
        let fileName = "extract_\(Date().timeIntervalSince1970).md"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        do {
            try markdown.write(to: tempURL, atomically: true, encoding: .utf8)
            let activityVC = UIActivityViewController(activityItems: [tempURL], applicationActivities: nil)
            present(activityVC, animated: true)
            addLog("📝 已导出 Markdown", type: .success)
        } catch {
            addLog("导出失败: \(error.localizedDescription)", type: .error)
        }
    }
    
    private func addLog(_ message: String, type: LogType) {
        let prefix: String
        switch type {
        case .success: prefix = "✅"
        case .error: prefix = "❌"
        case .warning: prefix = "⚠️"
        case .info: prefix = "ℹ️"
        }
        
        let logEntry = "[\(formattedDate())] \(prefix) \(message)\n"
        
        DispatchQueue.main.async {
            self.logTextView.text = (self.logTextView.text ?? "") + logEntry
            let bottom = NSMakeRange(self.logTextView.text.count - 1, 1)
            self.logTextView.scrollRangeToVisible(bottom)
        }
    }
    
    private func formattedDate() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: Date())
    }
}

extension ViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        for url in urls {
            processFile(url: url)
        }
    }
    
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        addLog("已取消选择", type: .info)
    }
}

enum LogType {
    case success, error, warning, info
}
