import XCTest

/// Physical-device tests use the installed app and never bypass authentication.
/// Mutating journeys must additionally verify the expected disposable shop name.
final class KiranaFlowUITests: XCTestCase {
    private let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        addUIInterruptionMonitor(withDescription: "Dismiss notification banners") { element in
            if element.identifier == "NotificationShortLookView" { element.swipeUp(); return true }
            return false
        }
    }

    override func tearDownWithError() throws {
        if let run = testRun, run.failureCount > 0 {
            capture("business-failure"); print("KIRANA_FAILURE_AX_BEGIN\n\(app.debugDescription)\nKIRANA_FAILURE_AX_END")
        }
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

    private func dismissNotificationBanner() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let banner = springboard.descendants(matching: .any).matching(NSPredicate(format: "identifier == %@", "NotificationShortLookView")).firstMatch
        if banner.exists { banner.swipeUp() }
    }

    private func tapVisible(_ label: String) {
        app.activate(); dismissNotificationBanner()
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
        app.activate(); dismissNotificationBanner()
        field.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) {
            field.coordinate(withNormalizedOffset: CGVector(dx: 0.4, dy: 0.5)).tap()
            _ = app.keyboards.firstMatch.waitForExistence(timeout: 3)
        }
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

    /// Account selection, privacy acceptance and MFA stay with the phone owner.
    func test04RealGoogleSignInOnPhone() throws {
        guard ProcessInfo.processInfo.environment["KIRANA_QA_REAL_GOOGLE"] == "1" else {
            throw XCTSkip("Requires the phone owner and an explicitly enabled real Google run")
        }
        app.launch()
        let dashboard = app.staticTexts["Your shop at a glance"].firstMatch
        let login = app.secureTextFields.firstMatch
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in dashboard.exists || login.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 45), .completed)
        if dashboard.exists {
            tapVisible("Account menu"); tapVisible("Logout")
            XCTAssertTrue(login.waitForExistence(timeout: 30))
        }
        capture("physical-google-login-ready")
        print("KIRANA_GOOGLE_LOGIN_READY")
        let google = app.buttons["Continue with Google"].firstMatch
        // The owner accepts Privacy/Terms on the device before this is rendered.
        XCTAssertTrue(google.waitForExistence(timeout: 180), "Waiting for the phone owner's privacy acceptance")
        google.tap()
        capture("physical-google-native-sheet")
        print("KIRANA_GOOGLE_ACCOUNT_ACTION_REQUIRED")
        let authenticated = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in dashboard.exists && dashboard.isHittable }, object: nil)
        let outcome = XCTWaiter.wait(for: [authenticated], timeout: 300)
        capture("physical-google-result")
        print("KIRANA_GOOGLE_RESULT_AX_BEGIN\n\(app.debugDescription)\nKIRANA_GOOGLE_RESULT_AX_END")
        XCTAssertEqual(outcome, .completed, "Real Google sign-in did not reach visible Dashboard content")
    }

    func test05InspectInstalledAuthenticatedApp() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["KIRANA_QA_REAL_GOOGLE"] == "1" || env["KIRANA_QA_AUTH_INSPECTION"] == "1" || env["KIRANA_QA_SHOP"] != nil else {
            throw XCTSkip("Requires an explicitly configured authenticated inspection")
        }
        app.activate()
        let dashboard = app.staticTexts["Your shop at a glance"].firstMatch
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in dashboard.exists && dashboard.isHittable }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 45), .completed)
        capture("physical-google-authenticated-dashboard")
        tapVisible("menu")
        capture("physical-authenticated-shop-menu")
        print("KIRANA_PHYSICAL_AUTH_AX_BEGIN\n\(app.debugDescription)\nKIRANA_PHYSICAL_AUTH_AX_END")
        tapVisible("Dashboard")
    }

    func test10OwnerRouteAudit() throws {
        try requireQAShop()
        let routes = ["Customers", "Invoices", "Online orders", "Payments", "Products", "Inventory", "Categories", "Suppliers", "Purchases", "Reports", "Users", "Import/Export", "Plan & account", "Cash shift", "Getting started", "About"]
        for (index, route) in routes.enumerated() {
            XCTContext.runActivity(named: "NAV-\(index + 1) \(route)") { _ in
                businessRoute(route)
                let header = app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", route)).firstMatch
                let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in header.exists && header.isHittable }, object: nil)
                XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 20), .completed, "Route header not visible: \(route)")
                capture("nav-\(index + 1)")
                print("KIRANA_ROUTE_AX_BEGIN: \(route)\n\(app.debugDescription)\nKIRANA_ROUTE_AX_END")
                XCTAssertFalse(app.staticTexts["This section could not be loaded"].exists)
                tapVisible("Dashboard")
                let dashboard = app.staticTexts["Your shop at a glance"].firstMatch
                let returned = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in dashboard.exists && dashboard.isHittable }, object: nil)
                XCTAssertEqual(XCTWaiter.wait(for: [returned], timeout: 20), .completed)
            }
        }
    }

    func test11ProfileAndNativeControlInspection() throws {
        guard ProcessInfo.processInfo.environment["KIRANA_QA_SHOP"] != nil else { throw XCTSkip("QA session required") }
        app.terminate(); app.launch()
        tapVisible("Account menu"); tapVisible("My Profile")
        XCTAssertTrue(app.staticTexts["My Profile"].firstMatch.waitForExistence(timeout: 20))
        capture("profile-top")
        print("KIRANA_PROFILE_AX_BEGIN\n\(app.debugDescription)\nKIRANA_PROFILE_AX_END")
        let language = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@", "Select Language")).firstMatch
        if language.waitForExistence(timeout: 15) {
            language.tap(); capture("profile-language-options")
            print("KIRANA_LANGUAGE_AX_BEGIN\n\(app.debugDescription)\nKIRANA_LANGUAGE_AX_END")
            tapVisible("Cancel")
        } else { XCTFail("Select Language control is unavailable") }
        for (selectLabel, choice, expectedTitle) in [
            ("Select Language", "हिंदी", "मेरी प्रोफ़ाइल"),
            ("भाषा चुनें", "मराठी", "माझे प्रोफाइल"),
            ("भाषा निवडा", "ગુજરાતી", "મારી પ્રોફાઇલ"),
            ("ભાષા પસંદ કરો", "English", "My Profile")
        ] {
            let selector = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", selectLabel)).firstMatch
            XCTAssertTrue(selector.waitForExistence(timeout: 10)); selector.tap()
            tapVisible(choice)
            XCTAssertTrue(app.staticTexts[expectedTitle].firstMatch.waitForExistence(timeout: 15))
            capture("profile-language-" + choice)
        }
        let theme = app.switches.matching(NSPredicate(format: "label CONTAINS[c] %@", "Mode")).firstMatch
        if theme.exists {
            theme.tap(); Thread.sleep(forTimeInterval: 1); capture("profile-dark-mode")
            theme.tap(); Thread.sleep(forTimeInterval: 1); capture("profile-restored-light-mode")
        } else { XCTFail("Theme switch is unavailable") }
        tapVisible("Dashboard")
    }

    func test12InvoiceOutputControls() throws {
        guard let invoice = ProcessInfo.processInfo.environment["KIRANA_QA_INVOICE"] else { throw XCTSkip("QA invoice required") }
        app.terminate(); app.launch()
        tapVisible("menu"); tapVisible("Invoices")
        let record = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", invoice)).firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 25)); record.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Download PDF")).firstMatch.waitForExistence(timeout: 30))
        capture("invoice-preview")
        print("KIRANA_INVOICE_AX_BEGIN\n\(app.debugDescription)\nKIRANA_INVOICE_AX_END")
        tapVisible("Share")
        dismissNativeShareSheet("invoice-native-share")
        tapVisible("Download PDF")
        dismissNativeShareSheet("invoice-native-download")
        tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 25))
    }

    private func dismissNativeShareSheet(_ screenshot: String, expectsPrint: Bool = true) {
        let copy = app.cells.matching(NSPredicate(format: "identifier == %@ AND label == %@", "actionGroupCell", "Copy")).firstMatch
        XCTAssertTrue(copy.waitForExistence(timeout: 20), "Native activity sheet did not open")
        capture(screenshot)
        // iOS presents a popover on this device, without a Close/Cancel button.
        // Tap its dimmed background, never a recipient or action that sends data.
        dismissNotificationBanner()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !copy.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 15), .completed)
        if expectsPrint { XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Print")).firstMatch.isEnabled) }
        else { XCTAssertFalse(app.staticTexts["Share cancelled"].firstMatch.waitForExistence(timeout: 1), "Cancelling CSV export must not show an error") }
    }

    func test13CameraOpenAndCancel() throws {
        guard ProcessInfo.processInfo.environment["KIRANA_QA_SHOP"] != nil else { throw XCTSkip("QA session required") }
        app.terminate(); app.launch(); tapVisible("Billing"); tapVisible("Scan barcode")
        tapVisible("Start camera scan")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons["Allow"].firstMatch
        if allow.waitForExistence(timeout: 5) { allow.tap() }
        let cancel = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Cancel scan")).firstMatch
        let opened = cancel.waitForExistence(timeout: 15)
        capture("camera-scan-controls")
        print("KIRANA_CAMERA_AX_BEGIN\n\(app.debugDescription)\nKIRANA_CAMERA_AX_END")
        XCTAssertTrue(opened, "Camera scanner did not expose its cancel control")
        if opened { cancel.tap() }
        capture("camera-cancelled")
        tapVisible("Dashboard")
    }

    func test14NativePrintControl() throws {
        guard let invoice = ProcessInfo.processInfo.environment["KIRANA_QA_INVOICE"] else { throw XCTSkip("QA invoice required") }
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu"); tapVisible("Invoices")
        let record = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", invoice)).firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 25)); record.tap()
        tapVisible("Print")
        let cancel = app.buttons["Cancel"].firstMatch
        let sheet = cancel.waitForExistence(timeout: 15)
        capture("invoice-print-controls")
        print("KIRANA_PRINT_AX_BEGIN\n\(app.debugDescription)\nKIRANA_PRINT_AX_END")
        XCTAssertTrue(sheet, "Native print sheet did not open")
        if sheet { cancel.tap() }
        app.terminate(); app.launch()
    }

    private func attachQACustomer(_ customer: String) {
        tapVisible("Attach customer")
        let search = app.searchFields["Search customer by name or phone"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15)); enterSearch(customer, in: search)
        let match = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", customer)).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: 20)); match.tap()
    }

    func test15PreviousBalancePartialPaymentAndSettlement() throws {
        let env = ProcessInfo.processInfo.environment
        guard let shop = env["KIRANA_QA_SHOP"], let product = env["KIRANA_QA_PRODUCT"], let customer = env["KIRANA_QA_CUSTOMER"] else { throw XCTSkip("QA fixtures required") }
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10), "Wrong shop: refusing writes")
        tapVisible("Dashboard"); tapVisible("Billing")
        attachQACustomer(customer); addProduct(product); tapVisible("Khata")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Attach customer")).firstMatch.waitForExistence(timeout: 30))
        attachQACustomer(customer); addProduct(product); tapVisible("Card / Other")
        tapVisible("Partial Payment")
        let amount = app.textFields["0.00"].firstMatch
        XCTAssertTrue(amount.waitForExistence(timeout: 15)); enterSearch("150", in: amount)
        let collect = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Collect Payment")).firstMatch
        XCTAssertFalse(collect.isEnabled, "Overpayment of the new invoice must be rejected")
        replaceNumber("50", in: amount); capture("partial-bill-with-previous-balance")
        tapVisible("Collect Payment")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Attach customer")).firstMatch.waitForExistence(timeout: 30))
        tapVisible("Payments"); tapVisible("Record Payment")
        let search = app.textFields["Search customers by name or phone"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15)); enterSearch(customer, in: search)
        let match = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: 20)); match.tap()
        let settlement = app.textFields["Enter amount"].firstMatch
        XCTAssertTrue(settlement.waitForExistence(timeout: 15)); settlement.tap(); settlement.typeText("150")
        tapVisible("Save"); tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 30))
        capture("partial-and-old-balance-settled")
    }


    private func replaceNumber(_ text: String, in field: XCUIElement) {
        // A centre tap can place the numeric caret before the existing digits.
        // Position at the trailing edge before deleting, and verify before submit.
        let old = field.value as? String ?? ""
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count))
        XCTAssertTrue((field.value as? String ?? "").isEmpty || field.value as? String == field.placeholderValue, "Amount was not cleared; refusing to submit")
        field.typeText(text)
        XCTAssertEqual(field.value as? String, text)
    }

    func test16RecoverInterruptedQABalance() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["KIRANA_QA_RECOVER_200"] == "1", let shop = env["KIRANA_QA_SHOP"], let customer = env["KIRANA_QA_CUSTOMER"] else { throw XCTSkip("Explicit interrupted-balance recovery required") }
        app.launch(); tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10), "Wrong shop: refusing writes")
        tapVisible("Dashboard"); tapVisible("Payments"); tapVisible("Record Payment")
        let search = app.textFields["Search customers by name or phone"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15)); enterSearch(customer, in: search)
        let match = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: 20)); match.tap()
        let amount = app.textFields["Enter amount"].firstMatch
        XCTAssertTrue(amount.waitForExistence(timeout: 15)); amount.tap(); amount.typeText("200")
        capture("recover-two-unpaid-qa-bills")
        tapVisible("Save"); tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 30))
    }

    func test17RoleMenuPermissions() throws {
        guard let role = ProcessInfo.processInfo.environment["KIRANA_QA_ROLE"] else { throw XCTSkip("Role required") }
        app.launch(); tapVisible("menu")
        XCTAssertFalse(app.buttons["Users"].firstMatch.exists, "Staff must not manage users")
        if role == "CASHIER" {
            for label in ["Reports", "Inventory", "Suppliers", "Purchases"] {
                XCTAssertFalse(app.buttons[label].firstMatch.exists, "Cashier must not see \(label)")
            }
        } else {
            XCTAssertTrue(app.buttons["Reports"].firstMatch.exists)
            XCTAssertTrue(app.buttons["Purchases"].firstMatch.exists)
        }
        capture("role-menu-" + role.lowercased())
        tapVisible("Dashboard")
        tapVisible("Billing"); XCTAssertTrue(app.searchFields["Search product by name or SKU"].firstMatch.waitForExistence(timeout: 25))
        tapVisible("Payments"); XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Record Payment")).firstMatch.waitForExistence(timeout: 25))
        tapVisible("Dashboard")
    }

    func test18ExistingStaffRoleSessions() throws {
        let env = ProcessInfo.processInfo.environment
        guard let shop = env["KIRANA_QA_SHOP"], let owner = env["KIRANA_QA_EMAIL"], let ownerPassword = env["KIRANA_QA_PASSWORD"] else { throw XCTSkip("QA fixture required") }
        for role in ["MANAGER", "CASHIER"] {
            guard let email = env["KIRANA_QA_" + role + "_EMAIL"], let password = env["KIRANA_QA_" + role + "_PASSWORD"] else { throw XCTSkip("Existing staff fixture required") }
            loginExistingQAAccount(email, password, shop)
            tapVisible("menu")
            XCTAssertFalse(app.buttons["Users"].firstMatch.exists)
            if role == "CASHIER" {
                for label in ["Reports", "Inventory", "Suppliers", "Purchases"] { XCTAssertFalse(app.buttons[label].firstMatch.exists, "Unexpected cashier access: " + label) }
            } else {
                XCTAssertTrue(app.buttons["Reports"].firstMatch.exists)
                XCTAssertTrue(app.buttons["Purchases"].firstMatch.exists)
            }
            capture("staff-menu-" + role.lowercased())
            tapVisible("Dashboard"); tapVisible("Billing")
            XCTAssertTrue(app.searchFields["Search product by name or SKU"].firstMatch.waitForExistence(timeout: 25))
            tapVisible("Payments")
            XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Record Payment")).firstMatch.waitForExistence(timeout: 25))
            tapVisible("Dashboard")
        }
        loginExistingQAAccount(owner, ownerPassword, shop)
    }

    private func loginExistingQAAccount(_ email: String, _ password: String, _ shop: String) {
        tapVisible("Account menu"); tapVisible("Logout")
        let secret = app.secureTextFields.firstMatch
        XCTAssertTrue(secret.waitForExistence(timeout: 25))
        let emailField = app.textFields.firstMatch
        emailField.tap(); emailField.typeText(email)
        secret.tap(); secret.typeText(password)
        tapVisible("Sign In")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10))
        tapVisible("Dashboard")
    }
    func test19ColdCheckoutSettledElsewhere() throws {
        let env = ProcessInfo.processInfo.environment
        guard let shop = env["KIRANA_QA_SHOP"], let product = env["KIRANA_QA_PRODUCT"], let customer = env["KIRANA_QA_CUSTOMER"] else { throw XCTSkip("QA fixtures required") }
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10))
        tapVisible("Dashboard"); tapVisible("Billing")
        attachQACustomer(customer); addProduct(product); tapVisible("Card / Other")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Collect Payment")).firstMatch.waitForExistence(timeout: 20))
        capture("saved-unpaid-checkout-before-relaunch")
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("Payments"); tapVisible("Record Payment")
        let search = app.textFields["Search customers by name or phone"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15)); enterSearch(customer, in: search)
        let match = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: 20)); match.tap()
        let amount = app.textFields["Enter amount"].firstMatch
        XCTAssertTrue(amount.waitForExistence(timeout: 15)); amount.tap(); amount.typeText("100")
        tapVisible("Save"); tapVisible("Billing")
        let products = app.searchFields["Search product by name or SKU"].firstMatch
        XCTAssertTrue(products.waitForExistence(timeout: 30), "Paid-checkout recovery stranded Billing accessibility")
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Collect Payment")).firstMatch.exists)
        capture("cold-settled-checkout-cleared")
        addProduct(product); tapVisible("Cash")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Attach customer")).firstMatch.waitForExistence(timeout: 30))
        tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 25))
    }

    func test20BusinessControlInventory() throws {
        guard let shop = ProcessInfo.processInfo.environment["KIRANA_QA_SHOP"] else { throw XCTSkip("QA shop required") }
        app.launch(); tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 15), "Wrong shop: refusing business tests")
        tapVisible("Dashboard")
        for (route, action) in [("Customers", "Add Customer"), ("Suppliers", "Add Supplier"), ("Purchases", "Create Purchase"), ("Reports", ""), ("Cash shift", "")] {
            app.terminate(); app.launch()
            XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
            tapVisible("menu"); tapVisible(route)
            if !action.isEmpty { tapVisible(action) }
            capture("business-controls-" + route.lowercased().replacingOccurrences(of: " ", with: "-"))
            print("KIRANA_BUSINESS_AX_BEGIN: \(route)\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        }
        app.terminate(); app.launch()
        tapVisible("Account menu"); tapVisible("My Profile")
        XCTAssertTrue(app.staticTexts["My Profile"].firstMatch.waitForExistence(timeout: 20))
        capture("business-settings")
        print("KIRANA_BUSINESS_AX_BEGIN: Profile\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        tapVisible("Dashboard")
    }

    private func businessRoute(_ route: String) {
        app.terminate(); app.launch()
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 40))
        tapVisible("menu"); tapVisible(route)
    }
    private func closedForm(_ field: XCUIElement) {
        let closed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !field.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [closed], timeout: 30), .completed)
    }
    private func requireQAShop() throws {
        guard let shop = ProcessInfo.processInfo.environment["KIRANA_QA_SHOP"] else { throw XCTSkip("QA shop required") }
        app.launch(); tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10), "Wrong shop: refusing writes")
        tapVisible("Dashboard")
    }
    func test21CustomerAndSupplierForms() throws {
        try requireQAShop()
        businessRoute("Customers")
        let initialSearch = app.searchFields.firstMatch
        XCTAssertTrue(initialSearch.waitForExistence(timeout: 20)); enterSearch("9911223302", in: initialSearch)
        let existingCustomer = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223302")).firstMatch.waitForExistence(timeout: 5)
        tapVisible("Add Customer")
        let name = app.textFields["Customer Name *"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 20))
        tapVisible("Save"); XCTAssertTrue(name.exists, "Empty customer must not submit")
        if existingCustomer { tapVisible("Close"); closedForm(name) }
        else {
            name.tap(); name.typeText("iPhone QA Customer 20261122")
            let phone = app.textFields["Phone Number *"].firstMatch
            phone.tap(); phone.typeText("9911223302")
            tapVisible("Save"); closedForm(name)
        }
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch("9911223302", in: search)
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223302")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20))
        capture("created-customer-search")
        tapVisible("Edit")
        XCTAssertTrue(name.waitForExistence(timeout: 15)); replaceNumber("iPhone QA Customer Edited 20261122", in: name)
        tapVisible("Save"); closedForm(name)
        tapVisible("View Ledger"); XCTAssertTrue(app.staticTexts["iPhone QA Customer Edited 20261122"].firstMatch.waitForExistence(timeout: 25)); capture("new-customer-ledger")
        print("KIRANA_BUSINESS_AX_BEGIN: Customer ledger\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        businessRoute("Suppliers")
        let firstSupplierSearch = app.searchFields["Search suppliers..."].firstMatch
        XCTAssertTrue(firstSupplierSearch.waitForExistence(timeout: 20)); enterSearch("9911223301", in: firstSupplierSearch)
        let existingSupplier = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223301")).firstMatch.waitForExistence(timeout: 5)
        tapVisible("Add Supplier")
        let supplier = app.textFields["Supplier Name *"].firstMatch
        XCTAssertTrue(supplier.waitForExistence(timeout: 20)); tapVisible("Save"); XCTAssertTrue(supplier.exists)
        if existingSupplier { tapVisible("Close"); closedForm(supplier) }
        else {
            supplier.tap(); supplier.typeText("iPhone QA Supplier 20261122")
            let supplierPhone = app.textFields["Phone Number *"].firstMatch
            supplierPhone.tap(); supplierPhone.typeText("9911223301")
            let state = app.textFields["State"].firstMatch; state.tap(); state.typeText("Maharashtra")
            let code = app.textFields["GST state code"].firstMatch; code.tap(); code.typeText("27")
            tapVisible("Save"); closedForm(supplier)
        }
        let supplierSearch = app.searchFields["Search suppliers..."].firstMatch
        XCTAssertTrue(supplierSearch.waitForExistence(timeout: 20)); enterSearch("9911223301", in: supplierSearch)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223301")).firstMatch.waitForExistence(timeout: 20))
        tapVisible("Edit"); XCTAssertTrue(supplier.waitForExistence(timeout: 15))
        let address = app.textFields["Address"].firstMatch; replaceNumber("QA supplier address updated", in: address)
        tapVisible("Save"); closedForm(supplier); capture("created-and-edited-supplier")
        tapVisible("View Ledger"); XCTAssertTrue(app.staticTexts["iPhone QA Supplier 20261122"].firstMatch.waitForExistence(timeout: 25)); capture("new-supplier-ledger")
        print("KIRANA_BUSINESS_AX_BEGIN: Supplier ledger\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        tapVisible("Dashboard")
    }
    func test22PurchasePackControls() throws {
        try requireQAShop(); businessRoute("Purchases"); tapVisible("Create Purchase")
        tapVisible("Select Supplier")
        let supplierSearch = app.searchFields["Search suppliers..."].firstMatch
        XCTAssertTrue(supplierSearch.waitForExistence(timeout: 20)); enterSearch("9911223301", in: supplierSearch)
        let supplier = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223301")).firstMatch
        XCTAssertTrue(supplier.waitForExistence(timeout: 20)); supplier.tap()
        let invoice = app.textFields["Invoice Number *"].firstMatch
        XCTAssertTrue(invoice.waitForExistence(timeout: 15)); invoice.tap(); invoice.typeText("PHONE-20261122-1")
        let search = app.searchFields["Search products to add..."].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch("IOS-PHONE-QA-20261121", in: search)
        let product = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "IOS-PHONE-QA-20261121")).firstMatch
        XCTAssertTrue(product.waitForExistence(timeout: 25)); product.tap()
        let cost = app.textFields["iPhone QA Rice 20261121 Unit Price (Purchase Price)"].firstMatch
        XCTAssertTrue(cost.waitForExistence(timeout: 30), "Purchase item must finish loading before probing its controls")
        selectWebOption("iPhone QA Rice 20261121 Purchase entered as", value: "Box / pack")
        capture("purchase-item-controls")
        print("KIRANA_BUSINESS_AX_BEGIN: Purchase item\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
    }
    func test23ShiftVarianceAndClose() throws {
        try requireQAShop(); businessRoute("Cash shift")
        let opening = app.textFields["Opening cash"].firstMatch
        XCTAssertTrue(opening.waitForExistence(timeout: 25)); replaceNumber("500", in: opening)
        let counter = app.textFields["Counter name (optional)"].firstMatch; counter.tap(); counter.typeText("QA-PHONE-22")
        tapVisible("Open shift")
        let counted = app.textFields["Counted cash"].firstMatch
        XCTAssertTrue(counted.waitForExistence(timeout: 25)); counted.tap(); counted.typeText("490")
        let close = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Close shift")).firstMatch
        XCTAssertFalse(close.isEnabled, "Cash variance requires an explanation")
        let reason = app.textFields["Reason for cash difference"].firstMatch
        XCTAssertTrue(reason.waitForExistence(timeout: 15)); reason.tap(); reason.typeText("QA counted cash variance")
        capture("shift-variance-requires-explanation"); tapVisible("Close shift")
        XCTAssertTrue(opening.waitForExistence(timeout: 25)); capture("shift-closed-history")
        tapVisible("Dashboard")
    }
    func test24ReportAndGSTControls() throws {
        try requireQAShop(); businessRoute("Reports")
        let gst = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "GST & CA reports")).firstMatch
        capture("reports-before-wait"); print("KIRANA_REPORT_PROBE\n\(app.debugDescription)"); XCTAssertTrue(gst.waitForExistence(timeout: 25)); capture("reports-overview")
        print("KIRANA_BUSINESS_AX_BEGIN: Reports loaded\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        gst.tap()
        XCTAssertTrue(app.staticTexts["GST & CA reports"].firstMatch.waitForExistence(timeout: 25))
        capture("gst-ca-controls")
        print("KIRANA_BUSINESS_AX_BEGIN: GST loaded\n\(app.debugDescription)\nKIRANA_BUSINESS_AX_END")
        tapVisible("Download CSV"); dismissNativeShareSheet("gst-summary-csv", expectsPrint: false)
        for view in ["Sales register", "Purchase / input tax", "HSN summary"] {
            tapVisible(view); tapVisible("Download CSV"); dismissNativeShareSheet("gst-\(view)-csv", expectsPrint: false)
        }
        tapVisible("Dashboard")
    }

    func test25ExistingLedgers() throws {
        try requireQAShop(); businessRoute("Customers")
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch("9911223302", in: search)
        tapVisible("View Ledger")
        XCTAssertTrue(app.staticTexts["iPhone QA Customer Edited 20261122"].firstMatch.waitForExistence(timeout: 25))
        capture("customer-ledger-loaded")
        businessRoute("Suppliers")
        let supplierSearch = app.searchFields["Search suppliers..."].firstMatch
        XCTAssertTrue(supplierSearch.waitForExistence(timeout: 20)); enterSearch("9911223301", in: supplierSearch)
        tapVisible("View Ledger")
        XCTAssertTrue(app.staticTexts["iPhone QA Supplier 20261122"].firstMatch.waitForExistence(timeout: 25))
        capture("supplier-ledger-loaded"); tapVisible("Dashboard")
    }
    func test27ThirtyTwoProductCashBill() throws {
        guard let raw = ProcessInfo.processInfo.environment["KIRANA_QA_LONG_SKUS"],
              let data = raw.data(using: .utf8), let skus = try JSONSerialization.jsonObject(with: data) as? [String], skus.count == 32 else { throw XCTSkip("Explicit 32-product QA fixture required") }
        try requireQAShop(); tapVisible("Billing")
        for sku in skus { addProduct(sku) }
        capture("long-bill-32-products-before-payment")
        tapVisible("Cash")
        let cleared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !self.app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Cash")).firstMatch.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 45), .completed)
        capture("long-bill-cash-completed"); tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 25))
    }

    func test26ReportNativePrint() throws {
        try requireQAShop(); businessRoute("Reports")
        tapVisible("Print report")
        let cancel = app.buttons["Cancel"].firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 20), "Report print must open the real native preview")
        capture("native-report-print-preview"); cancel.tap(); tapVisible("Dashboard")
    }

    func test28NamedFormCloseControls() throws {
        try requireQAShop(); businessRoute("Customers"); tapVisible("Add Customer")
        let customer = app.textFields["Customer Name *"].firstMatch
        XCTAssertTrue(customer.waitForExistence(timeout: 15)); tapVisible("Close"); closedForm(customer)
        capture("customer-close-accessible")
        businessRoute("Suppliers"); tapVisible("Add Supplier")
        let supplier = app.textFields["Supplier Name *"].firstMatch
        XCTAssertTrue(supplier.waitForExistence(timeout: 15)); tapVisible("Close"); closedForm(supplier)
        capture("supplier-close-accessible"); tapVisible("Dashboard")
    }

    private func selectWebOption(_ label: String, value: String) {
        dismissNotificationBanner()
        let popup = app.popUpButtons[label].firstMatch
        let control = popup.exists ? popup : app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
        XCTAssertTrue(control.waitForExistence(timeout: 15)); control.tap()
        let wheel = app.pickerWheels.firstMatch
        if wheel.waitForExistence(timeout: 2) {
            wheel.adjust(toPickerWheelValue: value)
            let done = app.buttons["Done"].firstMatch
            if done.exists { done.tap() }
        } else {
            let option = app.buttons[value].firstMatch
            XCTAssertTrue(option.waitForExistence(timeout: 10)); option.tap()
        }
    }
    func test29FoodLicenceCreateAndEdit() throws {
        try requireQAShop(); tapVisible("Account menu"); tapVisible("My Profile")
        let recorded = app.staticTexts["Phone QA FSSAI 20261122"].firstMatch
        let existing = recorded.waitForExistence(timeout: 5)
        if !existing {
            tapVisible("Add food licence"); tapVisible("Save licence")
            selectWebOption("Legal firm", value: "iPhone QA Demo 20261121")
            let number = app.textFields["FSSAI number (14 digits)"].firstMatch
            XCTAssertTrue(number.waitForExistence(timeout: 10)); number.tap(); number.typeText("12345678901234")
            let label = app.textFields["Licence / trade name"].firstMatch; label.tap(); label.typeText("Phone QA FSSAI 20261122")
            let holder = app.textFields["Registered holder name"].firstMatch; holder.tap(); holder.typeText("iPhone QA Holder")
            let address = app.textViews["Licensed premises address"].firstMatch
            XCTAssertTrue(address.waitForExistence(timeout: 10)); address.tap(); address.typeText("Isolated QA premises, Maharashtra")
            tapVisible("Save licence")
            XCTAssertTrue(recorded.waitForExistence(timeout: 25))
        }
        tapVisible("Edit licence")
        let number = app.textFields["FSSAI number (14 digits)"].firstMatch
        XCTAssertTrue(number.waitForExistence(timeout: 15)); XCTAssertFalse(number.isEnabled)
        let holder = app.textFields["Registered holder name"].firstMatch
        replaceNumber("iPhone QA Holder updated", in: holder); tapVisible("Save licence")
        XCTAssertTrue(app.staticTexts["iPhone QA Holder updated"].firstMatch.waitForExistence(timeout: 25))
        capture("food-licence-created-and-edited"); tapVisible("Dashboard")
    }
    func test30ExpiryFilters() throws {
        try requireQAShop(); businessRoute("Inventory"); tapVisible("Expiry alerts")
        let expired = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Expired")).firstMatch
        let near = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Near expiry")).firstMatch
        XCTAssertTrue(expired.waitForExistence(timeout: 25)); XCTAssertTrue(near.exists)
        capture("expiry-summary-loaded"); expired.tap(); capture("expired-filter")
        near.tap(); capture("near-expiry-filter")
        XCTAssertFalse(app.staticTexts["Could not load expiry alerts."].exists)
        tapVisible("Dashboard")
    }

    func test31PackPurchaseAndSupplierPayment() throws {
        try requireQAShop()
        if ProcessInfo.processInfo.environment["KIRANA_QA_PACK_POSTED"] != "1" {
            businessRoute("Purchases"); tapVisible("Create Purchase"); tapVisible("Select Supplier")
            let search = app.searchFields["Search suppliers..."].firstMatch
            XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch("9911223301", in: search)
            let supplier = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "9911223301")).firstMatch
            XCTAssertTrue(supplier.waitForExistence(timeout: 20)); supplier.tap()
            let invoice = app.textFields["Invoice Number *"].firstMatch
            XCTAssertTrue(invoice.waitForExistence(timeout: 20)); invoice.tap(); invoice.typeText("PHONE-20261122-PACK-1")
            selectWebOption("Purchase food licence (optional)", value: "Phone QA FSSAI 20261122 · 12345678901234")
            let products = app.searchFields["Search products to add..."].firstMatch
            XCTAssertTrue(products.waitForExistence(timeout: 20)); enterSearch("IOS-PHONE-QA-20261121", in: products)
            let product = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "IOS-PHONE-QA-20261121")).firstMatch
            XCTAssertTrue(product.waitForExistence(timeout: 25)); product.tap()
            let cost = app.textFields["iPhone QA Rice 20261121 Unit Price (Purchase Price)"].firstMatch
            XCTAssertTrue(cost.waitForExistence(timeout: 30))
            selectWebOption("iPhone QA Rice 20261121 Purchase entered as", value: "Box / pack")
            let factor = app.textFields["iPhone QA Rice 20261121 Sale units in one pack"].firstMatch
            XCTAssertTrue(factor.waitForExistence(timeout: 15)); replaceNumber("5", in: factor)
            let price = app.textFields["iPhone QA Rice 20261121 Price per box / pack"].firstMatch
            XCTAssertTrue(price.waitForExistence(timeout: 15)); replaceNumber("400", in: price)
            tapVisible("Increase quantity for iPhone QA Rice 20261121")
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "10 sale units added to stock")).firstMatch.waitForExistence(timeout: 15))
            let paid = app.textFields["0.00"].firstMatch
            XCTAssertTrue(paid.waitForExistence(timeout: 15)); replaceNumber("200", in: paid)
            capture("pack-purchase-10-units-800-partial-200"); tapVisible("Create Purchase")
            let header = app.staticTexts["Purchases"].firstMatch
            let returned = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in header.exists && header.isHittable }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [returned], timeout: 40), .completed)
        }
        businessRoute("Suppliers")
        let search = app.searchFields["Search suppliers..."].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch("9911223301", in: search)
        tapVisible("Make Payment"); tapVisible("Pay Full")
        let amount = app.textFields["Amount *"].firstMatch
        XCTAssertTrue(amount.waitForExistence(timeout: 15)); XCTAssertEqual(amount.value as? String, "600")
        capture("supplier-payment-remaining-600"); tapVisible("Record Payment"); closedForm(amount)
        tapVisible("View Ledger")
        XCTAssertTrue(app.staticTexts["iPhone QA Supplier 20261122"].firstMatch.waitForExistence(timeout: 25))
        capture("supplier-ledger-after-settlement"); tapVisible("Dashboard")
        XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 25))
    }

}
