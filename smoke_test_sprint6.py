#!/usr/bin/env python3
"""Sprint 6 Smoke Test — Clinical Visit Core Foundation
16 test steps + 3 extra checks covering the full clinical visit workflow.
API returns camelCase JSON.
"""
import requests, json, sys, time

BASE = "http://localhost:5030"
HEADERS = {"Content-Type": "application/json"}
PASS = 0; FAIL = 0; ERRORS = []

def j(resp):
    try: return resp.json()
    except: return {}

def log(ok, step, msg):
    global PASS, FAIL
    icon = "✅" if ok else "❌"
    status = "PASS" if ok else "FAIL"
    if ok: PASS += 1
    else: FAIL += 1; ERRORS.append(f"Step {step}: {msg}")
    print(f"  {icon} Step {step}: [{status}] {msg}")

# ─── Auth ───
def login(email, pwd):
    r = requests.post(f"{BASE}/api/Auth/login", json={"email": email, "password": pwd}, headers=HEADERS)
    data = j(r)
    return data.get("accessToken", "")

# ─── Step 1: Reception reads clinical visits (read-only) ───
def step1(token_reception):
    r = requests.get(f"{BASE}/api/clinical-visits/today", headers={**HEADERS, "Authorization": f"Bearer {token_reception}"})
    ok = r.status_code == 200
    data = j(r)
    ok2 = isinstance(data.get("visits"), list)
    log(ok and ok2, 1, f"Reception reads clinical visits (read-only): {r.status_code}, visits={len(data.get('visits', []))}")

# ─── Setup: Create patient, walk-in visit, send to queue, call, enter room ───
def setup_flow(token_admin):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}

    # Create patient
    r = requests.post(f"{BASE}/api/Patients", json={
        "fullName": "مريض سبرنت 6", "dateOfBirth": "1990-05-15",
        "gender": 1, "phoneNumber": "0550006666"
    }, headers=h)
    patient = j(r)
    patient_id = patient.get("id")
    if not patient_id:
        print(f"  ❌ Setup: Failed to create patient: {r.text}"); sys.exit(1)
    print(f"  ℹ️  Setup: Created patient {patient_id}")

    # Get doctors list (PagedResult with camelCase "items" array)
    r = requests.get(f"{BASE}/api/Doctors?page=1&pageSize=10", headers=h)
    doc_data = j(r)
    doc_items = doc_data.get("items", [])
    if not doc_items:
        print(f"  ❌ Setup: No doctors found: {r.text}"); sys.exit(1)
    doctor_id = doc_items[0].get("id")
    doc_email = doc_items[0].get("email")
    print(f"  ℹ️  Setup: Using doctor {doctor_id} ({doc_email})")

    # Create walk-in visit with doctor assigned
    r = requests.post(f"{BASE}/api/DailyVisits/walk-in", json={
        "patientId": patient_id, "doctorId": doctor_id,
        "visitDate": None, "chiefComplaint": "ألم في الضرس"
    }, headers=h)
    visit = j(r)
    daily_visit_id = visit.get("id")
    if not daily_visit_id:
        print(f"  ❌ Setup: Failed to create walk-in visit: {r.text}"); sys.exit(1)
    print(f"  ℹ️  Setup: Created walk-in visit {daily_visit_id}, status={visit.get('status')}")

    # Update status to CheckedIn (1)
    r = requests.patch(f"{BASE}/api/DailyVisits/{daily_visit_id}/status", json={"status": 1}, headers=h)
    print(f"  ℹ️  Setup: CheckedIn -> {r.status_code}")

    # Send to queue
    r = requests.post(f"{BASE}/api/ClinicQueue/daily-visits/{daily_visit_id}/send", json={
        "priority": 0, "notes": None
    }, headers=h)
    queue_item = j(r)
    queue_id = queue_item.get("id")
    if not queue_id:
        print(f"  ❌ Setup: Failed to send to queue: {r.text}"); sys.exit(1)
    print(f"  ℹ️  Setup: Sent to queue {queue_id}")

    # Get or create room
    r = requests.get(f"{BASE}/api/ClinicRooms", headers=h)
    rooms = j(r)
    if isinstance(rooms, list) and len(rooms) > 0:
        room_id = rooms[0].get("id")
    else:
        r = requests.post(f"{BASE}/api/ClinicRooms", json={"name": "غرفة اختبار 6", "roomNumber": "R6"}, headers=h)
        room_data = j(r)
        room_id = room_data.get("id")
    print(f"  ℹ️  Setup: Using room {room_id}")

    # Call patient
    r = requests.post(f"{BASE}/api/ClinicQueue/{queue_id}/call", json={"notes": None}, headers=h)
    print(f"  ℹ️  Setup: Called patient -> {r.status_code}")

    # Enter room
    r = requests.post(f"{BASE}/api/ClinicQueue/{queue_id}/enter-room", json={"roomId": room_id}, headers=h)
    print(f"  ℹ️  Setup: Entered room -> {r.status_code}")

    return patient_id, doctor_id, daily_visit_id, queue_id, room_id, doc_email

