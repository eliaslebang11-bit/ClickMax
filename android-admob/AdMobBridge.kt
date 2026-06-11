package com.clickmax.app

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.OnUserEarnedRewardListener
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAd
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAdLoadCallback

class AdMobBridge(private val activity: Activity, private val webView: WebView) {

    private val TAG = "AdMobBridge"
    private val AD_UNIT_ID = "ca-app-pub-7254404188715890/3888308530"
    
    // Track video plays on the native side to ensure maximum safety (only one ad per video play session)
    private val shownVideos = HashSet<String>()
    
    private var rewardedInterstitialAd: RewardedInterstitialAd? = null
    private var isLoadingAd = false

    init {
        // Pre-fetch the first ad so it is ready when the user reaches 4 seconds of watch count
        preloadAd()
    }

    private fun preloadAd() {
        if (rewardedInterstitialAd != null || isLoadingAd) return
        
        isLoadingAd = true
        Log.d(TAG, "Preloading AdMob Rewarded Interstitial Ad...")
        
        val adRequest = AdRequest.Builder().build()
        activity.runOnUiThread {
            RewardedInterstitialAd.load(
                activity,
                AD_UNIT_ID,
                adRequest,
                object : RewardedInterstitialAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedInterstitialAd) {
                        rewardedInterstitialAd = ad
                        isLoadingAd = false
                        Log.i(TAG, "AdMob ad successfully preloaded.")
                    }

                    override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                        rewardedInterstitialAd = null
                        isLoadingAd = false
                        Log.w(TAG, "AdMob preload failed: ${loadAdError.message}")
                    }
                }
            )
        }
    }

    /**
     * Triggered by React Web app at the 4-second watch duration mark.
     */
    @JavascriptInterface
    fun showRewardedInterstitialAd(videoId: String) {
        Log.d(TAG, "showRewardedInterstitialAd invoked for video: $videoId")
        
        // Ensure strictly one ad per unique video ID
        if (shownVideos.contains(videoId)) {
            Log.i(TAG, "Ad already shown for video $videoId in this session. Skipping.")
            return
        }

        activity.runOnUiThread {
            if (rewardedInterstitialAd != null) {
                // Pause the HTML5 video element on the web page automatically
                pauseWebVideo()
                
                rewardedInterstitialAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
                    override fun onAdDismissedFullScreenContent() {
                        Log.i(TAG, "Ad closed by user. Resuming video...")
                        rewardedInterstitialAd = null
                        shownVideos.add(videoId)
                        // Resume the HTML5 video element playback
                        resumeWebVideo()
                        // Load next ad for future play sessions
                        preloadAd()
                    }

                    override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                        Log.e(TAG, "Ad failed to show: ${adError.message}. Continuing video.")
                        rewardedInterstitialAd = null
                        // Resume playing video model even if show failed
                        resumeWebVideo()
                        preloadAd()
                    }

                    override fun onAdShowedFullScreenContent() {
                        Log.i(TAG, "Ad showcased successfully.")
                    }
                }

                // Show the loaded ad
                rewardedInterstitialAd?.show(activity, OnUserEarnedRewardListener { reward ->
                    Log.d(TAG, "User earned reward: ${reward.amount} ${reward.type}")
                })

            } else {
                Log.w(TAG, "Ad is not ready yet. Trying lazy load and continuing playback gracefully.")
                // If not preloaded, do not block the user playback. Just preload it for next time.
                preloadAd()
            }
        }
    }

    private fun pauseWebVideo() {
        // Pauses the video automatically from native context
        webView.evaluateJavascript("document.querySelector('video')?.pause()", null)
    }

    private fun resumeWebVideo() {
        // Resumes the video automatically from native context
        webView.evaluateJavascript("document.querySelector('video')?.play()", null)
    }
}
