// Browser UI controller for Aqlan Dental Center (Slice 1)
// Uses DOM text nodes (`el`) exclusively for untrusted data — zero XSS surface.

const bootNode = document.getElementById('boot-state');
const boot = bootNode ? JSON.parse(bootNode.textContent || '{}') : {};
const isAr = boot.lang === 'ar';

function t(ar, en) {
  return isAr ? ar : en;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'className') node.className = String(v);
    else if (k === 'dataset') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    if (child instanceof Node) node.appendChild(child);
    else node.appendChild(document.createTextNode(String(child)));
  }
  return node;
}

function svgToothIcon(jaw) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 28');
  const path = document.createElementNS(ns, 'path');
  if (jaw === 'UPPER') {
    // Roots pointing UP, anatomical crown pointing DOWN toward occlusal line
    path.setAttribute('d', 'M7 2 L9 12 L15 12 L17 2 M5 12 Q4 24 8 25 L16 25 Q20 24 19 12 Z');
  } else {
    // Anatomical crown pointing UP toward occlusal line, roots pointing DOWN
    path.setAttribute('d', 'M5 16 Q4 4 8 3 L16 3 Q20 4 19 16 Z M7 26 L9 16 L15 16 L17 26');
  }
  path.setAttribute('fill', '#f8fafc');
  path.setAttribute('stroke', '#1a3a5c');
  path.setAttribute('stroke-width', '1.6');
  svg.appendChild(path);
  return svg;
}

function formatMinor(minorStr, curr) {
  const val = BigInt(minorStr || '0');
  const neg = val < 0n;
  const abs = neg ? -val : val;
  const whole = abs / 100n;
  const frac = String(abs % 100n).padStart(2, '0');
  return `${neg ? '-' : ''}${whole.toLocaleString('en-US')}.${frac} ${curr}`;
}

