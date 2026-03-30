package com.smarttext.extractor

import android.content.ContentResolver
import android.net.Uri
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.apache.poi.xwpf.usermodel.XWPFParagraph
import com.github.barteksc.pdfiumandroid.PdfiumCore
import android.content.Context

class FileParser {
    
    fun parsePdf(contentResolver: ContentResolver, uri: Uri): String {
        try {
            val inputStream = contentResolver.openInputStream(uri) ?: return "无法打开文件"
            val bytes = inputStream.readBytes()
            inputStream.close()
            
            val pdfDocument = PdfiumCore(Context()).let { core ->
                core.newDocument(bytes)
            }
            
            val textBuilder = StringBuilder()
            for (i in 0 until pdfDocument.countPages) {
                pdfDocument.openPage(i).let { page ->
                    val pageText = page.text
                    textBuilder.append(pageText)
                    page.close()
                }
            }
            pdfDocument.close()
            
            return textBuilder.toString()
        } catch (e: Exception) {
            return "PDF解析失败: ${e.message}"
        }
    }
    
    fun parseWord(contentResolver: ContentResolver, uri: Uri): String {
        try {
            val inputStream = contentResolver.openInputStream(uri) ?: return "无法打开文件"
            val document = XWPFDocument(inputStream)
            inputStream.close()
            
            val textBuilder = StringBuilder()
            for (paragraph in document.paragraphs) {
                textBuilder.append(paragraph.text).append("\n")
            }
            document.close()
            
            return textBuilder.toString()
        } catch (e: Exception) {
            return "Word解析失败: ${e.message}"
        }
    }
    
    fun parseExcel(contentResolver: ContentResolver, uri: Uri): String {
        try {
            val inputStream = contentResolver.openInputStream(uri) ?: return "无法打开文件"
            val workbook = XSSFWorkbook(inputStream)
            inputStream.close()
            
            val textBuilder = StringBuilder()
            
            for (sheetIndex in 0 until workbook.numberOfSheets) {
                val sheet = workbook.getSheetAt(sheetIndex)
                textBuilder.append("\n【工作表: ${sheet.sheetName}】\n")
                
                for (row in sheet) {
                    val rowText = row.cellIterator().asSequence()
                        .filter { it.toString().isNotBlank() }
                        .joinToString(" | ") { it.toString() }
                    
                    if (rowText.isNotBlank()) {
                        textBuilder.append(rowText).append("\n")
                    }
                }
            }
            workbook.close()
            
            return textBuilder.toString()
        } catch (e: Exception) {
            return "Excel解析失败: ${e.message}"
        }
    }
    
    fun parsePowerPoint(contentResolver: ContentResolver, uri: Uri): String {
        return "PowerPoint解析需要额外依赖，建议使用Web版"
    }
}
