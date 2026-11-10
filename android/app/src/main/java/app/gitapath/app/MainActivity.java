package app.gitapath.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            
            // Enable persistent IndexedDB & LocalStorage
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            // Seamless audio recitation playback
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // Mixed content and local asset loading
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setJavaScriptEnabled(true);
        }
    }
}
