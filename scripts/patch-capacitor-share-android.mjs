import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const LEGACY_IMPORT = 'import androidx.core.content.FileProvider;';
const COMPAT_IMPORT = 'import androidx.core.content.ContextCompat;';
const LEGACY_REGISTRATION =
  '        getActivity().registerReceiver(broadcastReceiver, new IntentFilter(Intent.EXTRA_CHOSEN_COMPONENT));';
const COMPAT_REGISTRATION = `        ContextCompat.registerReceiver(
            getContext(),
            broadcastReceiver,
            new IntentFilter(Intent.EXTRA_CHOSEN_COMPONENT),
            ContextCompat.RECEIVER_EXPORTED
        );`;

export function patchCapacitorShareSource(source) {
  if (source.includes(COMPAT_IMPORT) && source.includes(COMPAT_REGISTRATION)) {
    return { source, changed: false };
  }

  if (!source.includes(LEGACY_IMPORT) || !source.includes(LEGACY_REGISTRATION)) {
    throw new Error(
      'Unsupported @capacitor/share Android source. Review the dependency before changing the compatibility patch.',
    );
  }

  return {
    source: source
      .replace(LEGACY_IMPORT, `${COMPAT_IMPORT}\n${LEGACY_IMPORT}`)
      .replace(LEGACY_REGISTRATION, COMPAT_REGISTRATION),
    changed: true,
  };
}

export async function patchInstalledCapacitorShare(projectRoot = process.cwd()) {
  const sourcePath = path.join(
    projectRoot,
    'node_modules',
    '@capacitor',
    'share',
    'android',
    'src',
    'main',
    'java',
    'com',
    'capacitorjs',
    'plugins',
    'share',
    'SharePlugin.java',
  );
  const source = await readFile(sourcePath, 'utf8');
  const result = patchCapacitorShareSource(source);

  if (result.changed) {
    await writeFile(sourcePath, result.source, 'utf8');
    console.log('Patched @capacitor/share 5.0.8 for Android 14+ receiver registration.');
  } else {
    console.log('@capacitor/share Android receiver compatibility patch already applied.');
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  await patchInstalledCapacitorShare();
}
