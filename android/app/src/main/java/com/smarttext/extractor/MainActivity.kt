package com.smarttext.extractor

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.smarttext.extractor.databinding.ActivityMainBinding
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val ocrHelper = OCRHelper()
    private val fileParser = FileParser()
    
    private var currentText = ""
    
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { processFile(it) }
    }
    
    private val multipleFilePickerLauncher = registerForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        uris.forEach { processFile(it) }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
        setupClickListeners()
        checkPermissions()
    }
    
    private fun setupUI() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = "智能文档文字提取器"
        
        ViewCompat.setOnApplyWindowInsetsListener(binding.main) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }
    
    private fun setupClickListeners() {
        binding.btnSelectFile.setOnClickListener {
            filePickerLauncher.launch("*/*")
        }
        
        binding.btnSelectMultiple.setOnClickListener {
            multipleFilePickerLauncher.launch(arrayOf("*/*"))
        }
        
        binding.btnCopy.setOnClickListener {
            copyToClipboard()
        }
        
        binding.btnExportTxt.setOnClickListener {
            exportToTxt()
        }
        
        binding.btnExportMd.setOnClickListener {
            exportToMarkdown()
        }
        
        binding.btnClear.setOnClickListener {
            clearResult()
        }
    }
    
    private fun checkPermissions() {
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), 100)
        }
    }
    
    private fun processFile(uri: Uri) {
        binding.progressIndicator.visibility = android.view.View.VISIBLE
        binding.progressIndicator.isIndeterminate = true
        
        CoroutineScope(Dispatchers.Main).launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val mimeType = contentResolver.getType(uri)
                    when {
                        mimeType?.startsWith("image/") == true -> {
                            val bitmap = contentResolver.openInputStream(uri)?.use {
                                android.graphics.BitmapFactory.decodeStream(it)
                            }
                            bitmap?.let { ocrHelper.recognizeText(it) } ?: ""
                        }
                        mimeType == "application/pdf" -> {
                            fileParser.parsePdf(contentResolver, uri)
                        }
                        mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> {
                            fileParser.parseWord(contentResolver, uri)
                        }
                        mimeType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> {
                            fileParser.parseExcel(contentResolver, uri)
                        }
                        mimeType == "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> {
                            fileParser.parsePowerPoint(contentResolver, uri)
                        }
                        else -> "不支持的文件类型"
                    }
                } catch (e: Exception) {
                    "处理失败: ${e.message}"
                }
            }
            
            binding.progressIndicator.visibility = android.view.View.GONE
            
            if (result.isNotEmpty()) {
                currentText += "\n\n========== 文件 ==========\n$result"
                binding.editTextResult.setText(currentText)
                showToast("提取成功")
            } else {
                showToast("未提取到文字内容")
            }
        }
    }
    
    private fun copyToClipboard() {
        val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
        val clip = android.content.ClipData.newPlainText("提取结果", currentText)
        clipboard.setPrimaryClip(clip)
        showToast("已复制到剪贴板")
    }
    
    private fun exportToTxt() {
        val fileName = "extract_${System.currentTimeMillis()}.txt"
        val file = File(getExternalFilesDir(null), fileName)
        file.writeText(currentText)
        
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_STREAM, androidx.core.content.FileProvider.getUriForFile(
                this@MainActivity,
                "${packageName}.fileprovider",
                file
            ))
        }
        startActivity(Intent.createChooser(intent, "分享文件"))
        showToast("已保存: $fileName")
    }
    
    private fun exportToMarkdown() {
        val markdown = "# 文字提取结果\n\n**生成时间**: ${java.util.Date()}\n\n---\n\n$currentText"
        val fileName = "extract_${System.currentTimeMillis()}.md"
        val file = File(getExternalFilesDir(null), fileName)
        file.writeText(markdown)
        showToast("已保存: $fileName")
    }
    
    private fun clearResult() {
        currentText = ""
        binding.editTextResult.setText("")
        showToast("已清空")
    }
    
    private fun showToast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }
}
