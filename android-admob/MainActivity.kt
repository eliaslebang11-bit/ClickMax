package com.clickmax.app

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.ads.MobileAds

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. Initialize the official Google Mobile Ads SDK
        MobileAds.initialize(this) { initializationStatus ->
            // SDK Initialization complete
        }

        // 2. Set up the target webview container
        webView = findViewById(R.id.webview)
        configureWebView()

        // 3. Register the AdMob bridge with window.AndroidAdInterface namespace
        val adBridge = AdMobBridge(this, webView)
        webView.addJavascriptInterface(adBridge, "AndroidAdInterface")

        // Load your development or production web url
        webView.loadUrl("https://clickmax.app/watch/some-video-id")
    }

    private fun configureWebView() {
         val settings = webView.settings
         settings.javaScriptEnabled = true
         settings.domStorageEnabled = true
         settings.mediaPlaybackRequiresUserGesture = false // Allows automated play/pause from script hooks
         
         webView.webViewClient = object : WebViewClient() {
             // Standard web client configuration options
         }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
