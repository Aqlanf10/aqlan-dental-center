import type { DbExecutor } from '../../platform/db.ts';
import { assertIsoDate } from '../../platform/clock.ts';
import { newEntityId } from '../../platform/crypto.ts';
import { failApp } from '../../platform/errors.ts';
import { currency, parseMoney } from '../../finance/money.ts';
import type { Currency } from '../../finance/types.ts';
import {
  assertModulePermission,
  getClinicSettings,
  recordAuditEvent,
  type AuthenticatedActor,
} from '../governance/index.ts';
import { assertPatientAccess, getPatientById } from '../patients/index.ts';

function addCalendarDays(isoDate: string, daysToAdd: number): string {
  const checked = assertIsoDate(isoDate);
  const ms = Date.parse(`${checked}T12:00:00Z`) + daysToAdd * 86400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface LabOrderView {
  readonly labOrderId: string;
  readonly orderNumber: number;
  readonly patientId: string;
  readonly patientDisplayLabel: string;
  readonly visitId: string | null;
  readonly doctorUserId: string;
  readonly doctorName: string;
  readonly labName: string;
  readonly workDescription: string;
  readonly shade: string;
  readonly orderedDate: string;
  readonly dueDate: string;
  readonly currency: Currency;
  readonly labCostMinor: string | null;
  readonly privacyModeApplied: 'CODE_ONLY' | 'FULL_NAME';
  readonly status: 'SENT' | 'RECEIVED' | 'DELIVERED' | 'CANCELLED';
}

export async function createLabOrder(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    visitId?: string | null;
    labName: string;
    workDescription: string;
    shade?: string;
    orderedDate: string;
    dueDate?: string;
    labCostDecimal?: string;
    currency?: Currency;
  },
  clinicToday: string,
): Promise<LabOrderView> {
  assertModulePermission(actor, 'lab', 'create');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  const orderedDate = assertIsoDate(input.orderedDate);
  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const dueDate =
    input.dueDate !== undefined && input.dueDate !== ''
      ? assertIsoDate(input.dueDate)
      : addCalendarDays(orderedDate, settings.lab.defaultTurnaroundDays);
  if (dueDate < orderedDate) {
    failApp('INVALID_INPUT', 400, 'Lab dueDate must be >= orderedDate');
  }

  const labName = typeof input.labName === 'string' ? input.labName.trim() : '';
  const workDescription = typeof input.workDescription === 'string' ? input.workDescription.trim() : '';
  if (!labName || !workDescription) {
    failApp('INVALID_INPUT', 400, 'labName and workDescription are required');
  }
  const shade = typeof input.shade === 'string' && input.shade.trim() ? input.shade.trim().slice(0, 24) : 'A2';

  const curr: Currency = input.currency ? currency(input.currency) : settings.finance.defaultCurrency;
  let costMinor = '0';
  if (input.labCostDecimal !== undefined && input.labCostDecimal.trim() !== '') {
    try {
      costMinor = parseMoney(input.labCostDecimal.trim(), curr).minor;
    } catch {
      failApp('INVALID_INPUT', 400, 'Invalid labCostDecimal');
    }
  }

  const patient = await getPatientById(tx, actor, input.patientId, clinicToday);
  const doctorUserId =
    actor.role === 'DOCTOR' ? actor.userId : (patient.primaryDoctorUserId ?? actor.userId);

  const seqRes = await tx.query<{ n: string }>(`SELECT nextval('aqlan_app.app_lab_order_no_seq')::text AS n`);
  const orderNumber = Number(seqRes.rows[0]?.n ?? '3001');
  const labOrderId = newEntityId('lab');

  await tx.query(
    `INSERT INTO app_lab_orders
       (lab_order_id, clinic_id, order_number, patient_id, visit_id, doctor_user_id,
        lab_name, work_description, shade, ordered_date, due_date, currency,
        lab_cost_minor, privacy_mode_applied, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13::bigint, $14, 'SENT', $15)`,
    [
      labOrderId,
      actor.clinicId,
      orderNumber,
      input.patientId,
      input.visitId ?? null,
      doctorUserId,
      labName,
      workDescription,
      shade,
      orderedDate,
      dueDate,
      curr,
      costMinor,
      settings.lab.externalPrivacyMode,
      actor.userId,
    ],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'LAB',
    action: 'CREATE_LAB_ORDER',
    entityType: 'lab_order',
    entityId: labOrderId,
    reason: `Lab order #${orderNumber} to ${labName}`,
    afterSnapshot: {
      orderNumber,
      dueDate,
      privacyMode: settings.lab.externalPrivacyMode,
    },
  });

  return getLabOrderById(tx, actor, labOrderId, clinicToday, false);
}

