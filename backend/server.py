"""Smart Eye Hub Backend - Field Service Management API"""
import os
import uuid
import base64
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Literal

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "smarteye-hub-dev-secret-do-not-use-in-prod")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24 * 7  # 7 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Smart Eye Hub")
api = APIRouter(prefix="/api")

# ---------------- Constants ----------------
COMPANY = {
    "name": "Smart Eye Technical Services",
    "name_ar": "سمارت آي تكنيكال سيرفسز ش.م.ح. ذ.م.م",
    "address": "VUEP2795, Al Hulaila, Compas Bldg., RAK, UAE",
    "phone1": "+971 50 473 5525",
    "phone2": "+971 50 472 4885",
    "email": "info@smarteye-uae.com",
    "website": "www.smarteye-uae.com",
    "tagline": "SMART SOLUTIONS  |  INTELLIGENT FUTURE",
    "location": "RAK Free Zone - UAE",
}

# ---------------- Utils ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def clean(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc

def hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return pwd_ctx.verify(pw, hashed)
    except Exception:
        return False

def make_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def current_user(cred: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_manager(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "manager":
        raise HTTPException(403, "Manager role required")
    return user

async def next_seq(kind: str) -> int:
    year = datetime.now(timezone.utc).year
    key = f"{kind}_{year}"
    res = await db.counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return res["seq"]

async def next_doc_number(prefix: str) -> str:
    year = datetime.now(timezone.utc).year
    seq = await next_seq(prefix)
    return f"SE-{prefix}-{year}-{seq:03d}"

# ---------------- Models ----------------
class LoginBody(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Literal["manager", "employee"]
    phone: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["manager", "employee"] = "employee"
    phone: Optional[str] = None

class Customer(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    trn: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)

class CustomerCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    trn: Optional[str] = ""

class InventoryItem(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    model_number: Optional[str] = ""
    unit: str = "pcs"
    quantity: float = 0
    unit_price: float = 0
    category: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)

class InventoryCreate(BaseModel):
    name: str
    model_number: Optional[str] = ""
    unit: Optional[str] = "pcs"
    quantity: Optional[float] = 0
    unit_price: Optional[float] = 0
    category: Optional[str] = ""
    notes: Optional[str] = ""

class LineItem(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "Lot"
    unit_price: float = 0

class DocBase(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_address: Optional[str] = ""
    customer_phone: Optional[str] = ""
    subject: Optional[str] = ""
    items: List[LineItem] = []
    vat_percent: float = 5.0
    discount: float = 0
    notes: Optional[str] = ""

class Quotation(DocBase):
    id: str = Field(default_factory=new_id)
    doc_number: str = ""
    valid_till: Optional[str] = None
    terms: Optional[str] = ""
    subtotal: float = 0
    vat_amount: float = 0
    total: float = 0
    status: str = "draft"
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)

class Invoice(DocBase):
    id: str = Field(default_factory=new_id)
    doc_number: str = ""
    due_date: Optional[str] = None
    subtotal: float = 0
    vat_amount: float = 0
    total: float = 0
    status: str = "unpaid"
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)

class Receipt(BaseModel):
    id: str = Field(default_factory=new_id)
    doc_number: str = ""
    customer_id: Optional[str] = None
    customer_name: str
    amount: float
    payment_method: str = "Cash"
    reference: Optional[str] = ""
    against_invoice: Optional[str] = ""
    notes: Optional[str] = ""
    received_by: Optional[str] = ""
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)

class ReceiptCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    amount: float
    payment_method: Optional[str] = "Cash"
    reference: Optional[str] = ""
    against_invoice: Optional[str] = ""
    notes: Optional[str] = ""
    received_by: Optional[str] = ""

class ServiceReportMaterial(BaseModel):
    item_name: str
    model_number: Optional[str] = ""
    serial_number: Optional[str] = ""
    quantity: float = 1

class ServiceReport(BaseModel):
    id: str = Field(default_factory=new_id)
    doc_number: str = ""
    customer_id: Optional[str] = None
    customer_name: str
    customer_address: Optional[str] = ""
    customer_phone: Optional[str] = ""
    technician_name: str = ""
    time_in: Optional[str] = ""
    time_out: Optional[str] = ""
    services: List[str] = []  # from: Installation, Maintenance, Warranty Service, Troubleshooting, Access Control, Networking, CCTV System, Cable Pulling, Testing & Commissioning, Intercom System, Gate Automation, Wifi/Access Point, Others
    scope_of_work: Optional[str] = ""
    materials: List[ServiceReportMaterial] = []
    technician_remark: Optional[str] = ""
    client_remark: Optional[str] = ""
    total_amount: float = 0
    advance: float = 0
    balance: float = 0
    amount_in_words: Optional[str] = ""
    work_id: Optional[str] = None
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)

class ServiceReportCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_address: Optional[str] = ""
    customer_phone: Optional[str] = ""
    technician_name: Optional[str] = ""
    time_in: Optional[str] = ""
    time_out: Optional[str] = ""
    services: Optional[List[str]] = []
    scope_of_work: Optional[str] = ""
    materials: Optional[List[ServiceReportMaterial]] = []
    technician_remark: Optional[str] = ""
    client_remark: Optional[str] = ""
    total_amount: Optional[float] = 0
    advance: Optional[float] = 0
    balance: Optional[float] = 0
    amount_in_words: Optional[str] = ""
    work_id: Optional[str] = None

class Purchase(BaseModel):
    id: str = Field(default_factory=new_id)
    supplier: str
    invoice_ref: Optional[str] = ""
    date: str = Field(default_factory=now_iso)
    amount: float
    notes: Optional[str] = ""
    bill_file: Optional[dict] = None  # {name, mime, data(base64)}
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)

