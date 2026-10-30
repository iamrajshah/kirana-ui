package com.iamrajshah.kiranapos;

import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "KiranaNativeAuth")
public class KiranaNativeAuthPlugin extends Plugin {
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "kirana.auth.tokens.v1";
    private static final String PREFS = "kirana_secure_auth";
    private static final int IV_LENGTH = 12;
    private final Executor credentialExecutor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void signInWithGoogle(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Google server client ID is not configured", "GOOGLE_CLIENT_ID_MISSING");
            return;
        }

        GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
            .setServerClientId(serverClientId)
            .setFilterByAuthorizedAccounts(false)
            .setAutoSelectEnabled(false)
            .build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build();
        CredentialManager.create(getContext()).getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            credentialExecutor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    if (!(credential instanceof CustomCredential)
                        || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        call.reject("Unsupported Google credential", "GOOGLE_CREDENTIAL_UNSUPPORTED");
                        return;
                    }
                    try {
                        GoogleIdTokenCredential google =
                            GoogleIdTokenCredential.createFrom(credential.getData());
                        JSObject response = new JSObject();
                        response.put("credential", google.getIdToken());
                        call.resolve(response);
                    } catch (Exception error) {
                        call.reject("Google credential could not be verified", "GOOGLE_CREDENTIAL_INVALID", error);
                    }
                }

                @Override
                public void onError(GetCredentialException error) {
                    if (error instanceof GetCredentialCancellationException) {
                        call.reject("Google sign-in was cancelled", googleCredentialErrorCode(error), error);
                        return;
                    }
                    call.reject("Google sign-in unavailable", googleCredentialErrorCode(error), error);
                }
            }
        );
    }

    static String googleCredentialErrorCode(GetCredentialException error) {
        return error instanceof GetCredentialCancellationException
            ? "GOOGLE_SIGN_IN_CANCELLED"
            : "GOOGLE_SIGN_IN_FAILED";
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);
        call.resolve(result);
    }

    @PluginMethod
    public void setSecureValue(PluginCall call) {
        String key = validatedKey(call);
        String value = call.getString("value");
        if (key == null || value == null) return;
        try {
            byte[] encrypted = encrypt(value);
            boolean saved = getContext().getSharedPreferences(PREFS, 0)
                .edit()
                .putString(key, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .commit();
            if (!saved) throw new IllegalStateException("Secure storage write was not committed");
            call.resolve();
        } catch (Exception error) {
            call.reject("Secure storage write failed", "SECURE_STORAGE_WRITE_FAILED", error);
        }
    }

    @PluginMethod
    public void getSecureValue(PluginCall call) {
        String key = validatedKey(call);
        if (key == null) return;
        String encoded = getContext().getSharedPreferences(PREFS, 0).getString(key, null);
        JSObject result = new JSObject();
        if (encoded == null) {
            result.put("value", JSObject.NULL);
            call.resolve(result);
            return;
        }
        try {
            result.put("value", decrypt(Base64.decode(encoded, Base64.NO_WRAP)));
            call.resolve(result);
        } catch (Exception error) {
            getContext().getSharedPreferences(PREFS, 0).edit().remove(key).apply();
            call.reject("Secure storage read failed", "SECURE_STORAGE_READ_FAILED", error);
        }
    }

    @PluginMethod
    public void removeSecureValue(PluginCall call) {
        String key = validatedKey(call);
        if (key == null) return;
        if (getContext().getSharedPreferences(PREFS, 0).edit().remove(key).commit()) {
            call.resolve();
        } else {
            call.reject("Secure storage removal failed", "SECURE_STORAGE_REMOVE_FAILED");
        }
    }

    private String validatedKey(PluginCall call) {
        String key = call.getString("key");
        if (!"access_token".equals(key)
            && !"refresh_token".equals(key)
            && !"session_bundle".equals(key)) {
            call.reject("Unsupported secure storage key", "SECURE_STORAGE_KEY_INVALID");
            return null;
        }
        return key;
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance(KEYSTORE);
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) store.getEntry(KEY_ALIAS, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    private byte[] encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] output = new byte[cipher.getIV().length + ciphertext.length];
        System.arraycopy(cipher.getIV(), 0, output, 0, cipher.getIV().length);
        System.arraycopy(ciphertext, 0, output, cipher.getIV().length, ciphertext.length);
        return output;
    }

    private String decrypt(byte[] value) throws Exception {
        if (value.length <= IV_LENGTH) throw new IllegalArgumentException("Invalid encrypted value");
        byte[] iv = new byte[IV_LENGTH];
        byte[] ciphertext = new byte[value.length - IV_LENGTH];
        System.arraycopy(value, 0, iv, 0, IV_LENGTH);
        System.arraycopy(value, IV_LENGTH, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }
}
