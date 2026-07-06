"""Iteration 3: new features - notifications, conversions, user management, expense remarks, letterhead PDFs, owner role."""
import os
import re
import base64
import uuid
import time
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://field-ops-hub-39.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

MANAGER = {"email": "manager@smarteye-uae.com", "password": "Manager@123"}
EMPLOYEE = {"email": "employee@smarteye-uae.com", "password": "Employee@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="session")
def mgr_token():
    return _login(MANAGER)


@pytest.fixture(scope="session")
def emp_token():
    return _login(EMPLOYEE)


# ============ Notifications ============
class TestNotifications:
    def test_list_manager(self, mgr_token):
        r = requests.get(f"{API}/notifications", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_employee(self, emp_token):
        r = requests.get(f"{API}/notifications", headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_unread_count_shape(self, mgr_token):
        r = requests.get(f"{API}/notifications/unread-count", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "count" in j and isinstance(j["count"], int)

    def test_creating_doc_increases_mgr_unread(self, mgr_token, emp_token):
        before = requests.get(f"{API}/notifications/unread-count", headers=hdr(mgr_token), timeout=30).json()["count"]
        # employee creates expense (should notify managers)
        r = requests.post(f"{API}/expenses",
                          json={"category": "Travel", "description": "TEST_notif_inc", "amount": 10},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        after = requests.get(f"{API}/notifications/unread-count", headers=hdr(mgr_token), timeout=30).json()["count"]
        assert after > before, f"expected mgr unread count to grow (before={before}, after={after})"

    def test_mark_single_read(self, mgr_token):
        lst = requests.get(f"{API}/notifications", headers=hdr(mgr_token), timeout=30).json()
        unread = [n for n in lst if not n.get("read")]
        if not unread:
            pytest.skip("no unread notifications")
        nid = unread[0]["id"]
        r = requests.patch(f"{API}/notifications/{nid}/read", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        lst2 = requests.get(f"{API}/notifications", headers=hdr(mgr_token), timeout=30).json()
        after = next((n for n in lst2 if n["id"] == nid), None)
        assert after and after["read"] is True

    def test_mark_all_read(self, mgr_token):
        r = requests.post(f"{API}/notifications/read-all", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        c = requests.get(f"{API}/notifications/unread-count", headers=hdr(mgr_token), timeout=30).json()["count"]
        assert c == 0

    def test_delete_notification(self, mgr_token, emp_token):
        # ensure at least one exists
        requests.post(f"{API}/expenses",
                      json={"category": "Travel", "description": "TEST_notif_del", "amount": 5},
                      headers=hdr(emp_token), timeout=30)
        lst = requests.get(f"{API}/notifications", headers=hdr(mgr_token), timeout=30).json()
        assert lst
        nid = lst[0]["id"]
        r = requests.delete(f"{API}/notifications/{nid}", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        lst2 = requests.get(f"{API}/notifications", headers=hdr(mgr_token), timeout=30).json()
        assert all(n["id"] != nid for n in lst2)


# ============ Quotation -> Invoice -> Receipt conversion ============
class TestConversion:
    def test_full_conversion_flow(self, mgr_token):
        payload = {
            "customer_name": "TEST_Conv_Cust",
            "subject": "TEST_conv",
            "items": [
                {"description": "A", "quantity": 2, "unit_price": 100},
                {"description": "B", "quantity": 1, "unit_price": 50},
            ],
            "vat_percent": 5.0,
        }
        r = requests.post(f"{API}/quotations", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        q = r.json()
        assert q["total"] == 262.5
        pytest.conv_qid = q["id"]
        pytest.conv_qno = q["doc_number"]

        # convert
        r2 = requests.post(f"{API}/quotations/{q['id']}/convert-to-invoice",
                           headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200, r2.text
        inv = r2.json()
        assert inv["source_quotation_id"] == q["id"]
        assert inv["source_quotation_number"] == q["doc_number"]
        assert inv["customer_name"] == q["customer_name"]
        assert inv["subtotal"] == q["subtotal"]
        assert inv["vat_amount"] == q["vat_amount"]
        assert inv["total"] == q["total"]
        assert re.match(r"^SE-INV-2026-\d{3}$", inv["doc_number"])
        pytest.conv_iid = inv["id"]
        pytest.conv_ino = inv["doc_number"]

        # quotation status is now invoiced
        q2 = requests.get(f"{API}/quotations/{q['id']}", headers=hdr(mgr_token), timeout=30).json()
        assert q2["status"] == "invoiced"

        # invoice -> receipt
        r3 = requests.post(f"{API}/invoices/{inv['id']}/convert-to-receipt",
                           headers=hdr(mgr_token), timeout=30)
        assert r3.status_code == 200, r3.text
        rec = r3.json()
        assert rec["source_invoice_id"] == inv["id"]
        assert rec["against_invoice"] == inv["doc_number"]
        assert rec["amount"] == inv["total"]
        assert rec["payment_method"] == "Cash"
        assert re.match(r"^SE-RCV-2026-\d{3}$", rec["doc_number"])

        # invoice now paid
        i2 = requests.get(f"{API}/invoices/{inv['id']}", headers=hdr(mgr_token), timeout=30).json()
        assert i2["status"] == "paid"

    def test_employee_cannot_convert(self, mgr_token, emp_token):
        # create fresh quotation
        r = requests.post(f"{API}/quotations",
                          json={"customer_name": "TEST_EmpConv", "items": [{"description": "x", "quantity": 1, "unit_price": 10}]},
                          headers=hdr(mgr_token), timeout=30)
        qid = r.json()["id"]
        r2 = requests.post(f"{API}/quotations/{qid}/convert-to-invoice",
                           headers=hdr(emp_token), timeout=30)
        assert r2.status_code == 403


# ============ User Management ============
class TestUserManagement:
    unique = str(uuid.uuid4())[:8]

    def test_register_and_notif(self, mgr_token):
        # mark all read first for clean baseline
        requests.post(f"{API}/notifications/read-all", headers=hdr(mgr_token), timeout=30)
        payload = {
            "email": f"TEST_new_{self.unique}@ex.com",
            "password": "Test@1234",
            "name": "TEST New User",
            "phone": "+971500000000",
            "role": "employee",
        }
        r = requests.post(f"{API}/auth/register", json=payload, headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["is_active"] is True
        assert u["role"] == "employee"
        pytest.new_uid = u["id"]
        pytest.new_email = payload["email"]
        pytest.new_pw = payload["password"]

        # welcome notification for new user
        new_tok = _login({"email": payload["email"], "password": payload["password"]})
        notes = requests.get(f"{API}/notifications", headers=hdr(new_tok), timeout=30).json()
        assert any("welcome" in (n.get("title", "") + n.get("body", "")).lower() for n in notes), \
            f"expected welcome notif in {notes}"

        # manager notif: acting manager is excluded (only OTHER managers get it).
        # Verify by creating a second owner-role user, then have the new employee
        # register call trigger a manager broadcast that this owner receives.
        owner_email = f"TEST_owner_notif_{uuid.uuid4().hex[:6]}@ex.com"
        owner_pw = "Owner@1234"
        r_own = requests.post(f"{API}/auth/register",
                              json={"email": owner_email, "password": owner_pw, "name": "TEST OwnerNotif", "role": "owner"},
                              headers=hdr(mgr_token), timeout=30)
        assert r_own.status_code == 200
        owner_id = r_own.json()["id"]
        try:
            # trigger another registration (manager is actor, so owner should receive notif)
            trig_email = f"TEST_trig_{uuid.uuid4().hex[:6]}@ex.com"
            r_trig = requests.post(f"{API}/auth/register",
                                   json={"email": trig_email, "password": "T@1234567", "name": "TEST trig", "role": "employee"},
                                   headers=hdr(mgr_token), timeout=30)
            trig_uid = r_trig.json()["id"]
            owner_tok = _login({"email": owner_email, "password": owner_pw})
            owner_notes = requests.get(f"{API}/notifications", headers=hdr(owner_tok), timeout=30).json()
            assert any(trig_email in (n.get("body", "") + n.get("title", ""))
                       or n.get("category") == "user"
                       for n in owner_notes), f"owner should have received user-created notif; got {[n.get('title') for n in owner_notes[:5]]}"
            requests.delete(f"{API}/users/{trig_uid}", headers=hdr(mgr_token), timeout=30)
        finally:
            requests.delete(f"{API}/users/{owner_id}", headers=hdr(mgr_token), timeout=30)

    def test_update_user(self, mgr_token):
        r = requests.put(f"{API}/users/{pytest.new_uid}",
                         json={"name": "TEST Updated", "phone": "+971509999999"},
                         headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST Updated"

    def test_toggle_active_notifies_user(self, mgr_token):
        # deactivate
        r = requests.patch(f"{API}/users/{pytest.new_uid}/active", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200
        # login blocked
        r2 = requests.post(f"{API}/auth/login",
                           json={"email": pytest.new_email, "password": pytest.new_pw}, timeout=30)
        assert r2.status_code == 403
        assert "deactivat" in r2.text.lower()

        # reactivate
        r3 = requests.patch(f"{API}/users/{pytest.new_uid}/active", headers=hdr(mgr_token), timeout=30)
        assert r3.status_code == 200
        r4 = requests.post(f"{API}/auth/login",
                           json={"email": pytest.new_email, "password": pytest.new_pw}, timeout=30)
        assert r4.status_code == 200
        # user should have received a notification about status change
        tok = r4.json()["access_token"]
        notes = requests.get(f"{API}/notifications", headers=hdr(tok), timeout=30).json()
        assert any("deactivat" in (n.get("title", "") + n.get("body", "")).lower()
                   or "reactivat" in (n.get("title", "") + n.get("body", "")).lower()
                   or "activat" in (n.get("title", "") + n.get("body", "")).lower()
                   for n in notes), f"expected activation notif, got {notes[:3]}"

    def test_delete_user(self, mgr_token):
        r = requests.delete(f"{API}/users/{pytest.new_uid}", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200

    def test_cannot_delete_self(self, mgr_token):
        me = requests.get(f"{API}/auth/me", headers=hdr(mgr_token), timeout=30).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 400

    def test_employee_cannot_register(self, emp_token):
        r = requests.post(f"{API}/auth/register",
                          json={"email": "TEST_x@x.com", "password": "P@ssw0rd", "name": "x", "role": "employee"},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 403


# ============ Expense review with remarks ============
class TestExpenseReview:
    def test_reject_with_remarks(self, mgr_token, emp_token):
        # employee create
        r = requests.post(f"{API}/expenses",
                          json={"category": "Meal", "description": "TEST_exp_reject", "amount": 20},
                          headers=hdr(emp_token), timeout=30)
        assert r.status_code == 200
        eid = r.json()["id"]

        # manager rejects
        r2 = requests.patch(f"{API}/expenses/{eid}/status",
                            json={"status": "rejected", "remarks": "Not budgeted"},
                            headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200, r2.text
        e = r2.json()
        assert e["status"] == "rejected"
        assert e.get("remarks") == "Not budgeted"
        assert e.get("reviewed_by_name")

        # employee notified with remark
        notes = requests.get(f"{API}/notifications", headers=hdr(emp_token), timeout=30).json()
        assert any("reject" in (n.get("title", "") + n.get("body", "")).lower()
                   and "Not budgeted" in (n.get("body", "") + n.get("title", ""))
                   for n in notes), f"expected reject notif with remark, got {[n.get('title') for n in notes[:5]]}"

    def test_approve_with_remarks(self, mgr_token, emp_token):
        r = requests.post(f"{API}/expenses",
                          json={"category": "Meal", "description": "TEST_exp_approve", "amount": 15},
                          headers=hdr(emp_token), timeout=30)
        eid = r.json()["id"]
        r2 = requests.patch(f"{API}/expenses/{eid}/status",
                            json={"status": "approved", "remarks": "OK"},
                            headers=hdr(mgr_token), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["status"] == "approved"
        notes = requests.get(f"{API}/notifications", headers=hdr(emp_token), timeout=30).json()
        assert any("approv" in (n.get("title", "") + n.get("body", "")).lower() for n in notes)


# ============ PDF with letterhead ============
class TestLetterheadPDFs:
    def _pdf_size(self, tok, path):
        r = requests.get(f"{API}{path}", headers=hdr(tok), timeout=60)
        assert r.status_code == 200, r.text
        b = base64.b64decode(r.json()["data"])
        assert b[:4] == b"%PDF"
        return len(b)

    def test_quotation_pdf_large(self, mgr_token):
        # need a quotation
        qid = getattr(pytest, "conv_qid", None)
        if not qid:
            q = requests.post(f"{API}/quotations",
                              json={"customer_name": "TEST_pdf", "items": [{"description": "x", "quantity": 1, "unit_price": 10}]},
                              headers=hdr(mgr_token), timeout=30).json()
            qid = q["id"]
        size = self._pdf_size(mgr_token, f"/quotations/{qid}/pdf")
        assert size > 400_000, f"quotation PDF too small ({size} bytes) - letterhead missing?"

    def test_invoice_pdf_large(self, mgr_token):
        iid = getattr(pytest, "conv_iid", None)
        if not iid:
            inv = requests.post(f"{API}/invoices",
                                json={"customer_name": "TEST_pdf", "items": [{"description": "x", "quantity": 1, "unit_price": 10}]},
                                headers=hdr(mgr_token), timeout=30).json()
            iid = inv["id"]
        size = self._pdf_size(mgr_token, f"/invoices/{iid}/pdf")
        assert size > 400_000, f"invoice PDF too small ({size})"

    def test_receipt_pdf_large(self, mgr_token):
        rec = requests.post(f"{API}/receipts",
                            json={"customer_name": "TEST_pdf", "amount": 100, "payment_method": "Cash"},
                            headers=hdr(mgr_token), timeout=30).json()
        size = self._pdf_size(mgr_token, f"/receipts/{rec['id']}/pdf")
        assert size > 400_000, f"receipt PDF too small ({size})"

    def test_service_report_pdf_large(self, mgr_token, emp_token):
        sr = requests.post(f"{API}/service-reports",
                           json={"customer_name": "TEST_pdf", "services": ["X"], "total_amount": 50},
                           headers=hdr(emp_token), timeout=30).json()
        size = self._pdf_size(mgr_token, f"/service-reports/{sr['id']}/pdf")
        assert size > 400_000, f"SR PDF too small ({size})"


# ============ Owner role ============
class TestOwnerRole:
    def test_owner_has_manager_privs(self, mgr_token):
        email = f"TEST_owner_{uuid.uuid4().hex[:6]}@ex.com"
        pw = "Owner@1234"
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": pw, "name": "TEST Owner", "role": "owner"},
                          headers=hdr(mgr_token), timeout=30)
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        try:
            tok = _login({"email": email, "password": pw})
            # can create quotation
            r1 = requests.post(f"{API}/quotations",
                               json={"customer_name": "TEST_owner_q", "items": [{"description": "a", "quantity": 1, "unit_price": 5}]},
                               headers=hdr(tok), timeout=30)
            assert r1.status_code == 200, r1.text
            # can approve expense
            emp_tok = _login(EMPLOYEE)
            e = requests.post(f"{API}/expenses",
                              json={"category": "Test", "description": "TEST_owner_appr", "amount": 5},
                              headers=hdr(emp_tok), timeout=30).json()
            r2 = requests.patch(f"{API}/expenses/{e['id']}/status",
                                json={"status": "approved", "remarks": "ok"},
                                headers=hdr(tok), timeout=30)
            assert r2.status_code == 200, r2.text
            # can create work
            emps = requests.get(f"{API}/users/employees", headers=hdr(tok), timeout=30).json()
            emp_id = next(x["id"] for x in emps if x["email"] == EMPLOYEE["email"])
            r3 = requests.post(f"{API}/works",
                               json={"title": "TEST_owner_work", "customer_name": "X", "assigned_to": emp_id},
                               headers=hdr(tok), timeout=30)
            assert r3.status_code == 200, r3.text
        finally:
            requests.delete(f"{API}/users/{uid}", headers=hdr(mgr_token), timeout=30)