class PurchaseCreate(BaseModel):
    supplier: str
    invoice_ref: Optional[str] = ""
    date: Optional[str] = None
    amount: float
    notes: Optional[str] = ""
    bill_file: Optional[dict] = None

class Expense(BaseModel):
    id: str = Field(default_factory=new_id)
    category: str
    description: str
    amount: float
    date: str = Field(default_factory=now_iso)
    bill_file: Optional[dict] = None
    created_by: str = ""
    created_by_name: str = ""
    status: str = "pending"  # pending, approved, rejected
    created_at: str = Field(default_factory=now_iso)

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    date: Optional[str] = None
    bill_file: Optional[dict] = None

class WorkAllocation(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    customer_id: Optional[str] = None
    customer_name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    description: Optional[str] = ""
    assigned_to: str  # employee id
    assigned_to_name: str = ""
    priority: str = "normal"  # low, normal, high
    status: str = "pending"  # pending, in_progress, completed, cancelled
    scheduled_date: Optional[str] = None
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class WorkAllocationCreate(BaseModel):
    title: str
    customer_id: Optional[str] = None
    customer_name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    description: Optional[str] = ""
    assigned_to: str
    priority: Optional[str] = "normal"
    scheduled_date: Optional[str] = None

class WorkStatusUpdate(BaseModel):
    status: str

class MaterialRequest(BaseModel):
    id: str = Field(default_factory=new_id)
    requested_by: str
    requested_by_name: str = ""
    item_name: str
    quantity: float = 1
    unit: Optional[str] = "pcs"
    reason: Optional[str] = ""
    work_id: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, fulfilled
    created_at: str = Field(default_factory=now_iso)

class MaterialRequestCreate(BaseModel):
    item_name: str
    quantity: float = 1
    unit: Optional[str] = "pcs"
    reason: Optional[str] = ""
    work_id: Optional[str] = None

class MaterialRequestStatusUpdate(BaseModel):
    status: str

# ---------------- Auth ----------------
@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_pw(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user)
    user.pop("password", None)
    user.pop("_id", None)
    return {"access_token": token, "token_type": "bearer", "user": user}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

@api.post("/auth/register", dependencies=[Depends(require_manager)])
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    doc = {
        "id": new_id(),
        "email": body.email.lower(),
        "password": hash_pw(body.password),
        "name": body.name,
        "role": body.role,
        "phone": body.phone or "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password", None)
    doc.pop("_id", None)
    return doc

@api.get("/users")
async def list_users(user: dict = Depends(current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(500)
    return users

@api.get("/users/employees")
async def list_employees(user: dict = Depends(current_user)):
    users = await db.users.find({"role": "employee"}, {"_id": 0, "password": 0}).to_list(500)
    return users

# ---------------- Customers ----------------
@api.get("/customers")
async def list_customers(user: dict = Depends(current_user)):
    return await db.customers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/customers")
async def create_customer(body: CustomerCreate, user: dict = Depends(current_user)):
    c = Customer(**body.dict()).dict()
    await db.customers.insert_one(c.copy())
    return clean(c)

@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(current_user)):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Not found")
    return c

@api.delete("/customers/{cid}", dependencies=[Depends(require_manager)])
async def delete_customer(cid: str):
    await db.customers.delete_one({"id": cid})
    return {"ok": True}

# ---------------- Inventory ----------------
@api.get("/inventory")
async def list_inventory(user: dict = Depends(current_user)):
    return await db.inventory.find({}, {"_id": 0}).sort("name", 1).to_list(1000)

@api.post("/inventory")
async def create_inventory(body: InventoryCreate, user: dict = Depends(current_user)):
    item = InventoryItem(**body.dict()).dict()
    await db.inventory.insert_one(item.copy())
    return clean(item)

@api.put("/inventory/{iid}")
async def update_inventory(iid: str, body: InventoryCreate, user: dict = Depends(current_user)):
    await db.inventory.update_one({"id": iid}, {"$set": body.dict()})
    return clean(await db.inventory.find_one({"id": iid}, {"_id": 0}))

@api.delete("/inventory/{iid}", dependencies=[Depends(require_manager)])
async def delete_inventory(iid: str):
    await db.inventory.delete_one({"id": iid})
    return {"ok": True}

# ---------------- Purchases ----------------
@api.get("/purchases")
async def list_purchases(user: dict = Depends(current_user)):
    # Exclude heavy bill_file data from list view
    return await db.purchases.find({}, {"_id": 0, "bill_file": 0}).sort("created_at", -1).to_list(1000)

@api.post("/purchases")
async def create_purchase(body: PurchaseCreate, user: dict = Depends(current_user)):
    data = {k: v for k, v in body.dict().items() if not (k == "date" and v is None)}
    p = Purchase(**data, created_by=user["id"]).dict()
    if not p.get("date"):
        p["date"] = now_iso()
    await db.purchases.insert_one(p.copy())
    return clean({k: v for k, v in p.items() if k != "bill_file"})

@api.get("/purchases/{pid}")
async def get_purchase(pid: str, user: dict = Depends(current_user)):
    p = await db.purchases.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p

# ---------------- Documents helpers ----------------
def calc_totals(items: List[dict], vat_percent: float, discount: float = 0) -> dict:
    subtotal = sum(float(i.get("quantity", 0)) * float(i.get("unit_price", 0)) for i in items)
    subtotal_after_disc = max(0.0, subtotal - float(discount or 0))
    vat_amount = round(subtotal_after_disc * (float(vat_percent) / 100.0), 2)
    total = round(subtotal_after_disc + vat_amount, 2)
    return {"subtotal": round(subtotal, 2), "vat_amount": vat_amount, "total": total}

# ---------------- Quotations ----------------
@api.get("/quotations")
async def list_quotations(user: dict = Depends(current_user)):
    return await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/quotations", dependencies=[Depends(require_manager)])
async def create_quotation(body: DocBase, user: dict = Depends(current_user)):
    items = [i.dict() for i in body.items]
    totals = calc_totals(items, body.vat_percent, body.discount)
    q = Quotation(
        **body.dict(),
        doc_number=await next_doc_number("QT"),
        created_by=user["id"],
        **totals,
    ).dict()
    await db.quotations.insert_one(q.copy())
    return clean(q)

@api.get("/quotations/{qid}")
async def get_quotation(qid: str, user: dict = Depends(current_user)):
    q = await db.quotations.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Not found")
    return q

@api.get("/quotations/{qid}/pdf")
async def quotation_pdf(qid: str, user: dict = Depends(current_user)):
    q = await db.quotations.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Not found")
    pdf_bytes = build_doc_pdf("QUOTATION", q)
    return {"filename": f"{q['doc_number']}.pdf", "data": base64.b64encode(pdf_bytes).decode()}

# ---------------- Invoices ----------------
@api.get("/invoices")
async def list_invoices(user: dict = Depends(current_user)):
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/invoices", dependencies=[Depends(require_manager)])
async def create_invoice(body: DocBase, user: dict = Depends(current_user)):
    items = [i.dict() for i in body.items]
    totals = calc_totals(items, body.vat_percent, body.discount)
    inv = Invoice(
        **body.dict(),
        doc_number=await next_doc_number("INV"),
        created_by=user["id"],
        **totals,
    ).dict()
    await db.invoices.insert_one(inv.copy())
    return clean(inv)

@api.get("/invoices/{iid}")
async def get_invoice(iid: str, user: dict = Depends(current_user)):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Not found")
    return inv

@api.get("/invoices/{iid}/pdf")
async def invoice_pdf(iid: str, user: dict = Depends(current_user)):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Not found")
    pdf_bytes = build_doc_pdf("TAX INVOICE", inv)
    return {"filename": f"{inv['doc_number']}.pdf", "data": base64.b64encode(pdf_bytes).decode()}

# ---------------- Receipts ----------------
@api.get("/receipts")
async def list_receipts(user: dict = Depends(current_user)):
    return await db.receipts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/receipts", dependencies=[Depends(require_manager)])
async def create_receipt(body: ReceiptCreate, user: dict = Depends(current_user)):
    r = Receipt(
        **body.dict(),
        doc_number=await next_doc_number("RCV"),
        created_by=user["id"],
    ).dict()
    await db.receipts.insert_one(r.copy())
    return clean(r)

@api.get("/receipts/{rid}")
async def get_receipt(rid: str, user: dict = Depends(current_user)):
    r = await db.receipts.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    return r

@api.get("/receipts/{rid}/pdf")
async def receipt_pdf(rid: str, user: dict = Depends(current_user)):
    r = await db.receipts.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    pdf_bytes = build_receipt_pdf(r)
    return {"filename": f"{r['doc_number']}.pdf", "data": base64.b64encode(pdf_bytes).decode()}

# ---------------- Service Reports ----------------
@api.get("/service-reports")
async def list_service_reports(user: dict = Depends(current_user)):
    q = {} if user["role"] == "manager" else {"$or": [{"created_by": user["id"]}, {"technician_name": user["name"]}]}
    return await db.service_reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/service-reports")
async def create_service_report(body: ServiceReportCreate, user: dict = Depends(current_user)):
    sr = ServiceReport(
        **body.dict(),
        doc_number=await next_doc_number("SR"),
        created_by=user["id"],
    ).dict()
    if not sr.get("technician_name"):
        sr["technician_name"] = user["name"]
    await db.service_reports.insert_one(sr.copy())
    if sr.get("work_id"):
        await db.works.update_one({"id": sr["work_id"]}, {"$set": {"status": "completed", "updated_at": now_iso()}})
    return clean(sr)

@api.get("/service-reports/{sid}")
async def get_service_report(sid: str, user: dict = Depends(current_user)):
    sr = await db.service_reports.find_one({"id": sid}, {"_id": 0})
    if not sr:
        raise HTTPException(404, "Not found")
    return sr

@api.get("/service-reports/{sid}/pdf")
async def service_report_pdf(sid: str, user: dict = Depends(current_user)):
    sr = await db.service_reports.find_one({"id": sid}, {"_id": 0})
    if not sr:
        raise HTTPException(404, "Not found")
    pdf_bytes = build_service_report_pdf(sr)
    return {"filename": f"{sr['doc_number']}.pdf", "data": base64.b64encode(pdf_bytes).decode()}

# ---------------- Work Allocation ----------------
@api.get("/works")
async def list_works(user: dict = Depends(current_user)):
    q = {} if user["role"] == "manager" else {"assigned_to": user["id"]}
    return await db.works.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/works", dependencies=[Depends(require_manager)])
async def create_work(body: WorkAllocationCreate, user: dict = Depends(current_user)):
    emp = await db.users.find_one({"id": body.assigned_to}, {"_id": 0, "password": 0})
    if not emp:
        raise HTTPException(400, "Invalid employee")
    w = WorkAllocation(
        **body.dict(),
        assigned_to_name=emp["name"],
        created_by=user["id"],
    ).dict()
    await db.works.insert_one(w.copy())
    return clean(w)

@api.get("/works/{wid}")
async def get_work(wid: str, user: dict = Depends(current_user)):
    w = await db.works.find_one({"id": wid}, {"_id": 0})
    if not w:
        raise HTTPException(404, "Not found")
    return w

@api.patch("/works/{wid}/status")
async def update_work_status(wid: str, body: WorkStatusUpdate, user: dict = Depends(current_user)):
    w = await db.works.find_one({"id": wid}, {"_id": 0})
    if not w:
        raise HTTPException(404, "Not found")
    if user["role"] != "manager" and w["assigned_to"] != user["id"]:
        raise HTTPException(403, "Not permitted")
    await db.works.update_one({"id": wid}, {"$set": {"status": body.status, "updated_at": now_iso()}})
    return clean(await db.works.find_one({"id": wid}, {"_id": 0}))

# ---------------- Expenses ----------------
@api.get("/expenses")
async def list_expenses(user: dict = Depends(current_user)):
    q = {} if user["role"] == "manager" else {"created_by": user["id"]}
    # exclude bill data from list
    return await db.expenses.find(q, {"_id": 0, "bill_file": 0}).sort("created_at", -1).to_list(1000)

@api.post("/expenses")
async def create_expense(body: ExpenseCreate, user: dict = Depends(current_user)):
    data = {k: v for k, v in body.dict().items() if not (k == "date" and v is None)}
    e = Expense(
        **data,
        created_by=user["id"],
        created_by_name=user["name"],
    ).dict()
    if not e.get("date"):
        e["date"] = now_iso()
    await db.expenses.insert_one(e.copy())
    resp = {k: v for k, v in e.items() if k != "bill_file"}
    return clean(resp)

@api.get("/expenses/{eid}")
async def get_expense(eid: str, user: dict = Depends(current_user)):
    e = await db.expenses.find_one({"id": eid}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Not found")
    return e

@api.patch("/expenses/{eid}/status", dependencies=[Depends(require_manager)])
async def update_expense_status(eid: str, body: WorkStatusUpdate):
    await db.expenses.update_one({"id": eid}, {"$set": {"status": body.status}})
    return clean(await db.expenses.find_one({"id": eid}, {"_id": 0, "bill_file": 0}))

# ---------------- Material Requests ----------------
@api.get("/material-requests")
async def list_mrs(user: dict = Depends(current_user)):
    q = {} if user["role"] == "manager" else {"requested_by": user["id"]}
    return await db.material_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/material-requests")
async def create_mr(body: MaterialRequestCreate, user: dict = Depends(current_user)):
    m = MaterialRequest(
        **body.dict(),
        requested_by=user["id"],
        requested_by_name=user["name"],
    ).dict()
    await db.material_requests.insert_one(m.copy())
    return clean(m)

@api.patch("/material-requests/{mid}/status", dependencies=[Depends(require_manager)])
async def update_mr_status(mid: str, body: MaterialRequestStatusUpdate):
    await db.material_requests.update_one({"id": mid}, {"$set": {"status": body.status}})
    return clean(await db.material_requests.find_one({"id": mid}, {"_id": 0}))

# ---------------- Dashboard ----------------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    if user["role"] == "manager":
        # Total revenue = paid invoices this month; also total invoiced
        invoices = await db.invoices.find({"created_at": {"$gte": month_start}}, {"_id": 0}).to_list(2000)
        expenses = await db.expenses.find({"created_at": {"$gte": month_start}}, {"_id": 0, "bill_file": 0}).to_list(2000)
        revenue = sum(float(i.get("total", 0)) for i in invoices)
        exp_total = sum(float(e.get("amount", 0)) for e in expenses)
        pending_works = await db.works.count_documents({"status": {"$in": ["pending", "in_progress"]}})
        pending_mrs = await db.material_requests.count_documents({"status": "pending"})
        return {
            "role": "manager",
            "revenue_month": round(revenue, 2),
            "expenses_month": round(exp_total, 2),
            "profit_month": round(revenue - exp_total, 2),
            "pending_works": pending_works,
            "pending_material_requests": pending_mrs,
            "invoices_count": len(invoices),
        }
    else:
        works = await db.works.find({"assigned_to": user["id"]}, {"_id": 0}).to_list(500)
        pending = [w for w in works if w["status"] in ("pending", "in_progress")]
        my_expenses = await db.expenses.find({"created_by": user["id"], "created_at": {"$gte": month_start}}, {"_id": 0, "bill_file": 0}).to_list(500)
        return {
            "role": "employee",
            "pending_works": len(pending),
            "completed_works": len([w for w in works if w["status"] == "completed"]),
            "expenses_month": round(sum(float(e.get("amount", 0)) for e in my_expenses), 2),
            "upcoming": pending[:5],
        }

# ---------------- Seed ----------------
async def seed():
    if await db.users.count_documents({}) == 0:
        await db.users.insert_many([
            {
                "id": new_id(),
                "email": "manager@smarteye-uae.com",
                "password": hash_pw("Manager@123"),
                "name": "Rasil Raj CM",
                "role": "manager",
                "phone": "+971504724885",
                "created_at": now_iso(),
            },
            {
                "id": new_id(),
                "email": "employee@smarteye-uae.com",
                "password": hash_pw("Employee@123"),
                "name": "Ahmed Technician",
                "role": "employee",
                "phone": "+971504735525",
                "created_at": now_iso(),
            },
        ])
    # seed a few inventory items
    if await db.inventory.count_documents({}) == 0:
        await db.inventory.insert_many([
            {**InventoryItem(name="Hikvision 2MP IP Camera", model_number="DS-2CD1023G0E-I", unit="pcs", quantity=10, unit_price=180, category="CCTV").dict()},
            {**InventoryItem(name="NVR 8 Channel", model_number="DS-7108NI-Q1/8P", unit="pcs", quantity=3, unit_price=650, category="CCTV").dict()},
            {**InventoryItem(name="Cat6 Cable Roll (305m)", model_number="CAT6-UTP", unit="roll", quantity=5, unit_price=280, category="Networking").dict()},
            {**InventoryItem(name="IP Phone Panasonic", model_number="KX-HDV130", unit="pcs", quantity=6, unit_price=320, category="IP Telephony").dict()},
            {**InventoryItem(name="Wireless Access Point", model_number="UAP-AC-LR", unit="pcs", quantity=4, unit_price=420, category="Networking").dict()},
        ])
    if await db.customers.count_documents({}) == 0:
        await db.customers.insert_many([
            {**Customer(name="M/s. Hadeqat Al Madina Supermarket", address="Abu Shagara, Sharjah - UAE", phone="+971545950098").dict()},
            {**Customer(name="M/s. Al Madina Supermarket", address="Al Nahda, Sharjah - UAE", phone="+971501234567").dict()},
        ])

@app.on_event("startup")
async def on_start():
    await seed()

@app.on_event("shutdown")
async def on_shut():
    client.close()

# ---------------- PDF Builders ----------------
BRAND_NAVY = colors.HexColor("#1B3A5F")
BRAND_RED = colors.HexColor("#C8102E")
GREY_LIGHT = colors.HexColor("#F3F4F6")
GREY = colors.HexColor("#E5E7EB")
TEXT = colors.HexColor("#111827")

def _styles():
    ss = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=ss["Heading1"], fontSize=18, textColor=BRAND_NAVY, spaceAfter=6, alignment=1, fontName="Helvetica-Bold"),
        "h2": ParagraphStyle("h2", parent=ss["Heading2"], fontSize=12, textColor=BRAND_NAVY, spaceAfter=4, fontName="Helvetica-Bold"),
        "small": ParagraphStyle("small", parent=ss["BodyText"], fontSize=8, textColor=TEXT),
        "body": ParagraphStyle("body", parent=ss["BodyText"], fontSize=9, textColor=TEXT),
        "bodyB": ParagraphStyle("bodyB", parent=ss["BodyText"], fontSize=9, textColor=TEXT, fontName="Helvetica-Bold"),
        "brand": ParagraphStyle("brand", parent=ss["Heading1"], fontSize=22, textColor=BRAND_NAVY, fontName="Helvetica-Bold"),
        "brandRed": ParagraphStyle("brandRed", parent=ss["Heading1"], fontSize=22, textColor=BRAND_RED, fontName="Helvetica-Bold"),
        "footer": ParagraphStyle("footer", parent=ss["BodyText"], fontSize=7, textColor=colors.white, alignment=1),
    }

def _header(styles):
    # Company header block
    brand_para = Paragraph('<font color="#1B3A5F">Smart</font> <font color="#C8102E">Eye</font>', styles["brand"])
    company_ar = Paragraph("سمارت آي تكنيكال سيرفسز ش.م.ح - ذ.م.م", styles["body"])
    company_en = Paragraph("<b>SMART EYE TECHNICAL SERVICES</b>", styles["body"])
    header_tbl = Table(
        [[brand_para, company_ar], [company_en, ""]],
        colWidths=[95 * mm, 95 * mm],
    )
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return header_tbl

def _footer_flow(styles):
    services = [
        "Home Automation",
        "Security & Surveillance",
        "IT & Network Solutions",
        "Access & Intercom Sys",
        "Audio Visual & Smart System",
    ]
    tbl = Table([services], colWidths=[38 * mm] * 5)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    contact_row = Table(
        [[
            Paragraph(f'<font color="white">☎ {COMPANY["phone1"]}   ✉ {COMPANY["email"]}</font>', styles["footer"]),
            Paragraph(f'<font color="white">☎ {COMPANY["phone2"]}   📍 {COMPANY["location"]}   🌐 {COMPANY["website"]}</font>', styles["footer"]),
        ]],
        colWidths=[95 * mm, 95 * mm],
    )
    contact_row.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [tbl, contact_row]

def _make_doc(buf):
    return SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=12 * mm, rightMargin=12 * mm,
        topMargin=12 * mm, bottomMargin=12 * mm,
    )