export async function getLabOrderById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  labOrderId: string,
  clinicToday: string,
  forExternalSlip = false,
): Promise<LabOrderView> {
  assertModulePermission(actor, 'lab', 'view');
  const res = await tx.query<{
    lab_order_id: string;
    order_number: string;
    patient_id: string;
    file_number: string;
    full_name: string;
    visit_id: string | null;
    doctor_user_id: string;
    doctor_name: string;
    lab_name: string;
    work_description: string;
    shade: string;
    ordered_date: string;
    due_date: string;
    currency: Currency;
    lab_cost_minor: string;
    status: 'SENT' | 'RECEIVED' | 'DELIVERED' | 'CANCELLED';
  }>(
    `SELECT l.lab_order_id, l.order_number::text, l.patient_id, p.file_number::text, p.full_name,
            l.visit_id, l.doctor_user_id, d.display_name AS doctor_name,
            l.lab_name, l.work_description, l.shade,
            l.ordered_date::text AS ordered_date, l.due_date::text AS due_date,
            l.currency, l.lab_cost_minor::text, l.status
       FROM app_lab_orders l
       JOIN app_patients p ON p.patient_id = l.patient_id
       JOIN app_staff_users d ON d.user_id = l.doctor_user_id
      WHERE l.clinic_id = $1 AND l.lab_order_id = $2`,
    [actor.clinicId, labOrderId],
  );
  const row = res.rows[0];
  if (!row) failApp('NOT_FOUND', 404, 'Lab order not found');
  await assertPatientAccess(tx, actor, row.patient_id, clinicToday);

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const activePrivacy = settings.lab.externalPrivacyMode;
  const patientDisplayLabel =
    forExternalSlip && activePrivacy === 'CODE_ONLY'
      ? `P-${row.file_number}`
      : `${row.full_name} (#${row.file_number})`;

  // Hide financial lab cost on external slip or if actor lacks billing.view
  const canViewCost =
    !forExternalSlip &&
    !actor.hiddenModules.includes('billing') &&
    Boolean(actor.permissions.billing.view);

  return {
    labOrderId: row.lab_order_id,
    orderNumber: Number(row.order_number),
    patientId: row.patient_id,
    patientDisplayLabel,
    visitId: row.visit_id,
    doctorUserId: row.doctor_user_id,
    doctorName: row.doctor_name,
    labName: row.lab_name,
    workDescription: row.work_description,
    shade: row.shade,
    orderedDate: row.ordered_date.slice(0, 10),
    dueDate: row.due_date.slice(0, 10),
    currency: row.currency,
    labCostMinor: canViewCost ? row.lab_cost_minor : null,
    privacyModeApplied: activePrivacy,
    status: row.status,
  };
}

