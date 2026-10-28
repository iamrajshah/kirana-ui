package com.iamrajshah.kiranapos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(KiranaNativeAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
