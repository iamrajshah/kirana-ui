import XCTest

/// Physical-device tests use the installed app and never bypass authentication.
/// Mutating journeys must additionally verify the expected disposable shop name.
final class KiranaFlowUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.iamrajshah.kiranapos")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func capture(_ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }

    func test01LaunchAndInspect() {
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let signIn = app.buttons.matching(NSPredicate(format: "label MATCHES[c] %@", "sign in")).firstMatch
        let dashboard = app.staticTexts["Dashboard"].firstMatch
        let ready = NSPredicate { _, _ in signIn.exists || dashboard.exists }
        let loaded = XCTNSPredicateExpectation(predicate: ready, object: nil)
        let outcome = XCTWaiter.wait(for: [loaded], timeout: 40)
        capture("iphone-entry")
        XCTAssertEqual(outcome, .completed, "WebView exists but the actual login/dashboard UI did not become ready")
        print("KIRANA_AX_BEGIN\n\(app.debugDescription)\nKIRANA_AX_END")
    }
}