export async function listPatientLabOrders(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<readonly LabOrderView[]> {
  assertModulePermission(actor, 'lab', 'view');
  await assertPatientAccess(tx, actor, patientId, clinicToday);
  const res = await tx.query<{ lab_order_id: string }>(
    `SELECT lab_order_id FROM app_lab_orders
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY created_at DESC`,
    [actor.clinicId, patientId],
  );
  const out: LabOrderView[] = [];
  for (const r of res.rows) {
    out.push(await getLabOrderById(tx, actor, r.lab_order_id, clinicToday, false));
  }
  return out;
}

export interface InventoryItemView {
  readonly itemId: string;
  readonly sku: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly unitOfMeasure: string;
  readonly stockQty: number;
  readonly lowStockThreshold: number;
  readonly isLowStock: boolean;
  readonly hasMovements: boolean;
  readonly version: number;
}

export async function createInventoryItem(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    sku: string;
    nameAr: string;
    nameEn: string;
    unitOfMeasure: string;
    lowStockThreshold?: number;
  },
): Promise<InventoryItemView> {
  assertModulePermission(actor, 'inventory', 'create');
  const sku = typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : '';
  if (!/^[A-Z0-9._-]{2,32}$/.test(sku)) {
    failApp('INVALID_INPUT', 400, 'SKU must be 2..32 uppercase alphanumeric/._- chars');
  }
  const nameAr = typeof input.nameAr === 'string' ? input.nameAr.trim() : '';
  const nameEn = typeof input.nameEn === 'string' ? input.nameEn.trim() : '';
  const uom = typeof input.unitOfMeasure === 'string' ? input.unitOfMeasure.trim() : '';
  if (!nameAr || !nameEn || !uom) {
    failApp('INVALID_INPUT', 400, 'nameAr, nameEn, and unitOfMeasure are required');
  }

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const threshold =
    input.lowStockThreshold !== undefined
      ? Number(input.lowStockThreshold)
      : settings.inventory.lowStockDefaultThreshold;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000) {
    failApp('INVALID_INPUT', 400, 'Invalid lowStockThreshold');
  }

  const itemId = newEntityId('itm');
  await tx.query(
    `INSERT INTO app_inventory_items
       (item_id, clinic_id, sku, name_ar, name_en, unit_of_measure, stock_qty, low_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
    [itemId, actor.clinicId, sku, nameAr, nameEn, uom, threshold],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'INVENTORY',
    action: 'CREATE_INVENTORY_ITEM',
    entityType: 'inventory_item',
    entityId: itemId,
    reason: `Create SKU ${sku}`,
    afterSnapshot: { sku, unitOfMeasure: uom, lowStockThreshold: threshold },
  });

  return {
    itemId,
    sku,
    nameAr,
    nameEn,
    unitOfMeasure: uom,
    stockQty: 0,
    lowStockThreshold: threshold,
    isLowStock: 0 <= threshold,
    hasMovements: false,
    version: 1,
  };
}

export async function updateInventoryItemMetadata(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    itemId: string;
    expectedVersion: number;
    nameAr?: string;
    nameEn?: string;
    unitOfMeasure?: string;
    lowStockThreshold?: number;
    reason: string;
  },
): Promise<InventoryItemView> {
  assertModulePermission(actor, 'inventory', 'edit');
  const locked = await tx.query<{
    item_id: string;
    sku: string;
    name_ar: string;
    name_en: string;
    unit_of_measure: string;
    stock_qty: number;
    low_stock_threshold: number;
    has_movements: boolean;
    version: number;
  }>(
    `SELECT item_id, sku, name_ar, name_en, unit_of_measure, stock_qty,
            low_stock_threshold, has_movements, version
       FROM app_inventory_items
      WHERE clinic_id = $1 AND item_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.itemId],
  );
  const row = locked.rows[0];
  if (!row) failApp('NOT_FOUND', 404);
  if (row.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Inventory item version conflict');
  }

  const nextUom = input.unitOfMeasure !== undefined ? input.unitOfMeasure.trim() : row.unit_of_measure;
  if (row.has_movements && nextUom !== row.unit_of_measure) {
    failApp('UOM_LOCKED_AFTER_MOVEMENT', 409, 'Cannot change UoM after stock movements');
  }
  const nextNameAr = input.nameAr !== undefined ? input.nameAr.trim() : row.name_ar;
  const nextNameEn = input.nameEn !== undefined ? input.nameEn.trim() : row.name_en;
  const nextThreshold =
    input.lowStockThreshold !== undefined ? Number(input.lowStockThreshold) : row.low_stock_threshold;
  if (!nextNameAr || !nextNameEn || !nextUom || !Number.isInteger(nextThreshold) || nextThreshold < 0) {
    failApp('INVALID_INPUT', 400, 'Invalid inventory metadata');
  }

  const nextVersion = row.version + 1;
  await tx.query(
    `UPDATE app_inventory_items
        SET name_ar = $3, name_en = $4, unit_of_measure = $5,
            low_stock_threshold = $6, version = $7, updated_at = now()
      WHERE clinic_id = $1 AND item_id = $2`,
    [actor.clinicId, row.item_id, nextNameAr, nextNameEn, nextUom, nextThreshold, nextVersion],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'INVENTORY',
    action: 'UPDATE_INVENTORY_ITEM',
    entityType: 'inventory_item',
    entityId: row.item_id,
    reason: input.reason,
    beforeSnapshot: { unitOfMeasure: row.unit_of_measure, lowStockThreshold: row.low_stock_threshold },
    afterSnapshot: { unitOfMeasure: nextUom, lowStockThreshold: nextThreshold },
  });

  return {
    itemId: row.item_id,
    sku: row.sku,
    nameAr: nextNameAr,
    nameEn: nextNameEn,
    unitOfMeasure: nextUom,
    stockQty: row.stock_qty,
    lowStockThreshold: nextThreshold,
    isLowStock: row.stock_qty <= nextThreshold,
    hasMovements: row.has_movements,
    version: nextVersion,
  };
}

