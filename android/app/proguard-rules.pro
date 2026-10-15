# ChatLK ProGuard / R8 Rules
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep data classes and serialization
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}

# Android & Jetpack Compose
-keep class com.chatlk.** { *; }
-keepclassmembers class com.chatlk.** { *; }

# WebView interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-dontwarn okio.**
-dontwarn java.awt.**
