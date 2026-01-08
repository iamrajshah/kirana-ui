# Kirana POS - QA Testing Guide

## Table of Contents
1. [Application Overview](#application-overview)
2. [System Architecture](#system-architecture)
3. [User Types & Permissions](#user-types--permissions)
4. [Getting Started](#getting-started)
5. [Feature Testing Flows](#feature-testing-flows)
   - [Billing Flow](#billing-flow)
   - [Purchase Flow](#purchase-flow)
   - [Customer Management](#customer-management)
   - [Supplier Management](#supplier-management)
   - [Ledger Management](#ledger-management)
   - [Payment Processing](#payment-processing)
   - [Inventory Management](#inventory-management)
   - [Reports](#reports)
   - [User Management](#user-management)
   - [Import/Export](#importexport)
6. [Multi-Tenancy](#multi-tenancy)
7. [Test Scenarios](#test-scenarios)

---

## Application Overview

**Kirana POS** is a Point of Sale (POS) billing system designed for kirana stores (small grocery/retail shops) in India. The application helps shop owners manage their daily operations including:

- **Sales/Billing**: Quick product search and invoice generation
- **Purchase Management**: Record supplier purchases and track payables
- **Customer Credit**: Track customer credit balances and payments
- **Supplier Ledger**: Manage supplier accounts and outstanding payments
- **Inventory**: Real-time stock tracking with low stock alerts
- **Reports**: Business analytics and financial reports
- **Multi-Store Support**: Each tenant (store) has isolated data

### Key Components
- **Frontend**: Kirana UI (Mobile-first web app using Ionic React)
- **Backend**: Kirana Server (REST API built with Node.js/Express)
- **Database**: MySQL with tenant isolation

---

## System Architecture

### Multi-Tenancy
The system supports multiple stores (tenants) in a single installation. Each store's data is completely isolated:
- Store A cannot see Store B's customers, invoices, or inventory
- Each store has its own set of users and permissions
- Identified by `X-Tenant-ID` header in API requests

### Authentication
- Users log in with **phone/email + password**
- JWT tokens issued upon successful login
- Tokens contain: user ID, tenant ID, and roles
- Access tokens expire after a set duration

---

## User Types & Permissions

The system has three user roles with different access levels:

### 1. OWNER (Full Access)
**Who**: Store owner or proprietor

**Can Access**:
- ✅ Dashboard (all metrics)
- ✅ Billing/POS
- ✅ Customer Management (add, edit, view)
- ✅ Supplier Management
- ✅ Product Management (add, edit, delete)
- ✅ Inventory Management
- ✅ Purchase Entry
- ✅ Payment Recording
- ✅ Invoice Management
- ✅ All Reports
- ✅ User Management (create/edit MANAGER and CASHIER users)
- ✅ Import/Export Data
- ✅ Profile Settings

**Cannot Access**:
- ❌ Cannot create another OWNER (only one owner per store)

---

### 2. MANAGER (Limited Administrative Access)
**Who**: Store manager or supervisor

**Can Access**:
- ✅ Dashboard (all metrics)
- ✅ Billing/POS
- ✅ Customer Management
- ✅ Supplier Management
- ✅ Product Management
- ✅ Inventory Management
- ✅ Purchase Entry
- ✅ Payment Recording
- ✅ Invoice Management
- ✅ All Reports
- ✅ Profile Settings

**Cannot Access**:
- ❌ User Management (cannot create or modify users)
- ❌ Import/Export Data

---

### 3. CASHIER (Basic Operations)
**Who**: Counter staff, billing operator

**Can Access**:
- ✅ Billing/POS (create invoices)
- ✅ Customer Management (view, limited add)
- ✅ Payment Recording
- ✅ Profile Settings

**Cannot Access**:
- ❌ Dashboard
- ❌ Product Management
- ❌ Inventory Management
- ❌ Purchase Entry
- ❌ Supplier Management
- ❌ Reports
- ❌ User Management
- ❌ Import/Export

---

## Getting Started

### Prerequisites
1. Access to the Kirana UI application (web/mobile URL)
2. Test credentials for different roles (OWNER, MANAGER, CASHIER)
3. A tenant ID for your test store

### Login Process
1. Open the application
2. Enter **phone number** or **email**
3. Enter **password**
4. Click **Login**
5. Show/Hide password by clicking the eye icon

### Test Credentials
```
OWNER Account:
- Phone: 9876543210
- Password: owner123

MANAGER Account:
- Phone: 9876543211
- Password: manager123

CASHIER Account:
- Phone: 9876543212
- Password: cashier123
```

---

## Feature Testing Flows

### Billing Flow

**Purpose**: Create invoices for customer sales

**User Roles**: OWNER, MANAGER, CASHIER

#### Step-by-Step Process

1. **Navigate to Billing Page**
   - Click on "Billing" from the main menu
   - Alternative: Use dashboard "New Bill" button

2. **Select/Add Customer** (Optional)
   - Search existing customer by name/phone
   - Click "Add Customer" if new
   - Enter: Name, Phone, Email (optional)
   - Save customer
   - **Note**: Billing can be done without selecting a customer (cash sales)

3. **Add Products to Cart**
   - **Method 1: Search**
     - Type product name in search bar
     - Select from dropdown results
   - **Method 2: Browse**
     - Scroll through product list
     - Click on product
   - **Quantity Selection**:
     - Use +/- buttons to adjust quantity
     - Or enter quantity manually
   - **Verify**:
     - Product appears in cart
     - Price calculates correctly
     - Subtotal updates

4. **Apply Discounts** (Optional)
   - Enter discount amount or percentage
   - Verify total recalculates

5. **Review Invoice**
   - Check all items and quantities
   - Verify pricing
   - Check GST calculation
   - Review total amount

6. **Choose Payment Mode**
   - **Cash**: Full payment received
   - **Credit**: Amount to be paid later (adds to customer ledger)
   - **Partial**: Pay part now, rest later
   - **Other modes**: UPI, Card, Cheque, Bank Transfer

7. **Generate Invoice**
   - Click "Generate Invoice" or "Save"
   - System generates unique invoice number
   - Invoice status updates to PAID/UNPAID/PARTIAL

8. **Post-Invoice Actions**
   - Print invoice (if enabled)
   - Share via WhatsApp/Email
   - View invoice details
   - Start new bill

#### Test Cases

**TC-BILL-001: Cash Sale Without Customer**
- Add products to cart
- Select payment mode: CASH
- Generate invoice
- **Expected**: Invoice created with status PAID, no customer linked

**TC-BILL-002: Credit Sale With Customer**
- Select customer
- Add products
- Select payment mode: CREDIT
- Generate invoice
- **Expected**: Invoice status UNPAID, amount added to customer's credit balance

**TC-BILL-003: Partial Payment**
- Select customer
- Add products worth ₹1000
- Enter paid amount: ₹600
- Generate invoice
- **Expected**: Invoice status PARTIAL, ₹400 outstanding

**TC-BILL-004: Out of Stock Product**
- Add product with 0 inventory
- Try to generate invoice
- **Expected**: Error message "Insufficient stock"

**TC-BILL-005: Discount Application**
- Add products worth ₹1000
- Apply 10% discount
- **Expected**: Total becomes ₹900, discount ₹100 shown separately

---

### Purchase Flow

**Purpose**: Record purchases from suppliers and update inventory

**User Roles**: OWNER, MANAGER

#### Step-by-Step Process

1. **Navigate to Purchases**
   - Click "Purchases" from menu
   - Click "Create Purchase" button

2. **Select Supplier**
   - Search and select existing supplier
   - Or click "Add Supplier" for new
   - Enter: Name, Phone, GST Number (optional), Email

3. **Add Products**
   - Search for product
   - If product doesn't exist, create it:
     - Product Name
     - Category
     - Unit (kg, pc, ltr, etc.)
     - GST rate
   - Enter purchase details:
     - Quantity purchased
     - Purchase price per unit
     - MRP (selling price)
     - Batch/Lot number (optional)
     - Expiry date (optional)

4. **Review Purchase**
   - Check all products and quantities
   - Verify pricing
   - Check total amount
   - GST breakdown

5. **Payment Details**
   - **Paid**: Full amount paid to supplier
   - **Credit**: Amount payable later
   - **Partial**: Part paid, rest credit
   - Payment mode: Cash, UPI, Cheque, Bank Transfer

6. **Save Purchase**
   - Click "Save Purchase"
   - System updates:
     - Inventory quantities increase
     - Supplier ledger updated (if credit/partial)
     - Purchase record created

#### Test Cases

**TC-PURCH-001: Cash Purchase**
- Select supplier
- Add 5 products with quantities
- Mark as PAID in cash
- **Expected**: Inventory increased, no outstanding to supplier

**TC-PURCH-002: Credit Purchase**
- Select supplier
- Add products worth ₹10,000
- Mark as CREDIT
- **Expected**: Inventory increased, ₹10,000 added to supplier's payable ledger

**TC-PURCH-003: Partial Payment**
- Purchase worth ₹10,000
- Pay ₹6,000
- **Expected**: Inventory increased, ₹4,000 outstanding to supplier

**TC-PURCH-004: New Product During Purchase**
- Add new product while creating purchase
- Enter all product details
- Complete purchase
- **Expected**: Product created, inventory updated

---

### Customer Management

**Purpose**: Maintain customer database and track credit

**User Roles**: OWNER, MANAGER, CASHIER (view only)

#### Features

1. **Add Customer**
   - Click "Customers" → "Add Customer"
   - Required: Name, Phone (unique)
   - Optional: Email, Address
   - **Validation**: Phone must be 10 digits

2. **View Customer List**
   - Search by name or phone
   - Filter by credit balance (customers with outstanding)
   - Sort by name, balance, last purchase

3. **Customer Details**
   - Click on customer name
   - View:
     - Contact information
     - Current credit balance
     - Total purchases
     - Last purchase date
     - Invoice history

4. **Customer Ledger**
   - See all transactions:
     - Invoices (debit - increases balance)
     - Payments (credit - decreases balance)
   - Running balance after each transaction
   - Filter by date range

5. **Edit Customer**
   - Update name, phone, email
   - **Cannot**: Delete customer with outstanding balance

#### Test Cases

**TC-CUST-001: Add New Customer**
- Enter: Name, 10-digit phone
- **Expected**: Customer created successfully

**TC-CUST-002: Duplicate Phone**
- Try adding customer with existing phone
- **Expected**: Error "Phone number already exists"

**TC-CUST-003: Invalid Phone**
- Enter 9-digit phone
- **Expected**: Validation error

**TC-CUST-004: View Customer Ledger**
- Customer with 3 invoices and 2 payments
- **Expected**: All 5 transactions visible in chronological order

---

### Supplier Management

**Purpose**: Manage supplier database and track payables

**User Roles**: OWNER, MANAGER

#### Features

1. **Add Supplier**
   - Click "Suppliers" → "Add Supplier"
   - Required: Name, Phone
   - Optional: GST Number, Email, Address, Bank Details

2. **View Supplier List**
   - Search by name, phone, or GST number
   - Filter by outstanding balance
   - View total payable amount

3. **Supplier Details**
   - Contact information
   - Current payable balance
   - Total purchases
   - Bank details for payments

4. **Supplier Ledger**
   - All purchase invoices (increases payable)
   - All payments made (decreases payable)
   - Running balance
   - Filter by date range

#### Test Cases

**TC-SUPP-001: Add Supplier**
- Enter name, phone, GST
- **Expected**: Supplier created

**TC-SUPP-002: GST Validation**
- Enter invalid GST format
- **Expected**: Validation error

**TC-SUPP-003: View Payables**
- Supplier with ₹50,000 purchases and ₹30,000 paid
- **Expected**: Outstanding shows ₹20,000

---

### Ledger Management

**Purpose**: Track all financial transactions

#### Customer Ledger

**Debit Entries** (Increase Balance):
- New invoices on credit
- Additional charges

**Credit Entries** (Decrease Balance):
- Customer payments received
- Sales returns

**Balance Calculation**:
```
Credit Balance = Total Invoices (Debit) - Total Payments (Credit)
```

#### Supplier Ledger

**Debit Entries** (Decrease Payable):
- Payments made to supplier
- Purchase returns

**Credit Entries** (Increase Payable):
- New purchases on credit
- Additional charges from supplier

**Balance Calculation**:
```
Payable Balance = Total Purchases (Credit) - Total Payments (Debit)
```

#### Test Cases

**TC-LEDG-001: Customer Credit Sale**
- Invoice ₹1,000 on credit
- **Expected**: Customer ledger +₹1,000 debit

**TC-LEDG-002: Customer Payment**
- Receive ₹500 payment
- **Expected**: Customer ledger +₹500 credit, balance reduces

**TC-LEDG-003: Supplier Credit Purchase**
- Purchase ₹5,000 on credit
- **Expected**: Supplier ledger +₹5,000 credit (payable)

**TC-LEDG-004: Supplier Payment**
- Pay ₹3,000 to supplier
- **Expected**: Supplier ledger +₹3,000 debit, payable reduces

---

### Payment Processing

**Purpose**: Record payment transactions

**User Roles**: OWNER, MANAGER, CASHIER

#### Payment Types

1. **Customer Payment** (Receivable Collection)
   - Navigate to Customers → Select Customer → "Add Payment"
   - Enter amount
   - Select payment mode (Cash, UPI, Card, Cheque, Bank)
   - Add reference/note
   - **Effect**: Reduces customer credit balance

2. **Supplier Payment** (Payable Settlement)
   - Navigate to Suppliers → Select Supplier → "Add Payment"
   - Enter amount
   - Select payment mode
   - Add reference (cheque number, transaction ID)
   - **Effect**: Reduces supplier payable balance

#### Payment Modes

- **CASH**: Physical cash
- **UPI**: UPI transaction (add UPI ID reference)
- **CARD**: Card payment (add last 4 digits)
- **CHEQUE**: Add cheque number, bank, date
- **BANK**: Bank transfer (add transaction ID)

#### Test Cases

**TC-PAY-001: Customer Cash Payment**
- Customer with ₹2,000 credit
- Record ₹2,000 cash payment
- **Expected**: Credit balance becomes ₹0

**TC-PAY-002: Partial Customer Payment**
- Customer with ₹5,000 credit
- Record ₹2,000 payment
- **Expected**: Remaining balance ₹3,000

**TC-PAY-003: Supplier Payment via Cheque**
- Supplier with ₹10,000 payable
- Record ₹10,000 cheque payment (number CHQ123456)
- **Expected**: Payable becomes ₹0, cheque details saved

**TC-PAY-004: Overpayment**
- Customer with ₹100 credit
- Try to record ₹150 payment
- **Expected**: Warning or balance becomes -₹50 (advance)

---

### Inventory Management

**Purpose**: Track product stock levels

**User Roles**: OWNER, MANAGER

#### Features

1. **View Inventory**
   - Lists all products with current stock
   - Shows: Product name, variant, quantity, low stock threshold

2. **Stock Levels**
   - **In Stock**: Quantity > 0 and above threshold
   - **Low Stock**: Quantity <= threshold (highlighted in yellow/orange)
   - **Out of Stock**: Quantity = 0 (highlighted in red)

3. **Update Stock**
   - Manual adjustment (for physical stock verification)
   - Enter new quantity
   - Add reason/note
   - **Use Cases**:
     - Damage/expiry
     - Theft
     - Stock counting correction

4. **Low Stock Alerts**
   - Dashboard shows count of low stock items
   - Set threshold per product (default: 5 units)

5. **Stock Movement History**
   - View all stock in/out transactions:
     - Purchase: Stock IN
     - Sale: Stock OUT
     - Adjustment: Stock correction

#### Test Cases

**TC-INV-001: View Inventory**
- **Expected**: All products with quantities listed

**TC-INV-002: Low Stock Alert**
- Product with quantity 3, threshold 5
- **Expected**: Shows in low stock list/dashboard

**TC-INV-003: Stock Adjustment**
- Current stock: 50
- Physical count: 48
- Adjust to 48, reason "Damaged goods"
- **Expected**: Stock updated to 48, adjustment logged

**TC-INV-004: Purchase Increases Stock**
- Product A: 10 units in stock
- Purchase 20 more units
- **Expected**: Stock becomes 30

**TC-INV-005: Sale Decreases Stock**
- Product B: 15 units in stock
- Sell 5 units
- **Expected**: Stock becomes 10

---

### Reports

**Purpose**: Business analytics and insights

**User Roles**: OWNER, MANAGER

#### Report Types

1. **Sales Report**
   - Date range selection
   - Metrics:
     - Total revenue
     - Number of invoices
     - Average invoice value
     - GST collected
   - Breakdown by:
     - Product
     - Category
     - Payment mode
     - Day/week/month

2. **Outstanding Report**
   - **Customer Outstanding**:
     - List of customers with credit balance
     - Total receivables
     - Aging (0-30 days, 31-60 days, 60+ days)
   - **Supplier Outstanding**:
     - List of suppliers with payables
     - Total payables
     - Payment due dates

3. **Inventory Report**
   - Current stock levels
   - Stock value (quantity × cost price)
   - Low stock items
   - Out of stock items
   - Fast-moving products
   - Slow-moving products

4. **Daily Cashbook**
   - Date selection
   - Opening balance
   - Cash IN:
     - Cash sales
     - Customer payments received
   - Cash OUT:
     - Supplier payments made
     - Expenses
   - Closing balance

5. **Profit & Loss Report**
   - Date range
   - Revenue (sales)
   - Cost of Goods Sold (purchase cost)
   - Gross Profit
   - Expenses
   - Net Profit

6. **Top Selling Products**
   - Date range
   - Products ranked by:
     - Quantity sold
     - Revenue generated

7. **Purchase Register**
   - All purchases in date range
   - Supplier-wise breakdown
   - Total purchase value
   - GST details

8. **Supplier Outstanding Report**
   - Supplier-wise payables
   - Due dates
   - Overdue amounts

#### Test Cases

**TC-REP-001: Sales Report**
- Select date: Last 7 days
- **Expected**: Shows revenue, invoice count, breakdown

**TC-REP-002: Customer Outstanding**
- 5 customers with credit
- **Expected**: All 5 listed with balances, total matches sum

**TC-REP-003: Low Stock Report**
- 3 products below threshold
- **Expected**: All 3 products listed with quantities

**TC-REP-004: Daily Cashbook**
- Select today's date
- **Expected**: All cash transactions listed, balance calculated

**TC-REP-005: Profit & Loss**
- Month of December
- **Expected**: Revenue, COGS, profit calculated correctly

---

### User Management

**Purpose**: Manage staff accounts and access

**User Roles**: OWNER only

#### Features

1. **Add User**
   - Click "Users" → "Add User"
   - Enter: Name, Phone, Email, Role (MANAGER or CASHIER)
   - Set initial password
   - **Restrictions**: 
     - Only OWNER can create users
     - Cannot create another OWNER

2. **View Users**
   - List of all users in the store
   - Shows: Name, Phone, Role, Status (Active/Inactive)

3. **Edit User**
   - Update name, phone, email
   - Change role (MANAGER ↔ CASHIER)
   - **Cannot**: Edit OWNER role

4. **Deactivate User**
   - Mark user as inactive
   - User cannot log in
   - **Use Case**: Staff left the job

5. **Activate User**
   - Reactivate previously deactivated user

6. **Reset Password**
   - OWNER can reset any user's password

#### Test Cases

**TC-USER-001: Add MANAGER**
- OWNER logs in
- Add new user with MANAGER role
- **Expected**: User created, can log in with MANAGER permissions

**TC-USER-002: Add CASHIER**
- OWNER logs in
- Add new user with CASHIER role
- **Expected**: User created, limited access

**TC-USER-003: MANAGER Cannot Add User**
- MANAGER logs in
- Navigate to Users
- **Expected**: No "Add User" button or access denied

**TC-USER-004: Deactivate User**
- OWNER deactivates a CASHIER
- CASHIER tries to log in
- **Expected**: Login fails with "Account inactive"

**TC-USER-005: Change Role**
- OWNER changes CASHIER to MANAGER
- User logs in again
- **Expected**: Now has MANAGER permissions

---

### Import/Export

**Purpose**: Bulk data operations

**User Roles**: OWNER only

#### Features

1. **Import Data**
   - **Customers**:
     - Upload CSV file
     - Columns: Name, Phone, Email, Credit Balance
     - Validates phone numbers (unique)
   - **Products**:
     - Upload CSV file
     - Columns: Name, Category, Brand, Unit, MRP, GST Rate
   - **Inventory**:
     - Upload CSV file
     - Columns: Product Name, Variant, Quantity, Low Stock Threshold
   - **Categories**:
     - Upload CSV file
     - Columns: Name, Description

2. **Export Data**
   - **Customers**: Export all customers to CSV
   - **Products**: Export product catalog to CSV
   - **Invoices**: Export invoice data (with date filter)
   - **Ledger**: Export customer/supplier ledger
   - **Inventory**: Export current stock levels

3. **Import Process**
   - Upload file
   - System validates data
   - Shows preview with errors (if any)
   - Confirm import
   - Records imported
   - Shows success/failure count

#### Test Cases

**TC-IMPORT-001: Import Customers**
- Upload CSV with 10 customers
- **Expected**: 10 customers added

**TC-IMPORT-002: Duplicate Phone in Import**
- Upload CSV with existing phone number
- **Expected**: Error shown, that row skipped

**TC-IMPORT-003: Invalid CSV Format**
- Upload file with missing columns
- **Expected**: Validation error, no data imported

**TC-EXPORT-001: Export Invoices**
- Select date range: Last month
- Click Export
- **Expected**: CSV file downloaded with all invoices

**TC-EXPORT-002: Export Products**
- Click Export Products
- **Expected**: All products in CSV with categories

---

## Multi-Tenancy

### How It Works

1. **Tenant Isolation**
   - Each store (tenant) is assigned a unique ID
   - All data (customers, products, invoices) linked to tenant ID
   - API requests include tenant ID in header

2. **Cross-Tenant Access**
   - User from Store A cannot access Store B's data
   - Login credentials tied to specific tenant
   - Reports show only current tenant's data

### Test Cases

**TC-TENANT-001: Data Isolation**
- Create customer in Tenant A
- Log in as Tenant B user
- **Expected**: Tenant A's customer not visible

**TC-TENANT-002: Login Restrictions**
- User account in Tenant A
- Try to log in and access Tenant B
- **Expected**: Access denied or wrong tenant error

---

## Test Scenarios

### End-to-End Scenarios

#### Scenario 1: New Store Setup
1. OWNER registers/logs in
2. Add 5 product categories
3. Add 20 products
4. Add 10 customers
5. Add 3 suppliers
6. Create first purchase from supplier
7. Create first invoice for customer
8. Record customer payment
9. Check inventory levels
10. View dashboard stats

#### Scenario 2: Daily Operations
1. CASHIER logs in
2. Create 10 invoices (mix of cash and credit)
3. Record 3 customer payments
4. MANAGER logs in
5. Add new product
6. Update inventory
7. Create purchase entry
8. OWNER views reports

#### Scenario 3: Month-End Process
1. OWNER logs in
2. Generate Sales Report (entire month)
3. Generate Outstanding Report
4. Export invoice data
5. View Profit & Loss report
6. Identify low stock items
7. Create purchase for low stock products

### Edge Cases

1. **Stock Exhaustion**
   - Product with 5 units in stock
   - Try to sell 6 units
   - **Expected**: Error or warning

2. **Negative Balance**
   - Customer overpays
   - **Expected**: Balance shows negative (advance)

3. **Concurrent Billing**
   - Two cashiers sell same product simultaneously
   - **Expected**: Stock decreases correctly, no overselling

4. **Date Range Reports**
   - Select invalid date range (end before start)
   - **Expected**: Validation error

5. **Large Data Import**
   - Import CSV with 1000 records
   - **Expected**: Processes successfully or shows progress

### Performance Testing

1. **Login Response Time**: < 2 seconds
2. **Invoice Generation**: < 3 seconds
3. **Product Search**: < 1 second
4. **Report Generation**: < 5 seconds (for 1 month data)
5. **Import 100 Records**: < 10 seconds

### Security Testing

1. **Unauthorized Access**
   - CASHIER tries to access Users page
   - **Expected**: Access denied

2. **Expired Token**
   - Use old/expired JWT token
   - **Expected**: Redirect to login

3. **SQL Injection**
   - Enter SQL code in search fields
   - **Expected**: Sanitized, no database error

4. **XSS Attack**
   - Enter `<script>` tags in input fields
   - **Expected**: Escaped, no script execution

---

## Common Issues & Solutions

### Login Issues
- **Problem**: Cannot log in
- **Check**: Correct phone/email format, password correct, account active
- **Solution**: Reset password or contact admin

### Invoice Not Generating
- **Problem**: Error when creating invoice
- **Check**: Products in cart, valid customer (if selected), stock available
- **Solution**: Clear cart and retry, check error message

### Stock Not Updating
- **Problem**: Inventory not changing after sale/purchase
- **Check**: Transaction saved successfully, inventory module working
- **Solution**: Manual stock adjustment or check system logs

### Report Shows No Data
- **Problem**: Report is empty
- **Check**: Correct date range, transactions exist in that period
- **Solution**: Expand date range or verify data exists

### User Cannot Access Feature
- **Problem**: Menu option missing or access denied
- **Check**: User role and permissions
- **Solution**: Contact OWNER to change role or grant permission

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Application deployed and accessible
- [ ] Test database with sample data
- [ ] Test credentials for all three roles
- [ ] Browser compatibility checked (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness verified

### Functional Testing
- [ ] User login/logout
- [ ] Billing flow (cash, credit, partial)
- [ ] Customer management (add, edit, view, ledger)
- [ ] Product management
- [ ] Purchase entry
- [ ] Supplier management
- [ ] Payment recording (customer and supplier)
- [ ] Inventory tracking
- [ ] All report types
- [ ] User management (OWNER only)
- [ ] Import/Export functionality

### Role-Based Testing
- [ ] OWNER can access all features
- [ ] MANAGER cannot access user management
- [ ] CASHIER can only access billing and payments
- [ ] Unauthorized access properly blocked

### Data Integrity
- [ ] Stock updates correctly after sale
- [ ] Stock increases after purchase
- [ ] Customer balance updates after payment
- [ ] Supplier payable updates correctly
- [ ] Invoice totals calculate correctly (including GST)
- [ ] Ledger balances match transactions

### UI/UX Testing
- [ ] Forms validate input correctly
- [ ] Error messages clear and helpful
- [ ] Success messages displayed
- [ ] Loading indicators shown
- [ ] Mobile responsive on all screens
- [ ] Touch-friendly on mobile devices
- [ ] Search functionality works
- [ ] Pagination works on lists

### Performance Testing
- [ ] Page load times acceptable
- [ ] Search responds quickly
- [ ] Reports generate in reasonable time
- [ ] Large data imports complete successfully
- [ ] Concurrent users don't cause issues

### Security Testing
- [ ] Cannot access without login
- [ ] Token expires after timeout
- [ ] Role restrictions enforced
- [ ] Tenant isolation maintained
- [ ] Input sanitization prevents injection

---

## Reporting Bugs

When reporting bugs, include:

1. **Bug ID**: Unique identifier
2. **Title**: Brief description
3. **Severity**: Critical, High, Medium, Low
4. **Steps to Reproduce**: Exact steps taken
5. **Expected Result**: What should happen
6. **Actual Result**: What actually happened
7. **Environment**: Browser, device, OS
8. **User Role**: OWNER/MANAGER/CASHIER
9. **Screenshots**: If applicable
10. **Console Errors**: Browser console errors (if any)

### Example Bug Report

```
Bug ID: BUG-001
Title: Invoice total incorrect when discount applied
Severity: High
User Role: CASHIER

Steps to Reproduce:
1. Log in as CASHIER
2. Go to Billing
3. Add product worth ₹1000
4. Apply 10% discount (₹100)
5. Observe total

Expected Result: Total should be ₹900
Actual Result: Total shows ₹1000 (discount not applied)

Environment: Chrome 120, Windows 11
Screenshot: [attached]
Console Error: "Cannot read property 'discount' of undefined"
```

---

## Glossary

- **Tenant**: A store/business instance in the system
- **Kirana**: Small grocery/retail shop (Indian term)
- **POS**: Point of Sale (billing system)
- **Ledger**: Record of financial transactions
- **Receivables**: Money owed by customers
- **Payables**: Money owed to suppliers
- **Credit Sale**: Sale where payment is due later
- **COGS**: Cost of Goods Sold
- **GST**: Goods and Services Tax (India)
- **UPI**: Unified Payments Interface (digital payment)
- **MRP**: Maximum Retail Price
- **SKU**: Stock Keeping Unit (product identifier)
- **Variant**: Different versions of a product (e.g., 500g, 1kg)

---

## Contact & Support

For questions or issues during testing:
- **Development Team**: [email/slack channel]
- **Issue Tracker**: [Jira/GitHub link]
- **Documentation**: This guide

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Application**: Kirana UI + Kirana Server  
**Audience**: QA Testers, Product Managers, Business Analysts