export async function recordInventoryMovement(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    itemId: string;
    kind: 'STOCK_IN' | 'VISIT_DISPENSE' | 'RETURN_IN' | 'ADJUSTMENT';
    quantity: number;
    visitId?: string | null;
    patientId?: string | null;
    reason: string;
  },
  clinicToday: string,
): Promise<{ movementId: string; resultingQty: number; isLowStock: boolean }> {
  assertModulePermission(actor, 'inventory', 'create');
  if (input.kind === 'ADJUSTMENT') {
    assertModulePermission(actor, 'inventory', 'approve');
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) failApp('INVALID_INPUT', 400, 'Movement reason is required');

  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty === 0 || Math.abs(qty) > 100000) {
    failApp('INVALID_INPUT', 400, 'Non-zero integer quantity is required');
  }

  let delta: number;
  if (input.kind === 'STOCK_IN' || input.kind === 'RETURN_IN') {
    if (qty < 0) failApp('INVALID_INPUT', 400, `${input.kind} requires positive quantity`);
    delta = qty;
  } else if (input.kind === 'VISIT_DISPENSE') {
    if (qty < 0) failApp('INVALID_INPUT', 400, 'VISIT_DISPENSE requires positive quantity');
    delta = -qty;
  } else if (input.kind === 'ADJUSTMENT') {
    delta = qty;
  } else {
    failApp('INVALID_INPUT', 400, 'Invalid movement kind');
  }

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  let resolvedPatientId: string | null = input.patientId ?? null;
  const resolvedVisitId: string | null = input.visitId ?? null;

  if (input.kind === 'VISIT_DISPENSE') {
    if (settings.inventory.requireVisitOnDispense && !resolvedVisitId) {
      failApp('INVALID_INPUT', 400, 'Clinic settings require an active clinical visitId on VISIT_DISPENSE');
    }
    if (resolvedVisitId) {
      const vRes = await tx.query<{ patient_id: string }>(
        `SELECT patient_id FROM app_visits WHERE clinic_id = $1 AND visit_id = $2`,
        [actor.clinicId, resolvedVisitId],
      );
      const v = vRes.rows[0];
      if (!v) failApp('NOT_FOUND', 404, 'Referenced visit not found');
      resolvedPatientId = v.patient_id;
      await assertPatientAccess(tx, actor, resolvedPatientId, clinicToday);
    }
  }

  const locked = await tx.query<{
    stock_qty: number;
    low_stock_threshold: number;
  }>(
    `SELECT stock_qty, low_stock_threshold
       FROM app_inventory_items
      WHERE clinic_id = $1 AND item_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.itemId],
  );
  const item = locked.rows[0];
  if (!item) failApp('NOT_FOUND', 404, 'Inventory item not found');

  const resultingQty = item.stock_qty + delta;
  // Non-bypassable stock integrity invariant: negative stock is strictly forbidden
  if (resultingQty < 0) {
    failApp('NEGATIVE_STOCK_FORBIDDEN', 409, `Insufficient stock (${item.stock_qty}) for delta ${delta}`);
  }

  const movementId = newEntityId('imv');
  await tx.query(
    `INSERT INTO app_inventory_movements
       (movement_id, clinic_id, item_id, patient_id, visit_id, kind, qty_delta, resulting_qty, reason, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      movementId,
      actor.clinicId,
      input.itemId,
      resolvedPatientId,
      resolvedVisitId,
      input.kind,
      delta,
      resultingQty,
      reason,
      actor.userId,
    ],
  );

  await tx.query(
    `UPDATE app_inventory_items
        SET stock_qty = $3, has_movements = TRUE, version = version + 1, updated_at = now()
      WHERE clinic_id = $1 AND item_id = $2`,
    [actor.clinicId, input.itemId, resultingQty],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'INVENTORY',
    action: `MOVEMENT_${input.kind}`,
    entityType: 'inventory_item',
    entityId: input.itemId,
    reason,
    beforeSnapshot: { stockQty: item.stock_qty },
    afterSnapshot: { stockQty: resultingQty, delta, visitId: resolvedVisitId },
  });

  return {
    movementId,
    resultingQty,
    isLowStock: resultingQty <= item.low_stock_threshold,
  };
}

export async function listInventoryItems(
  tx: DbExecutor,
  actor: AuthenticatedActor,
): Promise<readonly InventoryItemView[]> {
  assertModulePermission(actor, 'inventory', 'view');
  const res = await tx.query<{
    item_id: string;
    sku: string;
    name_ar: string;
    name_en: string;
    unit_of_measure: string;
    stock_qty: number;
    low_stock_threshold: number;
    has_movements: boolean;
    version: number;
  }>(
    `SELECT item_id, sku, name_ar, name_en, unit_of_measure, stock_qty,
            low_stock_threshold, has_movements, version
       FROM app_inventory_items
      WHERE clinic_id = $1
      ORDER BY sku ASC`,
    [actor.clinicId],
  );
  return res.rows.map(r => ({
    itemId: r.item_id,
    sku: r.sku,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    unitOfMeasure: r.unit_of_measure,
    stockQty: r.stock_qty,
    lowStockThreshold: r.low_stock_threshold,
    isLowStock: r.stock_qty <= r.low_stock_threshold,
    hasMovements: r.has_movements,
    version: r.version,
  }));
}
