package com.iranto.chapil;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FilePlugin")
public class FilePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename", "chapil_backup.json");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "handleSaveResult");
    }

    @ActivityCallback
    private void handleSaveResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled");
            return;
        }
        Uri uri = result.getData().getData();
        String content = call.getString("content", "");
        try {
            OutputStream os = getContext().getContentResolver().openOutputStream(uri);
            if (os == null) { call.reject("stream open failed"); return; }
            os.write(content.getBytes(StandardCharsets.UTF_8));
            os.close();
            call.resolve();
        } catch (IOException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void autoBackup(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("requires Android 10+");
            return;
        }
        String filename = call.getString("filename", "chapil_backup.json");
        String content  = call.getString("content", "");

        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
        values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/차필");

        Uri uri = getContext().getContentResolver()
                              .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) { call.reject("insert failed"); return; }

        try {
            OutputStream os = getContext().getContentResolver().openOutputStream(uri);
            if (os == null) { call.reject("stream open failed"); return; }
            os.write(content.getBytes(StandardCharsets.UTF_8));
            os.close();
            call.resolve();
        } catch (IOException e) {
            call.reject(e.getMessage());
        }
    }
}