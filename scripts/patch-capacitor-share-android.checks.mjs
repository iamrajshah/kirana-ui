import assert from 'node:assert/strict';
import test from 'node:test';

import { patchCapacitorShareSource } from './patch-capacitor-share-android.mjs';

const legacySource = `package com.capacitorjs.plugins.share;

import androidx.core.content.FileProvider;

class SharePlugin {
    void load() {
        getActivity().registerReceiver(broadcastReceiver, new IntentFilter(Intent.EXTRA_CHOSEN_COMPONENT));
    }
}`;

test('backports explicit receiver visibility for Android 14+', () => {
  const result = patchCapacitorShareSource(legacySource);

  assert.equal(result.changed, true);
  assert.match(result.source, /import androidx\.core\.content\.ContextCompat;/);
  assert.match(result.source, /ContextCompat\.registerReceiver\(/);
  assert.match(result.source, /ContextCompat\.RECEIVER_EXPORTED/);
  assert.doesNotMatch(result.source, /getActivity\(\)\.registerReceiver/);
});

test('is idempotent after the compatibility patch is present', () => {
  const first = patchCapacitorShareSource(legacySource);
  const second = patchCapacitorShareSource(first.source);

  assert.equal(second.changed, false);
  assert.equal(second.source, first.source);
});

test('fails closed when the dependency source shape changes', () => {
  assert.throws(
    () => patchCapacitorShareSource('class SharePlugin {}'),
    /Unsupported @capacitor\/share Android source/,
  );
});