def build_doc_pdf(title: str, d: dict) -> bytes:
    """Quotation or Invoice"""
    styles = _styles()
    buf = io.BytesIO()
    doc = _make_doc(buf)
    story = []
    story.append(_header(styles))
    story.append(Spacer(1, 4))
    story.append(Table([[""]], colWidths=[190 * mm], style=[("LINEBELOW", (0, 0), (-1, -1), 1.5, BRAND_NAVY)]))
    story.append(Spacer(1, 6))

    # Title
    story.append(Paragraph(f"<b>{title}</b>", styles["h1"]))
    story.append(Spacer(1, 4))

    # Meta block
    is_invoice = "INVOICE" in title
    date_label = "Date"
    ref_label = "Invoice No" if is_invoice else "Quotation No"
    extra_label = "Due Date" if is_invoice else "Valid Till"
    extra_val = d.get("due_date") if is_invoice else d.get("valid_till")
    meta = [
        [Paragraph("<b>Bill To</b>", styles["bodyB"]), "", Paragraph(f"<b>{ref_label}:</b> {d.get('doc_number','')}", styles["body"])],
        [Paragraph(d.get("customer_name", ""), styles["body"]), "", Paragraph(f"<b>{date_label}:</b> {(d.get('created_at') or '')[:10]}", styles["body"])],
        [Paragraph(d.get("customer_address", "") or "", styles["small"]), "", Paragraph(f"<b>{extra_label}:</b> {(extra_val or '-')[:10]}", styles["body"])],
        [Paragraph((d.get("customer_phone", "") or ""), styles["small"]), "", ""],
    ]
    meta_tbl = Table(meta, colWidths=[95 * mm, 10 * mm, 85 * mm])
    meta_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 6))

    if d.get("subject"):
        story.append(Paragraph(f"<b>Subject:</b> {d.get('subject')}", styles["body"]))
        story.append(Spacer(1, 6))

    # Items table
    items = d.get("items", [])
    header_row = ["#", "Description", "Qty", "Unit", "Unit Price (AED)", "Amount (AED)"]
    rows = [header_row]
    for i, it in enumerate(items, 1):
        qty = float(it.get("quantity", 0))
        up = float(it.get("unit_price", 0))
        rows.append([
            str(i),
            Paragraph(it.get("description", ""), styles["body"]),
            f"{qty:g}",
            it.get("unit", ""),
            f"{up:,.2f}",
            f"{qty * up:,.2f}",
        ])
    items_tbl = Table(rows, colWidths=[10 * mm, 80 * mm, 15 * mm, 20 * mm, 32 * mm, 33 * mm], repeatRows=1)
    items_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, GREY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(items_tbl)
    story.append(Spacer(1, 8))

    # Totals
    sub = float(d.get("subtotal", 0))
    disc = float(d.get("discount", 0) or 0)
    vat = float(d.get("vat_amount", 0))
    total = float(d.get("total", 0))
    tot_rows = [
        ["Subtotal", f"AED {sub:,.2f}"],
    ]
    if disc:
        tot_rows.append(["Discount", f"AED -{disc:,.2f}"])
    tot_rows.append([f"VAT ({d.get('vat_percent', 5)}%)", f"AED {vat:,.2f}"])
    tot_rows.append(["Total", f"AED {total:,.2f}"])
    tot_tbl = Table(tot_rows, colWidths=[40 * mm, 40 * mm], hAlign="RIGHT")
    tot_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND_NAVY),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tot_tbl)
    story.append(Spacer(1, 10))

    if d.get("notes"):
        story.append(Paragraph("<b>Notes:</b>", styles["bodyB"]))
        story.append(Paragraph(d["notes"].replace("\n", "<br/>"), styles["body"]))
        story.append(Spacer(1, 8))

    if not is_invoice:
        terms = d.get("terms") or "This quotation is valid for 30 days from the date of issue."
        story.append(Paragraph("<b>Terms & Conditions:</b>", styles["bodyB"]))
        story.append(Paragraph(terms.replace("\n", "<br/>"), styles["small"]))

    story.append(Spacer(1, 16))
    story.append(Paragraph("Authorised Signatory", styles["bodyB"]))
    story.append(Paragraph("Smart Eye Technical Services", styles["small"]))

    story.append(Spacer(1, 12))
    for f in _footer_flow(styles):
        story.append(f)

    doc.build(story)
    return buf.getvalue()

