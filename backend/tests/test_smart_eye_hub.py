"""Smart Eye Hub - E2E backend tests"""
import os
import re
import base64
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://field-ops-hub-39.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

MANAGER = {"email": "manager@smarteye-uae.com", "password": "Manager@123"}
EMPLOYEE = {"email": "employee@smarteye-uae.com", "password": "Employee@123"}


@pytest.fixture(scope="session")
def mgr_token():
    r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def emp_token():
    r = requests.post(f"{API}/auth/login", json=EMPLOYEE, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Auth ----------
class TestAuth:
    def test_manager_login(self):
        r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j and j["user"]["role"] == "manager"
        assert j["user"]["name"] == "Rasil Raj CM"

    def test_employee_login(self):
        r = requests.post(f"{API}/auth/login", json=EMPLOYEE, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "employee"

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": MANAGER["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, mgr_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == MANAGER["email"]


# ---------- Customers ----------
class TestCustomers:
    def test_list_seeded(self, mgr_token):
        r = requests.get(f"{API}/customers", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 2

    def test_create(self, mgr_token):
        payload = {"name": "TEST_Customer ABC", "phone": "+971500000000", "address": "Dubai"}
        r = requests.post(f"{API}/customers", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        c = r.json()
        assert c["name"] == payload["name"] and "id" in c
        # verify persistence
        r2 = requests.get(f"{API}/customers/{c['id']}", headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200 and r2.json()["id"] == c["id"]


# ---------- Inventory ----------
class TestInventory:
    def test_list_seeded(self, mgr_token):
        r = requests.get(f"{API}/inventory", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_create(self, mgr_token):
        payload = {"name": "TEST_Item", "quantity": 2, "unit_price": 100}
        r = requests.post(f"{API}/inventory", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200 and r.json()["name"] == payload["name"]


# ---------- Employees + Works ----------
class TestWorks:
    def test_list_employees(self, mgr_token):
        r = requests.get(f"{API}/users/employees", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        emps = r.json()
        assert any(e["email"] == EMPLOYEE["email"] for e in emps)

    def test_work_lifecycle(self, mgr_token, emp_token):
        emps = requests.get(f"{API}/users/employees", headers=hdr(mgr_token), timeout=30).json()
        emp_id = next(e["id"] for e in emps if e["email"] == EMPLOYEE["email"])
        payload = {
            "title": "TEST_Install CCTV",
            "customer_name": "Test Customer",
            "assigned_to": emp_id,
            "priority": "high",
        }
        r = requests.post(f"{API}/works", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200, r.text
        w = r.json()
        assert w["status"] == "pending" and w["assigned_to_name"]
        wid = w["id"]
        # employee sees only own
        emp_list = requests.get(f"{API}/works", headers=hdr(emp_token), timeout=30).json()
        assert any(x["id"] == wid for x in emp_list)
        # employee updates status
        r2 = requests.patch(f"{API}/works/{wid}/status", json={"status": "in_progress"},
                            headers=hdr(emp_token), timeout=30)
        assert r2.status_code == 200 and r2.json()["status"] == "in_progress"
        r3 = requests.patch(f"{API}/works/{wid}/status", json={"status": "completed"},
                            headers=hdr(emp_token), timeout=30)
        assert r3.status_code == 200 and r3.json()["status"] == "completed"


# ---------- Quotations ----------
class TestQuotations:
    def test_create_quotation_calcs(self, mgr_token):
        payload = {
            "customer_name": "TEST_Quo Cust",
            "subject": "TEST subject",
            "items": [
                {"description": "Item A", "quantity": 2, "unit_price": 100},
                {"description": "Item B", "quantity": 1, "unit_price": 50},
            ],
            "vat_percent": 5.0,
        }
        r = requests.post(f"{API}/quotations", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200, r.text
        q = r.json()
        assert re.match(r"^SE-QT-2026-\d{3}$", q["doc_number"]), q["doc_number"]
        assert q["subtotal"] == 250.0
        assert q["vat_amount"] == 12.5
        assert q["total"] == 262.5
        pytest.qt_id = q["id"]
        pytest.qt_no = q["doc_number"]

    def test_employee_cannot_create_quotation(self, emp_token):
        r = requests.post(f"{API}/quotations",
                          json={"customer_name": "X", "items": []},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 403

    def test_quotation_pdf(self, mgr_token):
        r = requests.get(f"{API}/quotations/{pytest.qt_id}/pdf",
                         headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j["filename"].endswith(".pdf")
        pdf = base64.b64decode(j["data"])
        assert pdf[:4] == b"%PDF"

    def test_auto_number_increments(self, mgr_token):
        seqs = []
        for _ in range(3):
            r = requests.post(f"{API}/quotations",
                              json={"customer_name": "TEST_Seq", "items": []},
                              headers=hdr(mgr_token), timeout=30)
            assert r.status_code == 200
            seqs.append(int(r.json()["doc_number"].split("-")[-1]))
        assert seqs[1] == seqs[0] + 1 and seqs[2] == seqs[1] + 1


# ---------- Invoices ----------
class TestInvoices:
    def test_create_and_pdf(self, mgr_token):
        payload = {
            "customer_name": "TEST_Inv Cust",
            "items": [{"description": "X", "quantity": 3, "unit_price": 200}],
            "vat_percent": 5.0,
        }
        r = requests.post(f"{API}/invoices", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        inv = r.json()
        assert re.match(r"^SE-INV-2026-\d{3}$", inv["doc_number"])
        assert inv["subtotal"] == 600.0 and inv["vat_amount"] == 30.0 and inv["total"] == 630.0
        r2 = requests.get(f"{API}/invoices/{inv['id']}/pdf", headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200
        assert base64.b64decode(r2.json()["data"])[:4] == b"%PDF"


# ---------- Receipts ----------
class TestReceipts:
    def test_create_and_pdf(self, mgr_token):
        r = requests.post(f"{API}/receipts",
                          json={"customer_name": "TEST_Rec Cust", "amount": 500, "payment_method": "Cash"},
                          headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        rec = r.json()
        assert re.match(r"^SE-RCV-2026-\d{3}$", rec["doc_number"])
        r2 = requests.get(f"{API}/receipts/{rec['id']}/pdf", headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200
        assert base64.b64decode(r2.json()["data"])[:4] == b"%PDF"


# ---------- Service Reports ----------
class TestServiceReports:
    def test_employee_can_create(self, emp_token, mgr_token):
        payload = {
            "customer_name": "TEST_SR Cust",
            "services": ["CCTV System", "Maintenance"],
            "materials": [{"item_name": "Camera", "quantity": 2}],
            "total_amount": 500,
        }
        r = requests.post(f"{API}/service-reports", json=payload, headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200, r.text
        sr = r.json()
        assert re.match(r"^SE-SR-2026-\d{3}$", sr["doc_number"])
        r2 = requests.get(f"{API}/service-reports/{sr['id']}/pdf",
                          headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200
        assert base64.b64decode(r2.json()["data"])[:4] == b"%PDF"


# ---------- Purchases ----------
class TestPurchases:
    def test_create_and_detail(self, mgr_token):
        bill = {"name": "bill.pdf", "mime": "application/pdf",
                "data": base64.b64encode(b"%PDF-1.4 fake").decode()}
        r = requests.post(f"{API}/purchases",
                          json={"supplier": "TEST_Supplier", "amount": 100, "bill_file": bill},
                          headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        # list excludes bill_file
        lst = requests.get(f"{API}/purchases", headers=hdr(mgr_token), timeout=30).json()
        target = next(p for p in lst if p["id"] == pid)
        assert "bill_file" not in target or target.get("bill_file") is None
        # detail returns bill_file
        detail = requests.get(f"{API}/purchases/{pid}", headers=hdr(mgr_token), timeout=30).json()
        assert detail.get("bill_file") and detail["bill_file"]["name"] == "bill.pdf"


# ---------- Expenses ----------
class TestExpenses:
    def test_employee_create_and_scoping(self, emp_token, mgr_token):
        r = requests.post(f"{API}/expenses",
                          json={"category": "Travel", "description": "TEST_exp", "amount": 50},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        eid = r.json()["id"]
        # employee sees own
        emp_list = requests.get(f"{API}/expenses", headers=hdr(emp_token), timeout=30).json()
        assert any(e["id"] == eid for e in emp_list)
        # manager sees all
        mgr_list = requests.get(f"{API}/expenses", headers=hdr(mgr_token), timeout=30).json()
        assert any(e["id"] == eid for e in mgr_list)


# ---------- Material Requests ----------
class TestMaterialRequests:
    def test_create_and_status_update(self, emp_token, mgr_token):
        r = requests.post(f"{API}/material-requests",
                          json={"item_name": "TEST_MR Item", "quantity": 5},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        mid = r.json()["id"]
        r2 = requests.patch(f"{API}/material-requests/{mid}/status",
                            json={"status": "approved"},
                            headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200 and r2.json()["status"] == "approved"


# ---------- Dashboard ----------
class TestDashboard:
    def test_manager_summary(self, mgr_token):
        r = requests.get(f"{API}/dashboard/summary", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        j = r.json()
        for k in ("revenue_month", "expenses_month", "profit_month", "pending_works"):
            assert k in j

    def test_employee_summary(self, emp_token):
        r = requests.get(f"{API}/dashboard/summary", headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        j = r.json()
        for k in ("pending_works", "completed_works", "upcoming"):
            assert k in j
        assert isinstance(j["upcoming"], list)