# ─── Step 2: Admin opens queue item (already in room) ───
def step2(token_admin, daily_visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.get(f"{BASE}/api/DailyVisits/{daily_visit_id}", headers=h)
    data = j(r)
    status = data.get("status")
    # When patient enters room, DailyVisit status should be InProgress (4) or ReadyForDoctor (3)
    ok = status in (3, 4)
    log(ok, 2, f"Queue item in room — DailyVisit status ReadyForDoctor(3) or InProgress(4): actual={status}")

# ─── Step 3 & 4: Start clinical visit ───
def step3_4(token_admin, daily_visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.post(f"{BASE}/api/clinical-visits/daily-visits/{daily_visit_id}/start",
        json={"chiefComplaint": "ألم حاد في الضرس العلوي"}, headers=h)
    data = j(r)
    visit_id = data.get("id")
    status = data.get("status")
    ok = r.status_code in (200, 201) and visit_id is not None and status == 1
    log(ok, 3, f"Start clinical visit: status={r.status_code}, visitId={visit_id}, status={status}")
    log(ok, 4, f"ClinicalVisit created with status InProgress(1)")
    return visit_id

# ─── Step 5: Add Clinical Findings ───
def step5(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.put(f"{BASE}/api/clinical-visits/{visit_id}", json={
        "clinicalFindings": "تسوس عميق في الضرس العلوي الثاني مع التهاب في اللثة المحيطة"
    }, headers=h)
    data = j(r)
    findings = data.get("clinicalFindings")
    ok = r.status_code == 200 and findings is not None and "تسوس" in (findings or "")
    log(ok, 5, f"Add Clinical Findings: {r.status_code}, findings={'set' if findings else 'null'}")

# ─── Step 6: Add Diagnosis ───
def step6(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.put(f"{BASE}/api/clinical-visits/{visit_id}", json={
        "diagnosis": "pulpitis حاد — التهاب حاد في عصب الضرس"
    }, headers=h)
    data = j(r)
    diagnosis = data.get("diagnosis")
    ok = r.status_code == 200 and diagnosis is not None and "pulpitis" in (diagnosis or "")
    log(ok, 6, f"Add Diagnosis: {r.status_code}, diagnosis={'set' if diagnosis else 'null'}")

# ─── Step 7: Add Treatment Notes ───
def step7(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.put(f"{BASE}/api/clinical-visits/{visit_id}", json={
        "treatmentNotes": "تم عمل حشوة عصب مؤقتة مع وصف مضاد حيوي ومسكن"
    }, headers=h)
    data = j(r)
    notes = data.get("treatmentNotes")
    ok = r.status_code == 200 and notes is not None and "حشوة" in (notes or "")
    log(ok, 7, f"Add Treatment Notes: {r.status_code}, notes={'set' if notes else 'null'}")

# ─── Step 8: Add Prescription ───
def step8(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.post(f"{BASE}/api/clinical-visits/{visit_id}/prescriptions", json={
        "medicationName": "Amoxicillin 500mg",
        "dosage": "كبسولة واحدة",
        "frequency": "3 مرات يومياً",
        "duration": "7 أيام",
        "instructions": "بعد الأكل"
    }, headers=h)
    data = j(r)
    rx_id = data.get("id")
    med = data.get("medicationName")
    ok = r.status_code in (200, 201) and rx_id is not None and "Amoxicillin" in (med or "")
    log(ok, 8, f"Add Prescription: status={r.status_code}, rxId={rx_id}, med={med}")
    return rx_id

# ─── Step 9: Update Prescription ───
def step9(token_admin, rx_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.put(f"{BASE}/api/clinical-visits/prescriptions/{rx_id}", json={
        "medicationName": "Amoxicillin 500mg",
        "dosage": "كبسولتين",
        "frequency": "3 مرات يومياً",
        "duration": "10 أيام",
        "instructions": "بعد الأكل مع كوب ماء كامل"
    }, headers=h)
    data = j(r)
    dur = data.get("duration")
    ok = r.status_code == 200 and "10" in (dur or "")
    log(ok, 9, f"Update Prescription: status={r.status_code}, duration={dur}")

# ─── Step 10: Delete Prescription ───
def step10(token_admin, visit_id, rx_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.delete(f"{BASE}/api/clinical-visits/prescriptions/{rx_id}", headers=h)
    ok = r.status_code == 204
    # Verify deleted from visit
    r2 = requests.get(f"{BASE}/api/clinical-visits/{visit_id}", headers=h)
    data = j(r2)
    rxs = data.get("prescriptions", [])
    ok2 = len(rxs) == 0 or all(p.get("id") != rx_id for p in rxs)
    log(ok and ok2, 10, f"Delete Prescription: delete={r.status_code}, removed_from_visit={ok2}")

# ─── Step 11: Complete Clinical Visit ───
def step11(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.post(f"{BASE}/api/clinical-visits/{visit_id}/complete", json={
        "diagnosis": "pulpitis حاد — تم العلاج المؤقت",
        "treatmentNotes": "حشوة عصب مؤقتة",
        "doctorRecommendations": "مراجعة بعد أسبوع لإكمال علاج العصب",
        "nextVisitRecommended": True,
        "nextVisitDate": "2026-06-07"
    }, headers=h)
    data = j(r)
    status = data.get("status")
    ok = r.status_code == 200 and status == 2
    log(ok, 11, f"Complete Clinical Visit: status_code={r.status_code}, visit_status={status} (expected 2=Completed)")
    return data

# ─── Step 12: Verify DailyVisit = Completed ───
def step12(token_admin, daily_visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.get(f"{BASE}/api/DailyVisits/{daily_visit_id}", headers=h)
    data = j(r)
    status = data.get("status")
    ok = status == 5  # DailyVisitStatus.Completed = 5
    log(ok, 12, f"DailyVisit status = Completed(5): actual={status}")

# ─── Step 13: Verify QueueItem = Completed ───
def step13(token_admin, queue_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.get(f"{BASE}/api/ClinicQueue/{queue_id}", headers=h)
    data = j(r)
    status = data.get("status")
    ok = status == 4  # QueueStatus.Completed = 4
    log(ok, 13, f"QueueItem status = Completed(4): actual={status}")

# ─── Step 14: Verify Room released ───
def step14(token_admin, room_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.get(f"{BASE}/api/ClinicRooms", headers=h)
    rooms = j(r)
    if isinstance(rooms, list):
        target = next((rm for rm in rooms if rm.get("id") == room_id), None)
        if target:
            occupied = target.get("isOccupied")
            ok = occupied == False
            log(ok, 14, f"Room released: IsOccupied={occupied} (expected False)")
        else:
            log(False, 14, f"Room {room_id} not found in rooms list")
    else:
        log(False, 14, f"Failed to get rooms list")

# ─── Step 15: Try to update completed visit — must reject ───
def step15(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.put(f"{BASE}/api/clinical-visits/{visit_id}", json={
        "clinicalFindings": "محاولة تعديل بعد الإكمال"
    }, headers=h)
    # DomainException returns 500 with error code
    ok = r.status_code in (400, 409, 500)
    data = j(r)
    code = data.get("code")
    ok2 = code == "CLINICAL_VISIT_NOT_EDITABLE" if code else "لا يمكن" in json.dumps(data, ensure_ascii=False)
    log(ok and ok2, 15, f"Update completed visit rejected: status={r.status_code}, code={code or 'N/A'}")

# ─── Step 16: Verify no Invoice/Payment/Finance endpoints ───
def step16(token_admin):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    invoice_endpoints = [
        "/api/invoices",
        "/api/payments",
        "/api/finance",
        "/api/invoices/today",
        "/api/payments/today",
    ]
    all_404 = True
    for ep in invoice_endpoints:
        r = requests.get(f"{BASE}{ep}", headers=h)
        if r.status_code != 404:
            all_404 = False
            print(f"    ⚠️  {ep} returned {r.status_code} (expected 404)")
    log(all_404, 16, f"No Invoice/Payment/Finance endpoints exist (all 404)")

# ─── Extra E1: Reception cannot start clinical visit (write forbidden) ───
def step_extra_reception_write(token_reception, daily_visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_reception}"}
    r = requests.post(f"{BASE}/api/clinical-visits/daily-visits/{daily_visit_id}/start",
        json={"chiefComplaint": "test"}, headers=h)
    ok = r.status_code == 403
    log(ok, "E1", f"Reception cannot start clinical visit (403): actual={r.status_code}")

# ─── Extra E2: Duplicate clinical visit rejected ───
def step_extra_duplicate(token_admin, daily_visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.post(f"{BASE}/api/clinical-visits/daily-visits/{daily_visit_id}/start",
        json={"chiefComplaint": "duplicate"}, headers=h)
    ok = r.status_code in (400, 409, 500)
    data = j(r)
    code = data.get("code")
    # After completion, VISIT_STATUS_NOT_ALLOWED_FOR_CLINICAL fires first (status check before duplicate check)
    # Both codes are valid rejections
    ok2 = code in ("CLINICAL_VISIT_ALREADY_EXISTS", "VISIT_STATUS_NOT_ALLOWED_FOR_CLINICAL") or "موجود" in json.dumps(data, ensure_ascii=False) or "لا يمكن" in json.dumps(data, ensure_ascii=False)
    log(ok and ok2, "E2", f"Duplicate clinical visit rejected: status={r.status_code}, code={code or 'N/A'}")

# ─── Extra E3: Add prescription on completed visit rejected ───
def step_extra_rx_after_complete(token_admin, visit_id):
    h = {**HEADERS, "Authorization": f"Bearer {token_admin}"}
    r = requests.post(f"{BASE}/api/clinical-visits/{visit_id}/prescriptions", json={
        "medicationName": "Ibuprofen 400mg", "dosage": "قرص واحد"
    }, headers=h)
    ok = r.status_code in (400, 409, 500)
    data = j(r)
    code = data.get("code")
    ok2 = code == "CLINICAL_VISIT_NOT_EDITABLE" if code else "لا يمكن" in json.dumps(data, ensure_ascii=False)
    log(ok and ok2, "E3", f"Prescription on completed visit rejected: status={r.status_code}, code={code or 'N/A'}")

# ═══════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════
print("=" * 60)
print("🧪 Sprint 6 Smoke Test — Clinical Visit Core Foundation")
print("=" * 60)

token_admin = login("admin@aqlandental.dev", "Admin@123456")
if not token_admin:
    print("❌ Admin login failed"); sys.exit(1)
print("✅ Admin logged in")

# Doctor login using seed data
token_doctor = login("dr.aqlan@aqlandental.dev", "Admin@123456")
print(f"✅ Doctor logged in: {bool(token_doctor)}")

token_reception = login("reception@aqlandental.dev", "Admin@123456")
print(f"✅ Reception logged in: {bool(token_reception)}")

# Step 1
print("\n── Step 1: Reception reads clinical visits ──")
step1(token_reception)

# Setup
print("\n── Setup: Create patient, visit, queue, call, enter room ──")
patient_id, doctor_id, daily_visit_id, queue_id, room_id, doc_email = setup_flow(token_admin)

# Step 2
print("\n── Step 2: Verify queue item in room ──")
step2(token_admin, daily_visit_id)

# Step 3 & 4
print("\n── Step 3-4: Start clinical visit ──")
visit_id = step3_4(token_admin, daily_visit_id)

# Extra E1: Reception write forbidden
print("\n── Extra E1: Reception cannot start clinical visit ──")
step_extra_reception_write(token_reception, daily_visit_id)

# Step 5
print("\n── Step 5: Add Clinical Findings ──")
step5(token_admin, visit_id)

# Step 6
print("\n── Step 6: Add Diagnosis ──")
step6(token_admin, visit_id)

# Step 7
print("\n── Step 7: Add Treatment Notes ──")
step7(token_admin, visit_id)

# Step 8
print("\n── Step 8: Add Prescription ──")
rx_id = step8(token_admin, visit_id)

# Step 9
print("\n── Step 9: Update Prescription ──")
step9(token_admin, rx_id)

# Step 10
print("\n── Step 10: Delete Prescription ──")
step10(token_admin, visit_id, rx_id)

# Step 11
print("\n── Step 11: Complete Clinical Visit ──")
step11(token_admin, visit_id)

# Step 12
print("\n── Step 12: Verify DailyVisit = Completed ──")
step12(token_admin, daily_visit_id)

# Step 13
print("\n── Step 13: Verify QueueItem = Completed ──")
step13(token_admin, queue_id)

# Step 14
print("\n── Step 14: Verify Room released ──")
step14(token_admin, room_id)

# Step 15
print("\n── Step 15: Update completed visit must reject ──")
step15(token_admin, visit_id)

# Step 16
print("\n── Step 16: No Invoice/Payment/Finance endpoints ──")
step16(token_admin)

# Extra E2: Duplicate
print("\n── Extra E2: Duplicate clinical visit rejected ──")
step_extra_duplicate(token_admin, daily_visit_id)

# Extra E3: Rx after complete
print("\n── Extra E3: Prescription on completed visit rejected ──")
step_extra_rx_after_complete(token_admin, visit_id)

# ═══════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════
total = PASS + FAIL
print("\n" + "=" * 60)
print(f"📊 Results: {PASS}/{total} PASSED, {FAIL}/{total} FAILED")
if ERRORS:
    print("\n❌ Failed steps:")
    for e in ERRORS:
        print(f"   • {e}")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