def build_receipt_pdf(r: dict) -> bytes:
    styles = _styles()
    buf = io.BytesIO()
    doc = _make_doc(buf)
    story = []
    story.append(_header(styles))
    story.append(Spacer(1, 4))
    story.append(Table([[""]], colWidths=[190 * mm], style=[("LINEBELOW", (0, 0), (-1, -1), 1.5, BRAND_NAVY)]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>RECEIPT VOUCHER</b>", styles["h1"]))
    story.append(Spacer(1, 8))

    meta = [
        [Paragraph(f"<b>Receipt No:</b> {r.get('doc_number','')}", styles["body"]),
         Paragraph(f"<b>Date:</b> {(r.get('created_at') or '')[:10]}", styles["body"])],
        [Paragraph(f"<b>Received From:</b> {r.get('customer_name','')}", styles["body"]), ""],
        [Paragraph(f"<b>Payment Method:</b> {r.get('payment_method','')}", styles["body"]),
         Paragraph(f"<b>Reference:</b> {r.get('reference','') or '-'}", styles["body"])],
    ]
    if r.get("against_invoice"):
        meta.append([Paragraph(f"<b>Against Invoice:</b> {r.get('against_invoice')}", styles["body"]), ""])
    tbl = Table(meta, colWidths=[95 * mm, 95 * mm])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story.append(tbl)
    story.append(Spacer(1, 14))

    amount_tbl = Table(
        [[Paragraph("<b>Amount Received</b>", styles["bodyB"]), Paragraph(f"<b>AED {float(r.get('amount', 0)):,.2f}</b>", styles["bodyB"])]],
        colWidths=[95 * mm, 95 * mm],
    )
    amount_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(amount_tbl)
    story.append(Spacer(1, 14))

    if r.get("notes"):
        story.append(Paragraph("<b>Notes:</b>", styles["bodyB"]))
        story.append(Paragraph(r["notes"].replace("\n", "<br/>"), styles["body"]))
        story.append(Spacer(1, 20))

    sig = Table(
        [[Paragraph("<b>Received By</b>", styles["bodyB"]), Paragraph("<b>Customer Signature</b>", styles["bodyB"])],
         [Paragraph(r.get("received_by") or "____________________", styles["body"]), Paragraph("____________________", styles["body"])]],
        colWidths=[95 * mm, 95 * mm],
    )
    sig.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 12)]))
    story.append(sig)

    story.append(Spacer(1, 20))
    for f in _footer_flow(styles):
        story.append(f)

    doc.build(story)
    return buf.getvalue()

