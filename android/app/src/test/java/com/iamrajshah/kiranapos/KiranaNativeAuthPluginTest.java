package com.iamrajshah.kiranapos;

import static org.junit.Assert.assertEquals;

import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.NoCredentialException;
import org.junit.Test;

public class KiranaNativeAuthPluginTest {
    @Test
    public void mapsExplicitCancellationSeparately() {
        assertEquals(
            "GOOGLE_SIGN_IN_CANCELLED",
            KiranaNativeAuthPlugin.googleCredentialErrorCode(
                new GetCredentialCancellationException("User cancelled")
            )
        );
    }

    @Test
    public void keepsProviderUnavailabilityAsFailure() {
        assertEquals(
            "GOOGLE_SIGN_IN_FAILED",
            KiranaNativeAuthPlugin.googleCredentialErrorCode(
                new NoCredentialException("No credentials available")
            )
        );
    }
}
