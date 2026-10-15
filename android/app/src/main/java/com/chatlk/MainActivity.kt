package com.chatlk

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val clipData = result.data?.clipData
            val dataUri = result.data?.data
            val results = when {
                clipData != null -> Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                dataUri != null -> arrayOf(dataUri)
                else -> null
            }
            fileUploadCallback?.onReceiveValue(results)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Permissions granted/denied by user
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Android high-priority notification channel
        createNotificationChannels()

        // Request runtime permissions on start
        requestAppPermissions()

        val rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        rootLayout.addView(webView)
        setContentView(rootLayout)

        setupWebView()

        // Handle hardware back button navigation with in-app handling & double-tap to exit
        var backPressedTime: Long = 0
        var backToast: Toast? = null

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return
                }

                val jsCheck = """
                    (function() {
                        const modal = document.querySelector('.modal-backdrop');
                        if (modal) {
                            modal.remove();
                            return true;
                        }
                        const shell = document.querySelector('.shell.chat-open');
                        if (shell) {
                            shell.classList.remove('chat-open');
                            return true;
                        }
                        const overlay = document.querySelector('#call-overlay:not(.hidden)');
                        if (overlay) {
                            document.querySelector('#end-call')?.click();
                            return true;
                        }
                        const authBack = document.querySelector('#auth-back-to-login');
                        if (authBack) {
                            authBack.click();
                            return true;
                        }
                        return false;
                    })()
                """.trimIndent()

                webView.evaluateJavascript(jsCheck) { result ->
                    if (result == "true") {
                        return@evaluateJavascript
                    }

                    val currentTime = System.currentTimeMillis()
                    if (currentTime - backPressedTime < 2000) {
                        backToast?.cancel()
                        finish()
                    } else {
                        backPressedTime = currentTime
                        backToast?.cancel()
                        backToast = Toast.makeText(
                            this@MainActivity,
                            getString(R.string.back_exit_confirm),
                            Toast.LENGTH_SHORT
                        )
                        backToast?.show()
                    }
                }
            }
        })

        val serverUrl = getString(R.string.chatlk_server_url)
        webView.loadUrl(serverUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.setSupportMultipleWindows(false)
        settings.userAgentString = settings.userAgentString + " ChatLK-Android/1.0"

        val serverHost = Uri.parse(getString(R.string.chatlk_server_url)).host

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                val originHost = request?.origin?.host
                val isTrusted = originHost != null && (
                    originHost.equals(serverHost, ignoreCase = true) ||
                    originHost.equals("localhost", ignoreCase = true) ||
                    originHost.equals("127.0.0.1", ignoreCase = true) ||
                    originHost.equals("10.0.2.2", ignoreCase = true)
                )

                if (isTrusted) {
                    runOnUiThread {
                        request?.grant(request.resources)
                    }
                } else {
                    runOnUiThread {
                        request?.deny()
                    }
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                return try {
                    filePickerLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    false
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val host = uri.host

                val isInternal = host != null && (
                    host.equals(serverHost, ignoreCase = true) ||
                    host.equals("localhost", ignoreCase = true) ||
                    host.equals("127.0.0.1", ignoreCase = true) ||
                    host.equals("10.0.2.2", ignoreCase = true)
                )

                if (isInternal) {
                    return false // Load internally within WebView
                }

                return try {
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(intent)
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@MainActivity, "Network error: check your connection", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = getString(R.string.notification_channel_messages_name)
            val descriptionText = getString(R.string.notification_channel_messages_desc)
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID_MESSAGES, name, importance).apply {
                description = descriptionText
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 150, 250)
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build()
                setSound(soundUri, audioAttributes)
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID_MESSAGES = "chatlk_messages"
    }
}