def build_service_report_pdf(sr: dict) -> bytes:
    styles = _styles()
    buf = io.BytesIO()
    doc = _make_doc(buf)
    story = []
    story.append(_header(styles))
    story.append(Spacer(1, 4))
    story.append(Table([[""]], colWidths=[190 * mm], style=[("LINEBELOW", (0, 0), (-1, -1), 1.5, BRAND_NAVY)]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>SERVICE REPORT</b>", styles["h1"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Sl. No:</b> {sr.get('doc_number','')}    <b>Date:</b> {(sr.get('created_at') or '')[:10]}", styles["body"]))
    story.append(Spacer(1, 6))

    # Customer + Technician block
    all_services = [
        "Installation", "Maintenance", "Warranty Service", "Troubleshooting",
        "Access Control", "Networking", "CCTV System", "Cable Pulling",
        "Testing & Commissioning", "Intercom System", "Gate Automation",
        "Wifi/Access Point", "Others",
    ]
    selected = set(sr.get("services") or [])
    def chk(name):
        return f"[{'x' if name in selected else ' '}] {name}"
    service_rows = []
    pairs = [all_services[i:i+2] for i in range(0, len(all_services), 2)]
    for pair in pairs:
        row = [chk(pair[0])]
        row.append(chk(pair[1]) if len(pair) > 1 else "")
        service_rows.append(row)

    left = [
        [Paragraph("<b>Customer Details</b>", styles["bodyB"])],
        [Paragraph(f"<b>Name:</b> {sr.get('customer_name','')}", styles["body"])],
        [Paragraph(f"<b>Address:</b> {sr.get('customer_address','') or '-'}", styles["body"])],
        [Paragraph(f"<b>Tel:</b> {sr.get('customer_phone','') or '-'}", styles["body"])],
        [Paragraph(f"<b>Scope of Work:</b> {sr.get('scope_of_work','') or '-'}", styles["body"])],
    ]
    right_top = Table(
        [[Paragraph(f"<b>Technician:</b> {sr.get('technician_name','')}", styles["body"])],
         [Paragraph(f"<b>Time In:</b> {sr.get('time_in','') or '-'}   <b>Time Out:</b> {sr.get('time_out','') or '-'}", styles["body"])]],
    )
    right_top.setStyle(TableStyle([("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    services_tbl = Table(service_rows, colWidths=[45 * mm, 45 * mm])
    services_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    right = [[right_top], [Paragraph("<b>Type of Services</b>", styles["bodyB"])], [services_tbl]]

    left_tbl = Table(left, colWidths=[90 * mm])
    right_tbl = Table(right, colWidths=[95 * mm])
    top_row = Table([[left_tbl, right_tbl]], colWidths=[92 * mm, 98 * mm])
    top_row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, GREY),
    ]))
    story.append(top_row)
    story.append(Spacer(1, 8))

    # Materials
    story.append(Paragraph("<b>Materials Used</b>", styles["h2"]))
    mat_rows = [["Sl #", "Item Name", "Model Number", "Serial Number", "Qty"]]
    mats = sr.get("materials") or []
    for idx, m in enumerate(mats, 1):
        mat_rows.append([str(idx), m.get("item_name", ""), m.get("model_number", "") or "", m.get("serial_number", "") or "", str(m.get("quantity", ""))])
    # pad up to 10
    while len(mat_rows) < 11:
        mat_rows.append([str(len(mat_rows)), "", "", "", ""])
    mat_tbl = Table(mat_rows, colWidths=[12 * mm, 65 * mm, 45 * mm, 45 * mm, 23 * mm])
    mat_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (4, 0), (4, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(mat_tbl)
    story.append(Spacer(1, 8))

    # Remarks
    rem = Table(
        [[Paragraph("<b>Technician Remark</b>", styles["bodyB"]), Paragraph("<b>Client Remark</b>", styles["bodyB"])],
         [Paragraph(sr.get("technician_remark", "") or "", styles["body"]), Paragraph(sr.get("client_remark", "") or "", styles["body"])]],
        colWidths=[95 * mm, 95 * mm],
    )
    rem.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("BACKGROUND", (0, 0), (-1, 0), GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 30),
    ]))
    story.append(rem)
    story.append(Spacer(1, 8))

    # Amount block
    total = float(sr.get("total_amount", 0))
    adv = float(sr.get("advance", 0))
    bal = float(sr.get("balance", total - adv))
    amt = Table(
        [
            [Paragraph("<b>Total Amount:</b>", styles["bodyB"]), Paragraph(f"AED {total:,.2f}", styles["body"]),
             Paragraph("<b>Advance:</b>", styles["bodyB"]), Paragraph(f"AED {adv:,.2f}", styles["body"])],
            ["", "",
             Paragraph("<b>Balance:</b>", styles["bodyB"]), Paragraph(f"AED {bal:,.2f}", styles["body"])],
        ],
        colWidths=[40 * mm, 55 * mm, 30 * mm, 65 * mm],
    )
    amt.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.3, GREY),
        ("BACKGROUND", (0, 0), (0, -1), BRAND_NAVY),
        ("BACKGROUND", (2, 0), (2, -1), BRAND_NAVY),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.white),
        ("SPAN", (0, 0), (0, 1)),
        ("SPAN", (1, 0), (1, 1)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(amt)
    story.append(Spacer(1, 6))
    if sr.get("amount_in_words"):
        story.append(Paragraph(f"<b>Amount in Words:</b> {sr.get('amount_in_words')}", styles["body"]))
    story.append(Spacer(1, 16))

    sig = Table(
        [[Paragraph("<b>Technician Signature</b>", styles["bodyB"]), Paragraph("<b>Client Signature</b>", styles["bodyB"])],
         [Paragraph("_______________________", styles["body"]), Paragraph("_______________________", styles["body"])]],
        colWidths=[95 * mm, 95 * mm],
    )
    sig.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 8)]))
    story.append(sig)

    story.append(Spacer(1, 12))
    for f in _footer_flow(styles):
        story.append(f)

    doc.build(story)
    return buf.getvalue()

# ---------------- Wire up ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
