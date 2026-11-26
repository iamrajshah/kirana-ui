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
            let field = app.textFields.matching(NSPredicate(format: "label CONTAINS[c] %@", "Email or Phone")).firstMatch
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
        let product = app.otherElements.matching(NSPredicate(format: "label BEGINSWITH[c] %@", name)).firstMatch
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
        guard let shop = ProcessInfo.processInfo.environment["KIRANA_QA_SHOP"] else {
            throw XCTSkip("Requires disposable QA shop")
        }
        app.launch()
        let dashboardReady = app.staticTexts["Your shop at a glance"].firstMatch
        XCTAssertTrue(dashboardReady.waitForExistence(timeout: 40), "Dashboard must finish loading before route audit")
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 10), "Wrong shop: audit stopped")
        tapVisible("Dashboard")
        continueAfterFailure = true
        let routes = ["Customers", "Invoices", "Online orders", "Payments", "Products", "Inventory", "Categories", "Suppliers", "Purchases", "Reports", "Users", "Import/Export", "Plan & account", "Cash shift", "Getting started", "About"]
        for (index, route) in routes.enumerated() {
            XCTContext.runActivity(named: "NAV-\(index + 1) \(route)") { _ in
                tapVisible("menu")
                let entry = app.buttons.matching(NSPredicate(format: "label ==[c] %@", route)).firstMatch
                guard entry.waitForExistence(timeout: 8) else {
                    print("KIRANA_ROUTE_UNAVAILABLE: \(route)")
                    capture("nav-\(index + 1)-unavailable")
                    tapVisible("Dashboard")
                    return
                }
                entry.tap()
                let header = app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", route)).firstMatch
                XCTAssertTrue(header.waitForExistence(timeout: 15), "Expected route header missing: \(route)")
                capture("nav-\(index + 1)")
                print("KIRANA_ROUTE_AX_BEGIN: \(route)\n\(app.debugDescription)\nKIRANA_ROUTE_AX_END")
                XCTAssertFalse(app.staticTexts["This section could not be loaded"].exists, "Route boundary failure: \(route)")
                tapVisible("Dashboard")
                let returned = app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 15)
                capture("nav-\(index + 1)-returned")
                if !returned {
                    print("KIRANA_ROUTE_RECOVERY_REQUIRED: \(route)")
                    app.terminate(); app.launch()
                    XCTAssertTrue(app.staticTexts["Your shop at a glance"].firstMatch.waitForExistence(timeout: 35))
                }
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
        } else { print("KIRANA_CONTROL_UNAVAILABLE: Select Language") }
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
        } else { print("KIRANA_CONTROL_UNAVAILABLE: Theme switch") }
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

    private func dismissNativeShareSheet(_ screenshot: String) {
        let copy = app.cells.matching(NSPredicate(format: "identifier == %@ AND label == %@", "actionGroupCell", "Copy")).firstMatch
        XCTAssertTrue(copy.waitForExistence(timeout: 20), "Native activity sheet did not open")
        capture(screenshot)
        // iOS presents a popover on this device, without a Close/Cancel button.
        // Tap its dimmed background, never a recipient or action that sends data.
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !copy.exists }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 15), .completed)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Print")).firstMatch.isEnabled)
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
        let match = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
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

    func test40CurrentBillingCashKhataAndPayment() throws {
        let env = ProcessInfo.processInfo.environment
        guard let shop = env["KIRANA_QA_SHOP"], let product = env["KIRANA_QA_PRODUCT"], let customer = env["KIRANA_QA_CUSTOMER"] else { throw XCTSkip("Disposable QA fixtures required") }
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Dashboard")).firstMatch.waitForExistence(timeout: 45))
        tapVisible("menu")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", shop)).firstMatch.waitForExistence(timeout: 15), "Wrong shop: refusing financial writes")
        tapVisible("Dashboard"); tapVisible("Billing")
        addProduct(product); capture("build17-real-cash-cart")
        tapVisible("Cash")
        let attach = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Attach customer")).firstMatch
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ==[c] %@", "Cash")).firstMatch.waitForNonExistence(timeout: 60), "Cash checkout did not return to empty billing")
        XCTAssertTrue(attach.waitForExistence(timeout: 30)); capture("build17-real-cash-complete")
        attachQACustomer(customer); addProduct(product); tapVisible("Khata")
        XCTAssertTrue(attach.waitForExistence(timeout: 60), "Khata checkout did not return to empty billing")
        capture("build16-real-khata-complete")
        tapVisible("Payments"); tapVisible("Record Payment")
        let search = app.textFields["Search customers by name or phone"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 20)); enterSearch(customer, in: search)
        let match = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", customer)).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: 25)); match.tap()
        let amount = app.textFields["Enter amount"].firstMatch
        XCTAssertTrue(amount.waitForExistence(timeout: 15)); enterSearch("100", in: amount)
        capture("build16-real-payment-form"); tapVisible("Save")
        XCTAssertTrue(amount.waitForNonExistence(timeout: 45), "Payment form remained open")
        tapVisible("Dashboard"); capture("build16-real-payment-dashboard")
    }

}
