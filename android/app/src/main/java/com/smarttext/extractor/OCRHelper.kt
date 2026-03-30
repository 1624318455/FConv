package com.smarttext.extractor

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class OCRHelper {
    
    private val recognizer = TextRecognition.getClient(
        ChineseTextRecognizerOptions.Builder().build()
    )
    
    suspend fun recognizeText(bitmap: Bitmap): String = suspendCancellableCoroutine { continuation ->
        val image = InputImage.fromBitmap(bitmap, 0)
        
        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val resultText = visionText.text
                val filtered = visionText.textBlocks.filter { block ->
                    block.confidence ?: 0f > 0.45f
                }.joinToString(" ") { it.text }
                
                continuation.resume(filtered.ifEmpty { resultText })
            }
            .addOnFailureListener { e ->
                continuation.resumeWithException(e)
            }
    }
}
