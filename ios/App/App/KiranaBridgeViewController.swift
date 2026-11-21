import Capacitor
import Security
import UIKit

final class KiranaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(KiranaNativeAuthPlugin())
    }
}

/// Tokens are scoped to this app and device, and are never synchronised to iCloud.
@objc(KiranaNativeAuthPlugin)
final class KiranaNativeAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "KiranaNativeAuthPlugin"
    let jsName = "KiranaNativeAuth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getDeviceInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSecureValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSecureValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeSecureValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithGoogle", returnType: CAPPluginReturnPromise)
    ]
    private let allowedKeys: Set<String> = ["session_bundle", "access_token", "refresh_token"]

    private func query(_ call: CAPPluginCall) -> [String: Any]? {
        guard let key = call.getString("key"), allowedKeys.contains(key) else {
            call.reject("Unknown secure storage key", "SECURE_STORAGE_INVALID_KEY")
            return nil
        }
        return [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: "com.iamrajshah.kiranapos.auth",
                kSecAttrAccount as String: key]
    }

    @objc func getDeviceInfo(_ call: CAPPluginCall) {
        call.resolve(["manufacturer": "Apple", "model": UIDevice.current.model])
    }

    @objc func setSecureValue(_ call: CAPPluginCall) {
        guard let query = query(call) else { return }
        guard let value = call.getString("value"), let data = value.data(using: .utf8) else {
            call.reject("Missing secure value", "SECURE_STORAGE_INVALID_VALUE")
            return
        }
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
        }
        guard status == errSecSuccess else {
            call.reject("Unable to save session securely", "SECURE_STORAGE_WRITE_FAILED")
            return
        }
        call.resolve()
    }

    @objc func getSecureValue(_ call: CAPPluginCall) {
        guard var query = query(call) else { return }
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound {
            call.resolve(["value": NSNull()])
            return
        }
        guard status == errSecSuccess, let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Unable to read secure session", "SECURE_STORAGE_READ_FAILED")
            return
        }
        call.resolve(["value": value])
    }

    @objc func removeSecureValue(_ call: CAPPluginCall) {
        guard let query = query(call) else { return }
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("Unable to clear secure session", "SECURE_STORAGE_REMOVE_FAILED")
            return
        }
        call.resolve()
    }

    @objc func signInWithGoogle(_ call: CAPPluginCall) {
        call.reject("Use password login for this iOS development build", "IOS_GOOGLE_NOT_CONFIGURED")
    }
}
