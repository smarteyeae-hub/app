# Smart Eye Hub — Product Requirements Doc

Mobile app for **Smart Eye Technical Services** (RAK Free Zone, UAE) — CCTV, IT & network, home-automation, access-control installer.

## Goals
- Simple, dual-role (Manager / Employee) mobile field-service management
- Generate professional branded PDFs for Quotation, Invoice, Receipt Voucher, Service Report
- Track daily work allocation, expenses, purchases, inventory, and material requests
- UAE-compliant: **AED currency, 5% VAT**, TRN support

## Roles
| Capability | Manager | Employee |
|---|---|---|
| View revenue/expenses dashboard | ✅ | ❌ (own metrics only) |
| Create Quotation / Invoice / Receipt | ✅ | ❌ |
| Create Service Report | ✅ | ✅ |
| Manage Inventory / Customers / Purchases | ✅ | View only |
| Assign work | ✅ | ❌ |
| Log expenses (with bill upload) | ✅ | ✅ |
| Request materials | ✅ | ✅ |
| Approve material requests / expenses | ✅ | ❌ |

## Auto-numbering (per year)
- Quotation: `SE-QT-2026-001`
- Invoice: `SE-INV-2026-001`
- Receipt: `SE-RCV-2026-001`
- Service Report: `SE-SR-2026-001`

## Tech Stack
- Frontend: Expo Router (React Native), TypeScript, expo-linear-gradient, expo-document-picker, expo-file-system, expo-sharing
- Backend: FastAPI, Motor (async MongoDB), PyJWT, passlib[bcrypt], **reportlab** (PDF)
- Storage: Base64 files inline in MongoDB (bills for purchases/expenses)
- Auth: JWT (HS256, 7-day expiry), bcrypt password hashing

## Design
- Colors from Smart Eye logo: Navy `#1B3A5F`, Red `#C8102E`, dark accent `#122840`
- Home dashboard uses a **dual-tone navy → red gradient** header with subtle logo watermark
- Rounded 24px header bottoms, filter-chip rows, floating action buttons, 44pt+ touch targets

## Seeded Data (auto on startup)
- 1 Manager + 1 Employee (see `/app/memory/test_credentials.md`)
- 5 inventory items (Hikvision CCTV, NVR, Cat6, IP Phone, Access Point)
- 2 sample customers

## Not Implemented (future scope)
- OTP / 2FA login
- Client portal (external customer login)
- Native iOS/Android push notifications (requires Firebase setup + deployed build)
- Signature capture on Service Report PDFs (currently placeholder lines)
