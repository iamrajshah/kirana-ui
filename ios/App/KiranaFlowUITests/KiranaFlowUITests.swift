import XCTest

/// Physical-device tests use the installed app and never bypass authentication.
/// Mutating journeys must additionally verify the expected disposable shop name.
final class KiranaFlowUITests: XCTestCase {
    private let app = XCUIApplication()

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
        let dashboard = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dashboard")).firstMatch
        let ready = NSPredicate { _, _ in signIn.exists || dashboard.exists }
        let loaded = XCTNSPredicateExpectation(predicate: ready, object: nil)
        let outcome = XCTWaiter.wait(for: [loaded], timeout: 40)
        capture("iphone-entry")
        XCTAssertEqual(outcome, .completed, "WebView exists but the actual login/dashboard UI did not become ready")
        print("KIRANA_AX_BEGIN\n\(app.debugDescription)\nKIRANA_AX_END")
    }
    func test02PasswordLoginAndSecureRelaunch() throws {
        let env = ProcessInfo.processInfo.environment
        guard let email = env["KIRANA_QA_EMAIL"], let password = env["KIRANA_QA_PASSWORD"],
              let shop = env["KIRANA_QA_SHOP"] else {
            throw XCTSkip("Requires explicitly configured disposable-shop credentials")
        }
        app.launch()
        let dashboard = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dashboard")).firstMatch
        let arrived = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in dashboard.exists || self.app.secureTextFields.firstMatch.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [arrived], timeout: 45), .completed, "Neither login nor Dashboard became ready")
        if dashboard.exists {
            tapVisible("Account menu")
            tapVisible("Logout")
            XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 25), "Logout did not return to login")
        }
        do {
            let field = app.textFields.firstMatch
            XCTAssertTrue(field.waitForExistence(timeout: 45), "Login input did not appear")
            field.tap(); field.typeText(email)
            let secret = app.secureTextFields.firstMatch
            XCTAssertTrue(secret.exists)
            secret.tap(); secret.typeText(password)
            app.buttons.matching(NSPredicate(format: "label MATCHES[c] %@", "sign in")).firstMatch.tap()
        }
        XCTAssertTrue(dashboard.waitForExistence(timeout: 45), "Authenticated Dashboard did not load")
        tapVisible("menu")
        let shopLabel = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch
        XCTAssertTrue(shopLabel.waitForExistence(timeout: 10), "Expected disposable shop is not shown in its menu")
        app.buttons["Dashboard"].firstMatch.tap()
        capture("iphone-authenticated-dashboard")
        print("KIRANA_AUTH_AX_BEGIN\n\(app.debugDescription)\nKIRANA_AUTH_AX_END")
        app.terminate(); app.launch()
        XCTAssertTrue(dashboard.waitForExistence(timeout: 45), "Secure session was not restored on relaunch")
        XCTAssertFalse(app.secureTextFields.firstMatch.exists)
        capture("iphone-secure-relaunch")
    }

    private func tapVisible(_ label: String) {
        let controls = app.buttons.matching(NSPredicate(format: "label ==[c] %@", label))
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in controls.allElementsBoundByIndex.contains { $0.exists && $0.isEnabled } }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 25), .completed, "Button not ready: \(label)")
        let candidates = controls.allElementsBoundByIndex.filter { $0.exists && $0.isEnabled }
        guard let control = candidates.first(where: { $0.isHittable }) ?? candidates.first else {
            XCTFail("Button not available: \(label)"); return
        }
        // WebKit scrolls an off-screen accessible control into view when tapped.
        control.tap()
    }

    private func enterSearch(_ text: String, in field: XCUIElement) {
        field.tap()
        let previous = field.value as? String ?? ""
        if !previous.isEmpty && previous != field.placeholderValue {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: previous.count))
        }
        field.typeText(text)
        if field.value as? String != text {
            // Synthetic WKWebView typing can drop a key under compiler load.
            // Verify the actual input and retry deliberately before querying results.
            let entered = field.value as? String ?? ""
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: entered.count))
            for character in text { field.typeText(String(character)) }
        }
        XCTAssertEqual(field.value as? String, text, "Search input did not receive the intended text")
    }

    private func addProduct(_ name: String) {
        let search = app.searchFields["Search product by name or SKU"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 25))
        enterSearch(name, in: search)
        let product = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", name)).firstMatch
        XCTAssertTrue(product.waitForExistence(timeout: 25), "Product result missing")
        product.tap()
    }

    func test03CashKhataPaymentAndDashboard() throws {
        let env = ProcessInfo.processInfo.environment
        guard let shop = env["KIRANA_QA_SHOP"], let product = env["KIRANA_QA_PRODUCT"],
              let customer = env["KIRANA_QA_CUSTOMER"] else {
            throw XCTSkip("Requires explicit disposable shop/product/customer fixture")
        }
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dashboard")).firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10), "Wrong shop: refusing financial writes")
        tapVisible("Dashboard")
        tapVisible("Billing")

        XCTContext.runActivity(named: "Fast cash bill") { _ in
            addProduct(product)
            tapVisible("Cash")
            let cleared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !self.app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Cash")).firstMatch.exists }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 30), .completed)
            capture("cash-bill-completed")
        }
        XCTContext.runActivity(named: "Customer khata bill") { _ in
            tapVisible("Attach customer")
            let search = app.searchFields["Search customer by name or phone"].firstMatch
            XCTAssertTrue(search.waitForExistence(timeout: 15))
            enterSearch(customer, in: search)
            let match = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", customer)).firstMatch
            XCTAssertTrue(match.waitForExistence(timeout: 25)); match.tap()
            addProduct(product)
            tapVisible("Khata")
            let cleared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !self.app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Khata")).firstMatch.exists }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 30), .completed)
            capture("khata-bill-completed")
        }
        XCTContext.runActivity(named: "Collect khata payment and navigate to Dashboard") { _ in
            tapVisible("Payments")
            tapVisible("Record Payment")
            let search = app.textFields["Search customers by name or phone"].firstMatch
            XCTAssertTrue(search.waitForExistence(timeout: 15))
            enterSearch(customer, in: search)
            let match = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
            XCTAssertTrue(match.waitForExistence(timeout: 25)); match.tap()
            let amount = app.textFields["Enter amount"].firstMatch
            XCTAssertTrue(amount.waitForExistence(timeout: 15))
            amount.tap(); amount.typeText("100")
            tapVisible("Save")
            let closed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !self.app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Save")).firstMatch.exists }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [closed], timeout: 30), .completed)
            tapVisible("Dashboard")
            let content = app.staticTexts["Your shop at a glance"].firstMatch
            let navigated = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in content.exists && content.isHittable }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [navigated], timeout: 20), .completed, "Dashboard content did not become visible after payment")
            capture("payment-dashboard-navigation")
        }
    }

}