function makeKey(prefix) {
  const rand = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand}`;
}

const toastEl = document.getElementById('global-toast');
function showToast(msg, kind = 'ok') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = `toast-banner visible ${kind}`;
}

async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = boot.csrfToken;
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = makeKey('ui');
    }
  }
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${path}${sep}lang=${boot.lang}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.code = data.code;
    throw err;
  }
  return data;
}

// State
let activeSection = boot.initialSection || 'patients';
let doctorsCache = [];
let patientsCache = [];
let selectedPatientId = null;
let selectedToothFdi = '16';
let staffCache = [];
let selectedStaffUserId = null;
let settingsState = { version: boot.settingsVersion, settings: boot.settings };

// Navigation
function switchSection(sec) {
  activeSection = sec;
  document.querySelectorAll('.nav-tab[data-section]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === sec);
  });
  document.querySelectorAll('.workspace-section').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `sec-${sec}`);
  });
  if (sec === 'patients') loadPatientsDirectory();
  if (sec === 'appointments') loadAppointmentsQueue();
  if (sec === 'inventory') loadInventory();
  if (sec === 'governance') loadGovernanceConsole();
}

document.querySelectorAll('.nav-tab[data-section]').forEach((btn) => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    await api('/api/v1/auth/logout', { method: 'POST', body: {} });
  } finally {
    window.location.href = `/login?lang=${boot.lang}`;
  }
});

async function loadDoctorsDirectory() {
  try {
    const res = await api('/api/v1/doctors');
    doctorsCache = res.doctors || [];
    const fillSelect = (id, allowBlank) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.replaceChildren();
      if (allowBlank) sel.appendChild(el('option', { value: '' }, t('— غير محدد —', '— Unassigned —')));
      for (const d of doctorsCache) {
        sel.appendChild(el('option', { value: d.userId }, d.displayName));
      }
    };
    fillSelect('select-patient-doctor', true);
    fillSelect('appt-doctor-select', false);
  } catch {
    // Non-fatal if doctors endpoint restricted
  }
}

// ======================== PATIENTS & UNIFIED CLINICAL/BILLING ========================
async function loadPatientsDirectory(q = '') {
  try {
    const res = await api(`/api/v1/patients?q=${encodeURIComponent(q)}`);
    patientsCache = res.patients || [];
    const tbody = document.getElementById('patients-tbody');
    if (tbody) {
      tbody.replaceChildren();
      if (patientsCache.length === 0) {
        tbody.appendChild(el('tr', {}, el('td', { colspan: '3', className: 'empty-hint' }, t('لا يوجد مرضى مطابقون', 'No matching patients'))));
      }
      for (const p of patientsCache) {
        const tr = el(
          'tr',
          {
            className: `clickable-row ${p.patientId === selectedPatientId ? 'selected-row' : ''}`,
            onClick: () => selectPatient(p.patientId),
          },
          el('td', {}, el('bdi', { dir: 'ltr' }, `#${p.fileNumber}`)),
          el('td', {}, p.fullName),
          el('td', {}, p.hasCriticalAlert ? el('span', { className: 'badge badge-danger' }, t('تنبيه طبي', 'Alert')) : '—'),
        );
        tbody.appendChild(tr);
      }
    }

    const apptPatSel = document.getElementById('appt-patient-select');
    if (apptPatSel) {
      apptPatSel.replaceChildren();
      for (const p of patientsCache) {
        apptPatSel.appendChild(el('option', { value: p.patientId }, `#${p.fileNumber} — ${p.fullName}`));
      }
    }

    if (!selectedPatientId && patientsCache[0]) {
      await selectPatient(patientsCache[0].patientId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('patient-search-input')?.addEventListener('input', (ev) => {
  loadPatientsDirectory(ev.target.value);
});

document.getElementById('form-create-patient')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const allergiesRaw = String(fd.get('allergies') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const res = await api('/api/v1/patients', {
      method: 'POST',
      body: {
        fullName: fd.get('fullName'),
        phone: fd.get('phone'),
        sex: fd.get('sex'),
        primaryDoctorUserId: fd.get('primaryDoctorUserId') || null,
        medicalHistory: {
          allergies: allergiesRaw,
          criticalNotes: fd.get('criticalNotes') || '',
          takesAnticoagulants: fd.get('takesAnticoagulants') === 'on',
          isPregnant: fd.get('isPregnant') === 'on',
        },
      },
    });
    ev.target.reset();
    showToast(t(`تم فتح ملف المريض برقم #${res.patient.fileNumber}`, `Patient registered (#${res.patient.fileNumber})`), 'ok');
    selectedPatientId = res.patient.patientId;
    await loadPatientsDirectory();
    await selectPatient(selectedPatientId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function selectPatient(patientId) {
  selectedPatientId = patientId;
  const pane = document.getElementById('patient-detail-pane');
  if (!pane) return;

  try {
    const bundle = await api(`/api/v1/patients/${encodeURIComponent(patientId)}/workspace`);
    renderPatientWorkspace(pane, bundle);
  } catch (err) {
    pane.replaceChildren(el('div', { className: 'panel' }, el('p', { className: 'empty-hint' }, err.message)));
  }
}

function renderUnifiedFdiChart(chart, onSelectTooth) {
  const upperRight = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const upperLeft = ['21', '22', '23', '24', '25', '26', '27', '28'];
  const primUpperR = ['55', '54', '53', '52', '51'];
  const primUpperL = ['61', '62', '63', '64', '65'];
  const primLowerR = ['85', '84', '83', '82', '81'];
  const primLowerL = ['71', '72', '73', '74', '75'];
  const lowerRight = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const lowerLeft = ['31', '32', '33', '34', '35', '36', '37', '38'];

  const buildRow = (rightArr, leftArr, jaw) => {
    const makeBtn = (num) => {
      const info = chart?.teeth?.[num] || { latestStatus: 'HEALTHY', hasEndo: false, restoredSurfaces: [] };
      const cls = [
        'tooth-btn',
        num === selectedToothFdi ? 'selected' : '',
        `status-${info.latestStatus}`,
        info.hasEndo ? 'has-endo' : '',
      ].filter(Boolean).join(' ');
      return el(
        'button',
        {
          type: 'button',
          className: cls,
          title: `FDI #${num} (${info.latestStatus})`,
          onClick: () => onSelectTooth(num),
        },
        jaw === 'UPPER' ? svgToothIcon('UPPER') : el('span', {}, num),
        jaw === 'UPPER' ? el('span', {}, num) : svgToothIcon('LOWER'),
      );
    };
    return el(
      'div',
      { className: 'fdi-arch-row' },
      ...rightArr.map(makeBtn),
      el('div', { className: 'fdi-midline', title: 'Midline' }),
      ...leftArr.map(makeBtn),
    );
  };

  return el(
    'div',
    { className: 'fdi-chart-container', id: 'unified-fdi-chart' },
    el(
      'div',
      { className: 'fdi-orientation-bar' },
      el('span', {}, 'Patient Right (Q1 / Q4)'),
      el('span', {}, t('المخطط السني العالمي الموحد FDI (غير معكوس)', 'Unified Canonical FDI Chart (Non-Mirrored)')),
      el('span', {}, 'Patient Left (Q2 / Q3)'),
    ),
    buildRow(upperRight, upperLeft, 'UPPER'),
    buildRow(primUpperR, primUpperL, 'UPPER'),
    el('div', { className: 'fdi-occlusal-divider' }),
    buildRow(primLowerR, primLowerL, 'LOWER'),
    buildRow(lowerRight, lowerLeft, 'LOWER'),
  );
}

function renderPatientWorkspace(container, data) {
  const { patient, chart, visits, statement, labOrders } = data;
  container.replaceChildren();

  // 1. Header & Medical Safety Alert
  const headerPanel = el(
    'div',
    { className: 'panel' },
    el(
      'div',
      { className: 'panel-header' },
      el(
        'div',
        {},
        el('h2', {}, `${patient.fullName} `, el('bdi', { dir: 'ltr', className: 'badge badge-navy' }, `#${patient.fileNumber}`)),
        el(
          'div',
          { style: 'font-size:12px; color:#64748b; margin-top:4px;' },
          `${t('الهاتف:', 'Phone:')} `,
          el('bdi', { dir: 'ltr' }, patient.phone),
          ` · ${t('الطبيب الأساسي:', 'Primary Doctor:')} ${patient.primaryDoctorName || '—'} · `,
          el('bdi', { dir: 'ltr' }, `Portal: ${patient.portalHandle} (${patient.portalStatus})`),
        ),
      ),
      el(
        'div',
        { style: 'display:flex; gap:8px; flex-wrap:wrap;' },
        statement
          ? el(
              'a',
              {
                href: `/print/statement/${encodeURIComponent(patient.patientId)}?lang=${boot.lang}`,
                target: '_blank',
                className: 'btn btn-accent btn-sm',
              },
              t('طباعة كشف الحساب وجدول الأقساط (A4)', 'Print Statement & Schedule (A4)'),
            )
          : null,
      ),
    ),
  );

  if (patient.medicalHistory.hasCriticalAlert) {
    const parts = [];
    if (patient.medicalHistory.allergies.length) {
      parts.push(`${t('حساسية دوائية:', 'Allergies:')} ${patient.medicalHistory.allergies.join(', ')}`);
    }
    if (patient.medicalHistory.takesAnticoagulants) parts.push(t('يتناول مميعات دم', 'On Anticoagulants'));
    if (patient.medicalHistory.isPregnant) parts.push(t('حامل', 'Pregnant'));
    if (patient.medicalHistory.criticalNotes) parts.push(patient.medicalHistory.criticalNotes);

    headerPanel.appendChild(
      el(
        'div',
        { className: 'medical-alert-banner' },
        el('strong', {}, t('تنبيه سلامة طبية حرج — يجب الإقرار قبل الإجراءات السريرية', 'CRITICAL MEDICAL SAFETY ALERT — Must Acknowledge Before Clinical Procedures')),
        el('span', {}, parts.join(' · ')),
      ),
    );
  }
  container.appendChild(headerPanel);

  // 2. Clinical Chart & Visits (if clinical visible)
  if (chart) {
    const clinicalPanel = el('div', { className: 'panel' });
    clinicalPanel.appendChild(
      el('div', { className: 'panel-header' }, el('h3', {}, t('المخطط السني الموحد والزيارات السريرية', 'Unified FDI Dental Chart & Visits'))),
    );
    clinicalPanel.appendChild(
      renderUnifiedFdiChart(chart, (fdi) => {
        selectedToothFdi = fdi;
        const toothInput = document.getElementById('proc-tooth-input');
        if (toothInput) toothInput.value = fdi;
        renderPatientWorkspace(container, data);
      }),
    );

    // Open Visit Form
    const openVisitForm = el(
      'form',
      {
        style: 'margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;',
        onSubmit: async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          try {
            await api('/api/v1/visits', {
              method: 'POST',
              body: {
                patientId: patient.patientId,
                visitDate: boot.clinicToday,
                kind: fd.get('kind'),
                chiefComplaint: fd.get('chiefComplaint'),
                acknowledgeMedicalAlerts: fd.get('ackAlert') === 'on',
              },
            });
            showToast(t('تم فتح الزيارة السريرية', 'Clinical visit opened'), 'ok');
            await selectPatient(patient.patientId);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      },
      el(
        'div',
        { className: 'form-grid' },
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('نوع الزيارة', 'Visit Kind')),
          el(
            'select',
            { name: 'kind' },
            el('option', { value: 'INITIAL' }, t('زيارة أولية / فحص', 'Initial')),
            el('option', { value: 'FOLLOW_UP' }, t('متابعة علاجية', 'Follow-Up')),
            el('option', { value: 'ADJUSTMENT' }, t('شد / تعديل تقويم', 'Ortho Adjustment')),
          ),
        ),
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('الشكوى الرئيسية / خطة الجلسة', 'Chief Complaint')),
          el('input', { name: 'chiefComplaint', required: true, placeholder: t('علاج عصب / تقويم الفكين', 'Endodontic / Ortho plan') }),
        ),
      ),
      patient.medicalHistory.hasCriticalAlert
        ? el(
            'label',
            { style: 'display:block; margin-bottom:8px; color:#991b1b; font-weight:700; font-size:12px;' },
            el('input', { type: 'checkbox', name: 'ackAlert' }),
            ` ${t('أقر بمراجعة الحساسية والتنبيهات الطبية الحرجة لهذا المريض', 'I acknowledge reviewing critical medical history alerts')}`,
          )
        : null,
      el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, t('فتح زيارة سريرية جديدة', 'Open Clinical Visit')),
    );
    clinicalPanel.appendChild(openVisitForm);

    // List Open/Completed Visits + Add Procedure
    for (const v of visits || []) {
      const vBox = el(
        'div',
        { style: 'border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:10px;' },
        el(
          'div',
          { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;' },
          el('strong', {}, `${v.visitDate} · ${v.chiefComplaint} (${v.status}) — ${v.doctorName}`),
          v.status === 'OPEN'
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    try {
                      await api(`/api/v1/visits/${encodeURIComponent(v.visitId)}/complete`, {
                        method: 'POST',
                        body: { expectedVersion: v.version },
                      });
                      showToast(t('تم إغلاق الزيارة السريرية', 'Visit completed'), 'ok');
                      await selectPatient(patient.patientId);
                    } catch (err) {
                      showToast(err.message, 'error');
                    }
                  },
                },
                t('إغلاق واعتماد الزيارة', 'Complete Visit'),
              )
            : null,
        ),
      );

      if (v.procedures.length > 0) {
        const pTable = el(
          'table',
          { className: 'ui-table' },
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              el('th', {}, t('الإجراء', 'Procedure')),
              el('th', {}, 'FDI'),
              el('th', {}, t('الجلسات', 'Sessions')),
              el('th', {}, t('الرسوم', 'Fee')),
              el('th', {}, t('الفوترة', 'Billing')),
            ),
          ),
          el(
            'tbody',
            {},
            ...v.procedures.map((pr) =>
              el(
                'tr',
                {},
                el('td', {}, isAr ? pr.procedureNameAr : pr.procedureNameEn),
                el('td', {}, pr.fdiTooth ? `#${pr.fdiTooth}` : pr.arch || '—'),
                el('td', {}, `${pr.completedSessions}/${pr.plannedSessions}`),
                el('td', {}, el('bdi', { dir: 'ltr' }, formatMinor(pr.feeMinor, pr.currency))),
                el('td', {}, pr.isBilled ? el('span', { className: 'badge badge-ok' }, t('مفوتر', 'Billed')) : el('span', { className: 'badge badge-warn' }, t('غير مفوتر', 'Unbilled'))),
              ),
            ),
          ),
        );
        vBox.appendChild(pTable);
      }

      if (v.status === 'OPEN') {
        const procForm = el(
          'form',
          {
            style: 'margin-top:8px;',
            onSubmit: async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.target);
              const svc = String(fd.get('serviceCode'));
              const body = {
                serviceCode: svc,
                procedureNameAr: fd.get('procedureNameAr'),
                procedureNameEn: fd.get('procedureNameEn'),
                feeDecimal: fd.get('feeDecimal'),
                clinicalNote: fd.get('clinicalNote'),
                plannedSessions: Number(fd.get('plannedSessions') || 1),
                completedSessions: 1,
              };
              if (svc === 'ENDO') body.fdiTooth = String(fd.get('fdiTooth'));
              if (svc === 'RESTORATION') {
                body.fdiTooth = String(fd.get('fdiTooth'));
                body.surfaces = ['O', 'M'];
              }
              if (svc === 'ORTHO') body.arch = 'BOTH';
              try {
                await api(`/api/v1/visits/${encodeURIComponent(v.visitId)}/procedures`, {
                  method: 'POST',
                  body,
                });
                showToast(t('تم تسجيل الإجراء السريري', 'Procedure recorded'), 'ok');
                await selectPatient(patient.patientId);
              } catch (err) {
                showToast(err.message, 'error');
              }
            },
          },
          el(
            'div',
            { className: 'form-grid' },
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('القسم', 'Service')),
              el(
                'select',
                { name: 'serviceCode' },
                el('option', { value: 'ENDO' }, 'ENDO'),
                el('option', { value: 'RESTORATION' }, 'RESTORATION (O,M)'),
                el('option', { value: 'ORTHO' }, 'ORTHO (BOTH)'),
                el('option', { value: 'CONSULTATION' }, 'CONSULTATION'),
              ),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('السن المحدد (FDI)', 'Selected FDI Tooth')),
              el('input', { name: 'fdiTooth', id: 'proc-tooth-input', dir: 'ltr', value: selectedToothFdi }),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('الإجراء (عربي)', 'Name (AR)')),
              el('input', { name: 'procedureNameAr', required: true, value: 'علاج عصب جذور متكامل' }),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('الإجراء (إنجليزي)', 'Name (EN)')),
              el('input', { name: 'procedureNameEn', required: true, value: 'Root Canal Therapy' }),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('الرسوم المعتمدة', 'Fee')),
              el('input', { name: 'feeDecimal', dir: 'ltr', required: true, value: '2300.00' }),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('عدد الجلسات', 'Sessions')),
              el('input', { type: 'number', name: 'plannedSessions', dir: 'ltr', min: '1', max: '36', value: '1' }),
            ),
            el(
              'div',
              { className: 'field' },
              el('label', {}, t('التوثيق السريري', 'Clinical Note')),
              el('input', { name: 'clinicalNote', required: true, value: 'تحضير وتنظيف القنوات تحت العزل المطاطي' }),
            ),
          ),
          el('button', { type: 'submit', className: 'btn btn-accent btn-sm' }, t('إضافة الإجراء للزيارة', 'Add Procedure')),
        );
        vBox.appendChild(procForm);
      }

      clinicalPanel.appendChild(vBox);
    }
    container.appendChild(clinicalPanel);
  }

  // 3. Billing, Partial Receipts & Remaining-Balance Installments
  if (statement) {
    const unbilledProcs = (visits || []).flatMap((v) => v.procedures.filter((p) => !p.isBilled && p.status !== 'CANCELLED'));
    const billPanel = el('div', { className: 'panel' });
    billPanel.appendChild(
      el('div', { className: 'panel-header' }, el('h3', {}, t('الفواتير وسندات القبض وجدولة الأقساط الشهرية', 'Invoices, Receipts & Remaining-Balance Installments'))),
    );

    // Issue invoice form
    const invForm = el(
      'form',
      {
        style: 'margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #e2e8f0;',
        onSubmit: async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const useUnbilled = fd.get('billUnbilled') === 'on' && unbilledProcs.length > 0;
          const body = {
            patientId: patient.patientId,
            issuedDate: boot.clinicToday,
            currency: fd.get('currency'),
            discountDecimal: fd.get('discountDecimal') || '0.00',
            notes: fd.get('notes') || '',
          };
          if (useUnbilled) {
            body.visitProcedureIds = unbilledProcs.map((p) => p.procedureId);
          } else {
            body.manualLines = [
              {
                descriptionAr: fd.get('descAr'),
                descriptionEn: fd.get('descEn'),
                quantity: 1,
                unitPriceDecimal: fd.get('amountDecimal'),
              },
            ];
          }
          try {
            await api('/api/v1/invoices', { method: 'POST', body });
            showToast(t('تم إصدار الفاتورة المعتمدة', 'Invoice issued'), 'ok');
            await selectPatient(patient.patientId);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      },
      unbilledProcs.length > 0
        ? el(
            'label',
            { style: 'display:block; margin-bottom:8px; font-weight:700; color:#1a3a5c;' },
            el('input', { type: 'checkbox', name: 'billUnbilled', checked: true }),
            ` ${t(`فوترة الإجراءات السريرية غير المفوترة (${unbilledProcs.length}) تلقائياً`, `Auto-bill ${unbilledProcs.length} unbilled clinical procedure(s)`)}`,
          )
        : null,
      el(
        'div',
        { className: 'form-grid' },
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('البيان (يدوي إن لم توجد إجراءات)', 'Description (AR)')),
          el('input', { name: 'descAr', value: 'اتفاقية تقويم الأسنان الشامل' }),
        ),
        el(
          'div',
          { className: 'field' },
          el('label', {}, 'Description (EN)'),
          el('input', { name: 'descEn', value: 'Comprehensive Orthodontic Treatment' }),
        ),
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('المبلغ الإجمالي', 'Gross Amount')),
          el('input', { name: 'amountDecimal', dir: 'ltr', value: '2300.00' }),
        ),
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('الخصم', 'Discount')),
          el('input', { name: 'discountDecimal', dir: 'ltr', value: '0.00' }),
        ),
        el(
          'div',
          { className: 'field' },
          el('label', {}, t('العملة', 'Currency')),
          el(
            'select',
            { name: 'currency' },
            el('option', { value: settingsState.settings.finance.defaultCurrency }, settingsState.settings.finance.defaultCurrency),
            el('option', { value: 'USD' }, 'USD'),
            el('option', { value: 'SAR' }, 'SAR'),
            el('option', { value: 'YER' }, 'YER'),
          ),
        ),
      ),
      el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, t('إصدار فاتورة رسمية', 'Issue Official Invoice')),
    );
    billPanel.appendChild(invForm);

    // Invoices list + Receipt + Installment controls
    for (const inv of statement.invoices) {
      const invCard = el(
        'div',
        { style: 'border:1px solid #dbe3ee; border-radius:6px; padding:10px; margin-bottom:10px; background:#fafcff;' },
        el(
          'div',
          { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;' },
          el(
            'strong',
            {},
            el('bdi', { dir: 'ltr' }, `INV-${inv.invoiceNumber}`),
            ` · ${t('الصافي:', 'Net:')} `,
            el('bdi', { dir: 'ltr' }, formatMinor(inv.netMinor, inv.currency)),
            ` · ${t('المسدد:', 'Paid:')} `,
            el('bdi', { dir: 'ltr' }, formatMinor(inv.paidMinor, inv.currency)),
            ` · ${t('المتبقي:', 'Remaining:')} `,
            el('bdi', { dir: 'ltr' }, formatMinor(inv.remainingMinor, inv.currency)),
            ` (${inv.status})`,
          ),
          el(
            'a',
            {
              href: `/print/invoice/${encodeURIComponent(inv.invoiceId)}?lang=${boot.lang}`,
              target: '_blank',
              className: 'btn btn-outline btn-sm',
            },
            t('طباعة الفاتورة A4', 'Print Invoice A4'),
          ),
        ),
      );

      if (inv.status !== 'VOIDED' && BigInt(inv.remainingMinor) > 0n) {
        const actionsGrid = el(
          'div',
          { style: 'display:grid; grid-template-columns: 1fr 1fr; gap:12px;' },
          // Partial Receipt Form
          el(
            'form',
            {
              onSubmit: async (ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.target);
                try {
                  await api('/api/v1/receipts', {
                    method: 'POST',
                    body: {
                      invoiceId: inv.invoiceId,
                      receiptDate: boot.clinicToday,
                      paymentMethod: fd.get('paymentMethod'),
                      paymentCurrency: fd.get('paymentCurrency'),
                      amountDecimal: fd.get('amountDecimal'),
                      reason: fd.get('reason'),
                    },
                  });
                  showToast(t('تم تحصيل سند القبض بنجاح', 'Receipt recorded'), 'ok');
                  await selectPatient(patient.patientId);
                } catch (err) {
                  showToast(err.message, 'error');
                }
              },
            },
            el('strong', { style: 'font-size:12px;' }, t('تحصيل سند قبض جزئي / كامل', 'Collect Partial/Full Receipt')),
            el(
              'div',
              { className: 'form-grid', style: 'margin-top:6px;' },
              el('div', { className: 'field' }, el('input', { name: 'amountDecimal', dir: 'ltr', placeholder: '500.00', value: '500.00', required: true })),
              el(
                'div',
                { className: 'field' },
                el(
                  'select',
                  { name: 'paymentCurrency' },
                  el('option', { value: inv.currency }, inv.currency),
                  el('option', { value: 'SAR' }, 'SAR'),
                  el('option', { value: 'USD' }, 'USD'),
                  el('option', { value: 'YER' }, 'YER'),
                ),
              ),
              el(
                'div',
                { className: 'field' },
                el(
                  'select',
                  { name: 'paymentMethod' },
                  el('option', { value: 'CASH' }, 'CASH'),
                  el('option', { value: 'CARD' }, 'CARD'),
                  el('option', { value: 'BANK_TRANSFER' }, 'BANK_TRANSFER'),
                ),
              ),
              el('div', { className: 'field' }, el('input', { name: 'reason', value: t('دفعة أولى معتمدة', 'Approved payment'), required: true })),
            ),
            el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, t('إصدار سند القبض', 'Record Receipt')),
          ),
          // Installment Schedule Form
          el(
            'form',
            {
              onSubmit: async (ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.target);
                try {
                  await api('/api/v1/installments', {
                    method: 'POST',
                    body: {
                      invoiceId: inv.invoiceId,
                      monthsCount: Number(fd.get('monthsCount')),
                      startDueDate: fd.get('startDueDate'),
                      notes: fd.get('notes') || '',
                    },
                  });
                  showToast(t('تم اعتماد جدول الأقساط من الرصيد المتبقي فقط', 'Installment schedule generated on remaining balance'), 'ok');
                  await selectPatient(patient.patientId);
                } catch (err) {
                  showToast(err.message, 'error');
                }
              },
            },
            el('strong', { style: 'font-size:12px;' }, t('جدولة المتبقي شهرياً (بدون خصم الدفعة مرتين)', 'Schedule Remaining Balance Monthly')),
            el(
              'div',
              { className: 'form-grid', style: 'margin-top:6px;' },
              el('div', { className: 'field' }, el('input', { type: 'number', name: 'monthsCount', dir: 'ltr', min: '1', max: '60', value: '24', required: true })),
              el('div', { className: 'field' }, el('input', { type: 'date', name: 'startDueDate', dir: 'ltr', value: boot.clinicToday, required: true })),
            ),
            el('button', { type: 'submit', className: 'btn btn-accent btn-sm' }, t('إنشاء جدول الأقساط', 'Generate Schedule')),
          ),
        );
        invCard.appendChild(actionsGrid);
      }
      billPanel.appendChild(invCard);
    }

    // Receipts list with A6 print
    if (statement.receipts.length > 0) {
      billPanel.appendChild(
        el(
          'div',
          { className: 'table-wrap', style: 'margin-top:8px;' },
          el(
            'table',
            { className: 'ui-table' },
            el(
              'thead',
              {},
              el('tr', {}, el('th', {}, t('رقم السند', 'Receipt')), el('th', {}, t('النوع', 'Kind')), el('th', {}, t('المبلغ', 'Amount')), el('th', {}, t('الطباعة', 'Print'))),
            ),
            el(
              'tbody',
              {},
              ...statement.receipts.map((rcp) =>
                el(
                  'tr',
                  {},
                  el('td', {}, el('bdi', { dir: 'ltr' }, `RCP-${rcp.receiptNumber}`)),
                  el('td', {}, rcp.kind),
                  el('td', {}, el('bdi', { dir: 'ltr' }, formatMinor(rcp.paymentMinor, rcp.paymentCurrency))),
                  el(
                    'td',
                    {},
                    el(
                      'a',
                      {
                        href: `/print/receipt/${encodeURIComponent(rcp.receiptId)}?lang=${boot.lang}`,
                        target: '_blank',
                        className: 'btn btn-outline btn-sm',
                      },
                      t('طباعة سند A6', 'Print A6'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    // Active Installment Schedules preview
    for (const sch of statement.activeSchedules) {
      billPanel.appendChild(
        el(
          'div',
          { style: 'margin-top:12px; padding:10px; background:#fff7ed; border:1px solid #fed7aa; border-radius:6px;' },
          el(
            'strong',
            {},
            `${t('جدول أقساط فعال:', 'Active Schedule:')} ${sch.monthsCount} ${t('شهراً — المتبقي المقسّط:', 'months — Financed Remaining:')} `,
            el('bdi', { dir: 'ltr' }, formatMinor(sch.financedRemainingMinor, sch.currency)),
            ` (${t('القسط الأول:', 'Monthly:')} `,
            el('bdi', { dir: 'ltr' }, formatMinor(sch.lines[0]?.amountMinor || '0', sch.currency)),
            ')',
          ),
        ),
      );
    }

    container.appendChild(billPanel);
  }

  // 4. External Lab Orders (if lab visible)
  if (Array.isArray(labOrders)) {
    const labPanel = el(
      'div',
      { className: 'panel' },
      el('div', { className: 'panel-header' }, el('h3', {}, t('أوامر المعامل الخارجية', 'External Dental Lab Orders'))),
      el(
        'form',
        {
          style: 'margin-bottom:10px;',
          onSubmit: async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            try {
              await api('/api/v1/lab-orders', {
                method: 'POST',
                body: {
                  patientId: patient.patientId,
                  labName: fd.get('labName'),
                  workDescription: fd.get('workDescription'),
                  shade: fd.get('shade'),
                  orderedDate: boot.clinicToday,
                  labCostDecimal: fd.get('labCostDecimal') || '0.00',
                },
              });
              showToast(t('تم إنشاء أمر المعمل وفق إعدادات الخصوصية والتسليم', 'Lab order created'), 'ok');
              await selectPatient(patient.patientId);
            } catch (err) {
              showToast(err.message, 'error');
            }
          },
        },
        el(
          'div',
          { className: 'form-grid' },
          el('div', { className: 'field' }, el('label', {}, t('المعمل', 'Lab Name')), el('input', { name: 'labName', value: 'معمل النخبة للزيركون', required: true })),
          el('div', { className: 'field' }, el('label', {}, t('العمل المطلوب', 'Work')), el('input', { name: 'workDescription', value: 'تاج زيركون للسن #16', required: true })),
          el('div', { className: 'field' }, el('label', {}, 'Shade'), el('input', { name: 'shade', dir: 'ltr', value: 'A2' })),
          el('div', { className: 'field' }, el('label', {}, t('التكلفة الداخلية', 'Lab Cost')), el('input', { name: 'labCostDecimal', dir: 'ltr', value: '120.00' })),
        ),
        el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, t('إرسال أمر للمعمل', 'Send Lab Order')),
      ),
      ...labOrders.map((lo) =>
        el(
          'div',
          { style: 'display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid #eef2f6;' },
          el('span', {}, `LAB-${lo.orderNumber} · ${lo.labName} · ${t('تسليم:', 'Due:')} ${lo.dueDate} (${lo.privacyModeApplied})`),
          el(
            'a',
            { href: `/print/lab/${encodeURIComponent(lo.labOrderId)}?lang=${boot.lang}`, target: '_blank', className: 'btn btn-outline btn-sm' },
            t('طباعة أمر المعمل A5', 'Print Lab Slip A5'),
          ),
        ),
      ),
    );
    container.appendChild(labPanel);
  }
}

// ======================== APPOINTMENTS & QUEUE ========================
async function loadAppointmentsQueue() {
  const dateInput = document.getElementById('appt-filter-date');
  const day = dateInput?.value || boot.clinicToday;
  const badge = document.getElementById('schedule-hours-badge');
  if (badge && settingsState.settings?.schedule) {
    const sc = settingsState.settings.schedule;
    badge.textContent = `${sc.dayStart}–${sc.dayEnd} · ${sc.chairsCount} ${t('كراسي', 'Chairs')}`;
  }
  try {
    await loadPatientsDirectory();
    const res = await api(`/api/v1/appointments?date=${encodeURIComponent(day)}`);
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;
    tbody.replaceChildren();
    if (!res.appointments || res.appointments.length === 0) {
      tbody.appendChild(el('tr', {}, el('td', { colspan: '7', className: 'empty-hint' }, t('لا توجد مواعيد مسجلة لهذا اليوم', 'No appointments scheduled for this date'))));
      return;
    }
    for (const a of res.appointments) {
      const actions = [];
      if (a.status === 'BOOKED') actions.push(['ARRIVED', t('وصول للانتظار', 'Mark Arrived')]);
      if (a.status === 'BOOKED' || a.status === 'ARRIVED') actions.push(['IN_CHAIR', t('دخول للكرسي', 'In Chair')]);
      if (a.status === 'IN_CHAIR') actions.push(['COMPLETED', t('إنهاء', 'Complete')]);

      tbody.appendChild(
        el(
          'tr',
          {},
          el('td', {}, el('bdi', { dir: 'ltr' }, `${a.startTime}–${a.endTime}`)),
          el('td', {}, el('bdi', { dir: 'ltr' }, `#${a.chairNo}`)),
          el('td', {}, `${a.patientName} (#${a.patientFileNumber})`),
          el('td', {}, a.doctorName),
          el('td', {}, a.kind),
          el('td', {}, el('span', { className: 'badge badge-navy' }, a.status)),
          el(
            'td',
            {},
            ...actions.map(([st, label]) =>
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  style: 'margin-inline-end:4px;',
                  onClick: async () => {
                    try {
                      await api(`/api/v1/appointments/${encodeURIComponent(a.appointmentId)}/status`, {
                        method: 'PATCH',
                        body: { expectedVersion: a.version, nextStatus: st, reason: 'Queue progression' },
                      });
                      await loadAppointmentsQueue();
                    } catch (err) {
                      showToast(err.message, 'error');
                    }
                  },
                },
                label,
              ),
            ),
          ),
        ),
      );
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('appt-filter-date')?.addEventListener('change', () => loadAppointmentsQueue());

document.getElementById('form-create-appointment')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  try {
    await api('/api/v1/appointments', {
      method: 'POST',
      body: {
        patientId: fd.get('patientId'),
        doctorUserId: fd.get('doctorUserId'),
        appointmentDate: fd.get('appointmentDate'),
        startTime: fd.get('startTime'),
        chairNo: Number(fd.get('chairNo')),
        kind: fd.get('kind'),
      },
    });
    showToast(t('تم حجز الموعد وإدراج إشعار في صندوق التواصل', 'Appointment booked'), 'ok');
    await loadAppointmentsQueue();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ======================== INVENTORY ========================
async function loadInventory() {
  try {
    const res = await api('/api/v1/inventory/items');
    const items = res.items || [];
    const tbody = document.getElementById('inventory-tbody');
    const sel = document.getElementById('inv-item-select');
    if (sel) {
      sel.replaceChildren();
      for (const it of items) {
        sel.appendChild(el('option', { value: it.itemId }, `${it.sku} — ${isAr ? it.nameAr : it.nameEn} (${it.stockQty} ${it.unitOfMeasure})`));
      }
    }
    if (tbody) {
      tbody.replaceChildren();
      if (items.length === 0) {
        tbody.appendChild(el('tr', {}, el('td', { colspan: '6', className: 'empty-hint' }, t('لا توجد أصناف مخزنية بعد', 'No inventory items yet'))));
      }
      for (const it of items) {
        tbody.appendChild(
          el(
            'tr',
            {},
            el('td', {}, el('bdi', { dir: 'ltr' }, it.sku)),
            el('td', {}, isAr ? it.nameAr : it.nameEn),
            el('td', {}, `${it.unitOfMeasure}${it.hasMovements ? ' 🔒' : ''}`),
            el('td', {}, el('bdi', { dir: 'ltr' }, String(it.stockQty))),
            el('td', {}, el('bdi', { dir: 'ltr' }, String(it.lowStockThreshold))),
            el('td', {}, it.isLowStock ? el('span', { className: 'badge badge-danger' }, t('منخفض', 'Low Stock')) : el('span', { className: 'badge badge-ok' }, t('متوفر', 'OK'))),
          ),
        );
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('form-create-item')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  try {
    await api('/api/v1/inventory/items', {
      method: 'POST',
      body: {
        sku: fd.get('sku'),
        nameAr: fd.get('nameAr'),
        nameEn: fd.get('nameEn'),
        unitOfMeasure: fd.get('unitOfMeasure'),
      },
    });
    ev.target.reset();
    showToast(t('تم إنشاء الصنف المخزني', 'Inventory SKU created'), 'ok');
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('form-stock-movement')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  try {
    await api('/api/v1/inventory/movements', {
      method: 'POST',
      body: {
        itemId: fd.get('itemId'),
        kind: fd.get('kind'),
        quantity: Number(fd.get('quantity')),
        visitId: fd.get('visitId') || null,
        reason: fd.get('reason'),
      },
    });
    showToast(t('تم اعتماد الحركة المخزنية', 'Stock movement recorded'), 'ok');
    await loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ======================== OWNER GOVERNANCE & SETTINGS CONSOLE ========================
const MODULES_LIST = ['patients', 'appointments', 'clinical', 'billing', 'lab', 'inventory', 'reports', 'governance'];
const ACTIONS_LIST = ['view', 'create', 'edit', 'approve', 'cancel', 'export'];

function populateSettingsForm() {
  const s = settingsState.settings;
  if (!s) return;
  const setVal = (id, v) => {
    const n = document.getElementById(id);
    if (n) n.value = String(v);
  };
  setVal('set-dayStart', s.schedule.dayStart);
  setVal('set-dayEnd', s.schedule.dayEnd);
  setVal('set-closedWeekdays', s.schedule.closedWeekdays.join(','));
  setVal('set-chairsCount', s.schedule.chairsCount);
  setVal('set-defaultSlotMinutes', s.schedule.defaultSlotMinutes);
  setVal('set-defaultCurrency', s.finance.defaultCurrency);
  setVal('set-sarYerNum', s.finance.fxRates.SAR_TO_YER.numerator);
  setVal('set-sarYerDen', s.finance.fxRates.SAR_TO_YER.denominator);
  setVal('set-usdYerNum', s.finance.fxRates.USD_TO_YER.numerator);
  setVal('set-usdYerDen', s.finance.fxRates.USD_TO_YER.denominator);
  setVal('set-externalPrivacyMode', s.lab.externalPrivacyMode);
  setVal('set-defaultTurnaroundDays', s.lab.defaultTurnaroundDays);
  setVal('set-lowStockDefaultThreshold', s.inventory.lowStockDefaultThreshold);
  setVal('set-requireVisitOnDispense', String(s.inventory.requireVisitOnDispense));
  setVal('set-watermarkOpacity', s.print.watermarkOpacity);
  setVal('set-outboxEnabled', String(s.comms.outboxEnabled));
  setVal('set-clinicPhone', s.print.clinicPhone);
}

async function loadGovernanceConsole() {
  populateSettingsForm();
  try {
    const res = await api('/api/v1/admin/overview');
    staffCache = res.staff || [];
    settingsState = { version: res.settings.version, settings: res.settings.settings };
    populateSettingsForm();

    const staffTbody = document.getElementById('staff-tbody');
    if (staffTbody) {
      staffTbody.replaceChildren();
      for (const st of staffCache) {
        staffTbody.appendChild(
          el(
            'tr',
            {
              className: `clickable-row ${st.userId === selectedStaffUserId ? 'selected-row' : ''}`,
              onClick: () => {
                selectedStaffUserId = st.userId;
                renderStaffEditor(st);
                loadGovernanceConsole();
              },
            },
            el('td', {}, `${st.displayName} (@${st.username})${st.isPrimaryOwner ? ' 👑' : ''}`),
            el('td', {}, st.role),
            el('td', {}, st.doctorPatientScope),
            el('td', {}, st.isActive ? el('span', { className: 'badge badge-ok' }, t('نشط', 'Active')) : el('span', { className: 'badge badge-danger' }, t('موقوف', 'Disabled'))),
          ),
        );
      }
    }

    if (!selectedStaffUserId && staffCache[0]) {
      selectedStaffUserId = staffCache[0].userId;
      renderStaffEditor(staffCache[0]);
    } else if (selectedStaffUserId) {
      const found = staffCache.find((x) => x.userId === selectedStaffUserId);
      if (found) renderStaffEditor(found);
    }

    // Outbox
    const obxTbody = document.getElementById('outbox-tbody');
    if (obxTbody) {
      obxTbody.replaceChildren();
      for (const m of res.outbox || []) {
        obxTbody.appendChild(
          el('tr', {}, el('td', {}, m.templateKey), el('td', {}, m.channel), el('td', {}, el('span', { className: `badge ${m.status === 'SUPPRESSED' ? 'badge-warn' : 'badge-ok'}` }, m.status))),
        );
      }
    }

    // Audit
    const audTbody = document.getElementById('audit-tbody');
    if (audTbody) {
      audTbody.replaceChildren();
      for (const a of res.audit || []) {
        audTbody.appendChild(
          el('tr', {}, el('td', {}, el('bdi', { dir: 'ltr' }, a.recordedAt.slice(0, 19).replace('T', ' '))), el('td', {}, a.actorDisplayName), el('td', {}, a.action), el('td', {}, a.reason)),
        );
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStaffEditor(st) {
  const pane = document.getElementById('staff-editor-pane');
  if (!pane) return;
  pane.replaceChildren();

  const form = el(
    'form',
    {
      onSubmit: async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const hiddenModules = [];
        const permissions = {};
        for (const mod of MODULES_LIST) {
          if (fd.get(`hide_${mod}`) === 'on') hiddenModules.push(mod);
          permissions[mod] = {};
          for (const act of ACTIONS_LIST) {
            permissions[mod][act] = fd.get(`perm_${mod}_${act}`) === 'on';
          }
        }
        try {
          await api(`/api/v1/admin/staff/${encodeURIComponent(st.userId)}`, {
            method: 'PATCH',
            body: {
              expectedVersion: st.version,
              role: fd.get('role'),
              isActive: fd.get('isActive') === 'on',
              doctorPatientScope: fd.get('doctorPatientScope'),
              hiddenModules,
              permissions,
              reason: fd.get('reason'),
            },
          });
          showToast(t('تم تحديث الصلاحيات فوراً على الجلسات الحية وتوثيق السجل', 'Authority updated live & audited'), 'ok');
          await loadGovernanceConsole();
        } catch (err) {
          showToast(err.message, 'error');
        }
      },
    },
    el(
      'div',
      { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' },
      el('h3', { style: 'margin:0;' }, `${st.displayName} (@${st.username})`),
      st.isPrimaryOwner
        ? el('span', { className: 'badge badge-warn' }, t('حساب المالك الأساسي — محمي من الإقفال', 'Primary Owner — Lockout Protected'))
        : null,
    ),
    el(
      'div',
      { className: 'form-grid' },
      el(
        'div',
        { className: 'field' },
        el('label', {}, t('الدور', 'Role')),
        el(
          'select',
          { name: 'role' },
          ...['OWNER', 'MANAGER', 'DOCTOR', 'RECEPTION', 'CASHIER', 'ASSISTANT'].map((r) =>
            el('option', { value: r, selected: st.role === r }, r),
          ),
        ),
      ),
      el(
        'div',
        { className: 'field' },
        el('label', {}, t('نطاق الطبيب', 'Doctor Scope')),
        el(
          'select',
          { name: 'doctorPatientScope' },
          el('option', { value: 'own', selected: st.doctorPatientScope === 'own' }, t('مرضاه فقط (own)', 'Own Patients (own)')),
          el('option', { value: 'authorized', selected: st.doctorPatientScope === 'authorized' }, t('المرضى المصرح لهم (authorized)', 'Authorized Patients (authorized)')),
        ),
      ),
      el(
        'div',
        { className: 'field', style: 'justify-content:center;' },
        el(
          'label',
          {},
          el('input', { type: 'checkbox', name: 'isActive', checked: st.isActive }),
          ` ${t('الحساب نشط', 'Account Active')}`,
        ),
      ),
    ),
    el(
      'div',
      { className: 'table-wrap', style: 'margin: 10px 0;' },
      el(
        'table',
        { className: 'ui-table perm-matrix-table' },
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            el('th', {}, t('الوحدة', 'Module')),
            el('th', {}, t('إخفاء خادمي', 'Hide (403)')),
            el('th', {}, t('عرض', 'View')),
            el('th', {}, t('إضافة', 'Create')),
            el('th', {}, t('تعديل', 'Edit')),
            el('th', {}, t('اعتماد', 'Approve')),
            el('th', {}, t('إلغاء', 'Cancel')),
            el('th', {}, t('تصدير', 'Export')),
          ),
        ),
        el(
          'tbody',
          {},
          ...MODULES_LIST.map((mod) =>
            el(
              'tr',
              {},
              el('td', {}, mod),
              el('td', {}, el('input', { type: 'checkbox', name: `hide_${mod}`, checked: st.hiddenModules.includes(mod) })),
              ...ACTIONS_LIST.map((act) =>
                el('td', {}, el('input', { type: 'checkbox', name: `perm_${mod}_${act}`, checked: Boolean(st.permissions?.[mod]?.[act]) })),
              ),
            ),
          ),
        ),
      ),
    ),
    el(
      'div',
      { className: 'field', style: 'margin-bottom:10px;' },
      el('label', {}, t('سبب التعديل الحساس (إلزامي لسجل التدقيق)', 'Mandatory Audit Reason')),
      el('input', { name: 'reason', required: true, value: t('تحديث مصفوفة الصلاحيات ونطاق الوصول', 'Update RBAC matrix and scope') }),
    ),
    el('button', { type: 'submit', className: 'btn btn-accent' }, t('حفظ الصلاحيات وتطبيقها فوراً بدون إعادة دخول', 'Apply Permissions Live')),
  );

  pane.appendChild(form);
}

document.getElementById('form-create-staff')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  try {
    await api('/api/v1/admin/staff', {
      method: 'POST',
      body: {
        username: fd.get('username'),
        displayName: fd.get('displayName'),
        password: fd.get('password'),
        role: fd.get('role'),
        doctorPatientScope: fd.get('doctorPatientScope'),
        reason: fd.get('reason'),
      },
    });
    ev.target.reset();
    showToast(t('تم إنشاء حساب الموظف بنجاح', 'Staff account created'), 'ok');
    await loadDoctorsDirectory();
    await loadGovernanceConsole();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('form-clinic-settings')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const closedWeekdays = String(fd.get('closedWeekdays') || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
    .map(Number);

  const cur = settingsState.settings;
  const nextSettings = {
    schedule: {
      timezone: cur.schedule.timezone,
      dayStart: fd.get('dayStart'),
      dayEnd: fd.get('dayEnd'),
      closedWeekdays,
      chairsCount: Number(fd.get('chairsCount')),
      defaultSlotMinutes: Number(fd.get('defaultSlotMinutes')),
    },
    finance: {
      defaultCurrency: fd.get('defaultCurrency'),
      fxRates: {
        SAR_TO_YER: { numerator: String(fd.get('sarYerNum')), denominator: String(fd.get('sarYerDen')) },
        USD_TO_YER: { numerator: String(fd.get('usdYerNum')), denominator: String(fd.get('usdYerDen')) },
        USD_TO_SAR: cur.finance.fxRates.USD_TO_SAR,
      },
    },
    lab: {
      defaultTurnaroundDays: Number(fd.get('defaultTurnaroundDays')),
      externalPrivacyMode: fd.get('externalPrivacyMode'),
    },
    inventory: {
      lowStockDefaultThreshold: Number(fd.get('lowStockDefaultThreshold')),
      requireVisitOnDispense: fd.get('requireVisitOnDispense') === 'true',
    },
    print: {
      ...cur.print,
      clinicPhone: fd.get('clinicPhone'),
      watermarkOpacity: Number(fd.get('watermarkOpacity')),
    },
    comms: {
      outboxEnabled: fd.get('outboxEnabled') === 'true',
      defaultChannel: cur.comms.defaultChannel,
    },
  };

  try {
    const res = await api('/api/v1/admin/settings', {
      method: 'PATCH',
      body: {
        expectedVersion: settingsState.version,
        settings: nextSettings,
        reason: fd.get('reason'),
      },
    });
    settingsState = res;
    showToast(t('تم اعتماد الإعدادات التشغيلية وتفعيلها في الوحدات فوراً', 'Operational settings updated & active'), 'ok');
    await loadGovernanceConsole();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Boot
await loadDoctorsDirectory();
switchSection(activeSection);
