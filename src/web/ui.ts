import type {
  AuthenticatedActor,
  ClinicOperationalSettings,
} from '../modules/governance/index.ts';
import { bdiLtr, html, trustedHtml } from './html.ts';

export function renderLoginPage(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  clinicTitleAr: string;
  clinicTitleEn: string;
}): string {
  const isAr = params.lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const altLang = isAr ? 'en' : 'ar';

  return html`<!DOCTYPE html>
<html lang="${params.lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${isAr ? params.clinicTitleAr : params.clinicTitleEn} — ${isAr ? 'تسجيل الدخول' : 'Sign In'}</title>
  <link rel="icon" href="/public/favicon.png" />
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <main class="login-shell">
    <section class="login-card">
      <div class="login-brand">
        <img src="/public/logo.png" alt="Aqlan Dental Center" />
        <h1>${isAr ? params.clinicTitleAr : params.clinicTitleEn}</h1>
        <p>${isAr ? 'نظام الإدارة السريرية والمالية المتكامل — نسخة معزولة' : 'Integrated Clinical & Financial System'}</p>
      </div>

      <div id="login-error" class="toast-banner error" role="alert"></div>

      <form id="login-form">
        <div class="field" style="margin-bottom: 12px;">
          <label for="username">${isAr ? 'اسم المستخدم' : 'Username'}</label>
          <input id="username" name="username" type="text" autocomplete="username" dir="ltr" required />
        </div>
        <div class="field" style="margin-bottom: 16px;">
          <label for="password">${isAr ? 'كلمة المرور' : 'Password'}</label>
          <input id="password" name="password" type="password" autocomplete="current-password" dir="ltr" required />
        </div>
        <button type="submit" class="btn btn-accent" style="width: 100%; padding: 10px;">
          ${isAr ? 'تسجيل الدخول للنظام' : 'Sign In'}
        </button>
      </form>

      <div style="margin-top: 16px; text-align: center; font-size: 12px;">
        <a href="/login?lang=${altLang}" style="color: #1a3a5c; font-weight: 700; text-decoration: none;">
          ${isAr ? 'Switch to English (LTR)' : 'التبديل إلى العربية (RTL)'}
        </a>
      </div>
    </section>
  </main>

  <script nonce="${params.cspNonce}">
    const form = document.getElementById('login-form');
    const errBox = document.getElementById('login-error');
    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errBox.classList.remove('visible');
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const res = await fetch('/api/v1/auth/login?lang=${params.lang}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        errBox.textContent = payload.message || 'Authentication failed';
        errBox.classList.add('visible');
        return;
      }
      window.location.href = '/?lang=${params.lang}';
    });
  </script>
</body>
</html>`.__html;
}

export function renderWorkspaceApp(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  initialSection: 'patients' | 'appointments' | 'inventory' | 'governance';
  actor: AuthenticatedActor;
  settings: ClinicOperationalSettings;
  settingsVersion: number;
  clinicToday: string;
}): string {
  const { lang, actor, settings } = params;
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const altLang = isAr ? 'en' : 'ar';

  const canSee = (mod: 'patients' | 'appointments' | 'inventory' | 'governance') =>
    !actor.hiddenModules.includes(mod) && Boolean(actor.permissions[mod]?.view);

  const bootStateJson = JSON.stringify({
    lang,
    csrfToken: actor.csrfToken,
    clinicToday: params.clinicToday,
    initialSection: params.initialSection,
    actor: {
      userId: actor.userId,
      username: actor.username,
      displayName: actor.displayName,
      role: actor.role,
      isPrimaryOwner: actor.isPrimaryOwner,
      doctorPatientScope: actor.doctorPatientScope,
      hiddenModules: actor.hiddenModules,
      permissions: actor.permissions,
    },
    settingsVersion: params.settingsVersion,
    settings,
  }).replace(/</g, '\\u003c');

  return html`<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${isAr ? settings.print.clinicTitleAr : settings.print.clinicTitleEn}</title>
  <link rel="icon" href="/public/favicon.png" />
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <header class="app-topbar">
    <div class="brand-cluster">
      <img src="/public/logo-white.png" alt="Logo" />
      <div>
        <p class="brand-title">${isAr ? settings.print.clinicTitleAr : settings.print.clinicTitleEn}</p>
        <p class="brand-sub">${isAr ? 'التاريخ التشغيلي:' : 'Clinic Date:'} ${bdiLtr(params.clinicToday)} · ${bdiLtr(settings.schedule.timezone)}</p>
      </div>
    </div>

    <nav class="nav-tabs" id="main-nav">
      ${
        canSee('patients')
          ? html`<button type="button" class="nav-tab" data-section="patients">${isAr ? 'المرضى والملف السريري والمالي' : 'Patients, Clinical & Billing'}</button>`
          : html``
      }
      ${
        canSee('appointments')
          ? html`<button type="button" class="nav-tab" data-section="appointments">${isAr ? 'المواعيد وطابور الانتظار' : 'Appointments & Queue'}</button>`
          : html``
      }
      ${
        canSee('inventory')
          ? html`<button type="button" class="nav-tab" data-section="inventory">${isAr ? 'المخزون العيادي' : 'Clinic Inventory'}</button>`
          : html``
      }
      ${
        canSee('governance')
          ? html`<button type="button" class="nav-tab" data-section="governance">${isAr ? 'لوحة المالك والحوكمة والإعدادات' : 'Owner Governance & Settings'}</button>`
          : html``
      }
    </nav>

    <div class="user-cluster">
      <span>${actor.displayName}</span>
      <span class="role-pill">${bdiLtr(actor.role)}${actor.role === 'DOCTOR' ? bdiLtr(` · ${actor.doctorPatientScope}`) : ''}</span>
      <a class="nav-tab" href="${params.initialSection === 'governance' ? '/admin' : '/'}?lang=${altLang}">
        ${isAr ? 'English' : 'العربية'}
      </a>
      <button type="button" id="btn-logout" class="btn btn-danger btn-sm">
        ${isAr ? 'خروج' : 'Sign Out'}
      </button>
    </div>
  </header>

  <main class="app-main">
    <div id="global-toast" class="toast-banner" role="status"></div>

    <!-- 1. PATIENTS, UNIFIED FDI CHART, VISITS, BILLING & INSTALLMENTS -->
    <section id="sec-patients" class="workspace-section">
      <div class="split-grid">
        <div>
          <div class="panel">
            <div class="panel-header">
              <h2>${isAr ? 'سجل المرضى والبحث السريع' : 'Patient Directory & Search'}</h2>
            </div>
            <div class="field" style="margin-bottom: 10px;">
              <input id="patient-search-input" type="search" placeholder="${isAr ? 'ابحث بالاسم، الهاتف، أو رقم الملف (7000+)...' : 'Search name, phone, or file # (7000+)...'}" />
            </div>
            <div class="table-wrap" style="max-height: 310px; overflow-y: auto;">
              <table class="ui-table">
                <thead>
                  <tr>
                    <th>${isAr ? 'الملف' : 'File #'}</th>
                    <th>${isAr ? 'الاسم' : 'Name'}</th>
                    <th>${isAr ? 'تنبيه' : 'Alert'}</th>
                  </tr>
                </thead>
                <tbody id="patients-tbody"></tbody>
              </table>
            </div>
          </div>

          <div class="panel" id="new-patient-panel">
            <div class="panel-header">
              <h3>${isAr ? 'فتح ملف مريض جديد (ترقيم ذري ≥ 7000)' : 'New Patient Registration (Atomic >= 7000)'}</h3>
            </div>
            <form id="form-create-patient">
              <div class="form-grid">
                <div class="field">
                  <label>${isAr ? 'الاسم الرباعي' : 'Full Name'}</label>
                  <input name="fullName" required />
                </div>
                <div class="field">
                  <label>${isAr ? 'رقم الهاتف' : 'Phone'}</label>
                  <input name="phone" dir="ltr" placeholder="770000000" required />
                </div>
                <div class="field">
                  <label>${isAr ? 'الجنس' : 'Sex'}</label>
                  <select name="sex">
                    <option value="MALE">${isAr ? 'ذكر' : 'Male'}</option>
                    <option value="FEMALE">${isAr ? 'أنثى' : 'Female'}</option>
                  </select>
                </div>
                <div class="field">
                  <label>${isAr ? 'الطبيب الأساسي' : 'Primary Doctor'}</label>
                  <select name="primaryDoctorUserId" id="select-patient-doctor"></select>
                </div>
                <div class="field">
                  <label>${isAr ? 'الحساسيات الدوائية (مفصولة بفاصلة)' : 'Drug Allergies (comma-sep)'}</label>
                  <input name="allergies" placeholder="${isAr ? 'مثال: Penicillin' : 'e.g. Penicillin'}" />
                </div>
                <div class="field">
                  <label>${isAr ? 'ملاحظات طبية حرجة' : 'Critical Medical Notes'}</label>
                  <input name="criticalNotes" />
                </div>
              </div>
              <div style="display:flex; gap:14px; margin-bottom:10px; font-size:12px;">
                <label><input type="checkbox" name="takesAnticoagulants" /> ${isAr ? 'يتناول مميعات دم' : 'Anticoagulants'}</label>
                <label><input type="checkbox" name="isPregnant" /> ${isAr ? 'حامل' : 'Pregnant'}</label>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">${isAr ? 'إنشاء ملف المريض' : 'Register Patient'}</button>
            </form>
          </div>
        </div>

        <div id="patient-detail-pane">
          <div class="panel">
            <p class="empty-hint">${isAr ? 'اختر مريضاً من القائمة لعرض المخطط السني الموحد والزيارات والفواتير وجدول الأقساط.' : 'Select a patient from the directory to open clinical chart, visits, invoices, and installments.'}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. APPOINTMENTS & WAITING QUEUE -->
    <section id="sec-appointments" class="workspace-section">
      <div class="panel">
        <div class="panel-header">
          <h2>${isAr ? 'جدول المواعيد وطابور الكراسي اليومي' : 'Daily Appointments & Chair Queue'}</h2>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="badge badge-navy" id="schedule-hours-badge"></span>
            <input type="date" id="appt-filter-date" dir="ltr" value="${params.clinicToday}" />
          </div>
        </div>

        <form id="form-create-appointment" style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">
          <div class="form-grid">
            <div class="field">
              <label>${isAr ? 'المريض' : 'Patient'}</label>
              <select name="patientId" id="appt-patient-select" required></select>
            </div>
            <div class="field">
              <label>${isAr ? 'الطبيب' : 'Doctor'}</label>
              <select name="doctorUserId" id="appt-doctor-select" required></select>
            </div>
            <div class="field">
              <label>${isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" name="appointmentDate" dir="ltr" value="${params.clinicToday}" required />
            </div>
            <div class="field">
              <label>${isAr ? 'وقت البدء' : 'Start Time'}</label>
              <input type="time" name="startTime" dir="ltr" value="09:30" required />
            </div>
            <div class="field">
              <label>${isAr ? 'رقم الكرسي' : 'Chair #'}</label>
              <input type="number" name="chairNo" min="1" max="20" value="1" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'نوع الموعد' : 'Visit Type'}</label>
              <select name="kind">
                <option value="CONSULTATION">${isAr ? 'استشارة وفحص' : 'Consultation'}</option>
                <option value="TREATMENT">${isAr ? 'جلسة علاجية' : 'Treatment'}</option>
                <option value="FOLLOW_UP">${isAr ? 'مراجعة / تقويم' : 'Follow-Up'}</option>
                <option value="EMERGENCY">${isAr ? 'طوارئ' : 'Emergency'}</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">${isAr ? 'حجز الموعد في الطابور' : 'Book Appointment'}</button>
        </form>

        <div class="table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>${isAr ? 'الوقت' : 'Time'}</th>
                <th>${isAr ? 'الكرسي' : 'Chair'}</th>
                <th>${isAr ? 'المريض' : 'Patient'}</th>
                <th>${isAr ? 'الطبيب' : 'Doctor'}</th>
                <th>${isAr ? 'النوع' : 'Kind'}</th>
                <th>${isAr ? 'الحالة' : 'Status'}</th>
                <th>${isAr ? 'إجراءات الطابور' : 'Queue Actions'}</th>
              </tr>
            </thead>
            <tbody id="appointments-tbody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 3. INVENTORY -->
    <section id="sec-inventory" class="workspace-section">
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>${isAr ? 'تعريف صنف مخزني جديد' : 'New Inventory SKU'}</h3>
          </div>
          <form id="form-create-item">
            <div class="form-grid">
              <div class="field">
                <label>SKU</label>
                <input name="sku" dir="ltr" placeholder="COMP-A2" required />
              </div>
              <div class="field">
                <label>${isAr ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                <input name="nameAr" placeholder="حشوة تجميلية A2" required />
              </div>
              <div class="field">
                <label>${isAr ? 'الاسم بالإنجليزية' : 'English Name'}</label>
                <input name="nameEn" placeholder="Composite Syringe A2" required />
              </div>
              <div class="field">
                <label>${isAr ? 'وحدة القياس (تُقفل بعد أول حركة)' : 'UoM (locks after movement)'}</label>
                <input name="unitOfMeasure" placeholder="SYRINGE" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary">${isAr ? 'إضافة الصنف' : 'Create SKU'}</button>
          </form>

          <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;" />

          <div class="panel-header">
            <h3>${isAr ? 'تسجيل حركة توريد / صرف عيادي' : 'Stock Movement'}</h3>
          </div>
          <form id="form-stock-movement">
            <div class="form-grid">
              <div class="field">
                <label>${isAr ? 'الصنف' : 'Item'}</label>
                <select name="itemId" id="inv-item-select" required></select>
              </div>
              <div class="field">
                <label>${isAr ? 'نوع الحركة' : 'Movement Kind'}</label>
                <select name="kind">
                  <option value="STOCK_IN">${isAr ? 'توريد للمخزن (+)' : 'Stock In (+)'}</option>
                  <option value="VISIT_DISPENSE">${isAr ? 'صرف لزيارة سريرية (-)' : 'Visit Dispense (-)'}</option>
                  <option value="RETURN_IN">${isAr ? 'مرتجع للمخزن (+)' : 'Return In (+)'}</option>
                </select>
              </div>
              <div class="field">
                <label>${isAr ? 'الكمية' : 'Quantity'}</label>
                <input type="number" name="quantity" min="1" value="5" dir="ltr" required />
              </div>
              <div class="field">
                <label>${isAr ? 'معرّف الزيارة (عند الصرف)' : 'Visit ID (if dispensing)'}</label>
                <input name="visitId" dir="ltr" placeholder="vis-..." />
              </div>
              <div class="field">
                <label>${isAr ? 'السبب / المرجع' : 'Reason'}</label>
                <input name="reason" required placeholder="${isAr ? 'توريد فاتورة مورد / صرف جلسة' : 'Supplier batch / chair dispense'}" />
              </div>
            </div>
            <button type="submit" class="btn btn-accent">${isAr ? 'اعتماد الحركة المخزنية' : 'Record Movement'}</button>
          </form>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>${isAr ? 'أرصدة المخزون وتنبيهات الحد الأدنى' : 'Inventory Balances & Low-Stock Alerts'}</h2>
          </div>
          <div class="table-wrap">
            <table class="ui-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>${isAr ? 'الصنف' : 'Item'}</th>
                  <th>${isAr ? 'الوحدة' : 'UoM'}</th>
                  <th>${isAr ? 'الرصيد' : 'Stock'}</th>
                  <th>${isAr ? 'حد التنبيه' : 'Alert At'}</th>
                  <th>${isAr ? 'الحالة' : 'State'}</th>
                </tr>
              </thead>
              <tbody id="inventory-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. UNIFIED OWNER ADMIN & GOVERNANCE CONSOLE -->
    <section id="sec-governance" class="workspace-section">
      <div class="panel">
        <div class="panel-header">
          <h2>${isAr ? 'لوحة إدارة المالك الموحدة — الموظفون والأدوار والصلاحيات ونطاق الطبيب' : 'Unified Owner Governance Console — Staff, Roles, Scope & Module Visibility'}</h2>
          <a href="/api/v1/admin/backup" class="btn btn-outline btn-sm" target="_blank">${isAr ? 'تصدير نسخة احتياطية متسقة (JSON)' : 'Export Consistent Backup'}</a>
        </div>

        <div class="split-grid">
          <div>
            <h3 style="margin-top:0; font-size:14px;">${isAr ? 'قائمة الموظفين' : 'Staff Accounts'}</h3>
            <div class="table-wrap" style="margin-bottom:16px;">
              <table class="ui-table">
                <thead>
                  <tr>
                    <th>${isAr ? 'الموظف' : 'Staff'}</th>
                    <th>${isAr ? 'الدور' : 'Role'}</th>
                    <th>${isAr ? 'النطاق' : 'Scope'}</th>
                    <th>${isAr ? 'الحالة' : 'State'}</th>
                  </tr>
                </thead>
                <tbody id="staff-tbody"></tbody>
              </table>
            </div>

            <h3 style="font-size:14px;">${isAr ? 'إضافة موظف / طبيب جديد' : 'Create Staff Account'}</h3>
            <form id="form-create-staff">
              <div class="form-grid">
                <div class="field">
                  <label>${isAr ? 'اسم الدخول' : 'Username'}</label>
                  <input name="username" dir="ltr" placeholder="dr.ahmed" required />
                </div>
                <div class="field">
                  <label>${isAr ? 'الاسم الظاهر' : 'Display Name'}</label>
                  <input name="displayName" placeholder="د. أحمد" required />
                </div>
                <div class="field">
                  <label>${isAr ? 'كلمة المرور' : 'Password'}</label>
                  <input name="password" type="password" dir="ltr" placeholder="Min 8 chars" required />
                </div>
                <div class="field">
                  <label>${isAr ? 'الدور الوظيفي' : 'Role'}</label>
                  <select name="role">
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="RECEPTION">RECEPTION</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="ASSISTANT">ASSISTANT</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
                <div class="field">
                  <label>${isAr ? 'نطاق الطبيب' : 'Doctor Patient Scope'}</label>
                  <select name="doctorPatientScope">
                    <option value="own">${isAr ? 'مرضاه فقط (own)' : 'Own Patients Only (own)'}</option>
                    <option value="authorized">${isAr ? 'المرضى المصرح لهم (authorized)' : 'Authorized Patients (authorized)'}</option>
                  </select>
                </div>
                <div class="field">
                  <label>${isAr ? 'سبب الإنشاء (للتدقيق)' : 'Audit Reason'}</label>
                  <input name="reason" required value="${isAr ? 'تعيين موظف جديد' : 'New staff onboarding'}" />
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">${isAr ? 'إنشاء الحساب وتفعيل الصلاحيات' : 'Create Staff User'}</button>
            </form>
          </div>

          <div id="staff-editor-pane">
            <p class="empty-hint">${isAr ? 'اختر موظفاً من الجدول لتعديل صلاحيات (العرض / الإضافة / التعديل / الاعتماد / الإلغاء / التصدير)، وإخفاء الوحدات خادمياً، ونطاق الطبيب.' : 'Select a staff member to edit granular permissions, server-enforced module visibility, and doctor scope.'}</p>
          </div>
        </div>
      </div>

      <!-- LIVE OPERATIONAL SETTINGS -->
      <div class="panel">
        <div class="panel-header">
          <h2>${isAr ? 'الإعدادات التشغيلية الحية (مرتبطة فعلياً بالدوام والمواعيد والعملات والمعامل والمخزون والطباعة والتواصل)' : 'Live Operational Settings (Wired to Active Runtime Modules)'}</h2>
          <span class="badge badge-ok">${isAr ? 'سلامة القيود ومنع الرصيد السالب محمية ولا يمكن تعطيلها' : 'Ledger & Stock Safety Non-Bypassable'}</span>
        </div>
        <form id="form-clinic-settings">
          <div class="form-grid">
            <div class="field">
              <label>${isAr ? 'بداية الدوام' : 'Day Start (HH:MM)'}</label>
              <input name="dayStart" id="set-dayStart" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'نهاية الدوام' : 'Day End (HH:MM)'}</label>
              <input name="dayEnd" id="set-dayEnd" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'أيام الإغلاق الأسبوعية (0=الأحد .. 5=الجمعة)' : 'Closed Weekdays (0=Sun..5=Fri)'}</label>
              <input name="closedWeekdays" id="set-closedWeekdays" dir="ltr" placeholder="5" />
            </div>
            <div class="field">
              <label>${isAr ? 'عدد الكراسي الفعالة' : 'Active Dental Chairs'}</label>
              <input type="number" name="chairsCount" id="set-chairsCount" min="1" max="20" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'مدة الموعد الافتراضية (دقيقة)' : 'Default Slot (min)'}</label>
              <input type="number" name="defaultSlotMinutes" id="set-defaultSlotMinutes" min="10" max="180" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'العملة الافتراضية' : 'Default Currency'}</label>
              <select name="defaultCurrency" id="set-defaultCurrency">
                <option value="YER">YER</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div class="field">
              <label>${isAr ? 'سعر صرف SAR → YER (بسط / مقام)' : 'FX SAR -> YER (num/den)'}</label>
              <div style="display:flex; gap:4px;">
                <input name="sarYerNum" id="set-sarYerNum" dir="ltr" required />
                <input name="sarYerDen" id="set-sarYerDen" dir="ltr" required />
              </div>
            </div>
            <div class="field">
              <label>${isAr ? 'سعر صرف USD → YER (بسط / مقام)' : 'FX USD -> YER (num/den)'}</label>
              <div style="display:flex; gap:4px;">
                <input name="usdYerNum" id="set-usdYerNum" dir="ltr" required />
                <input name="usdYerDen" id="set-usdYerDen" dir="ltr" required />
              </div>
            </div>
            <div class="field">
              <label>${isAr ? 'خصوصية أوامر المعمل الخارجي' : 'External Lab Privacy'}</label>
              <select name="externalPrivacyMode" id="set-externalPrivacyMode">
                <option value="CODE_ONLY">${isAr ? 'رمز الملف فقط (CODE_ONLY)' : 'Code Only (P-7000)'}</option>
                <option value="FULL_NAME">${isAr ? 'الاسم الكامل (FULL_NAME)' : 'Full Patient Name'}</option>
              </select>
            </div>
            <div class="field">
              <label>${isAr ? 'أيام تسليم المعمل الافتراضية' : 'Default Lab Turnaround (days)'}</label>
              <input type="number" name="defaultTurnaroundDays" id="set-defaultTurnaroundDays" min="1" max="60" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'حد تنبيه المخزون الافتراضي' : 'Default Low-Stock Threshold'}</label>
              <input type="number" name="lowStockDefaultThreshold" id="set-lowStockDefaultThreshold" min="0" max="1000" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'إلزام ربط الصرف المخزني بزيارة' : 'Require Visit on Dispense'}</label>
              <select name="requireVisitOnDispense" id="set-requireVisitOnDispense">
                <option value="true">${isAr ? 'مفعل (إلزامي)' : 'Required (true)'}</option>
                <option value="false">${isAr ? 'غير إلزامي' : 'Optional (false)'}</option>
              </select>
            </div>
            <div class="field">
              <label>${isAr ? 'شفافية العلامة المائية للمطبوعات (0.05 - 0.45)' : 'Print Watermark Opacity'}</label>
              <input type="number" step="0.01" min="0.05" max="0.45" name="watermarkOpacity" id="set-watermarkOpacity" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'صندوق رسائل التواصل (Outbox)' : 'Transactional Outbox'}</label>
              <select name="outboxEnabled" id="set-outboxEnabled">
                <option value="true">${isAr ? 'مفعل (محاكاة آمنة)' : 'Enabled (Simulated)'}</option>
                <option value="false">${isAr ? 'موقوف (SUPPRESSED)' : 'Suppressed'}</option>
              </select>
            </div>
            <div class="field">
              <label>${isAr ? 'هاتف الترويسة الرسمية' : 'Print Header Phone'}</label>
              <input name="clinicPhone" id="set-clinicPhone" dir="ltr" required />
            </div>
            <div class="field">
              <label>${isAr ? 'سبب تعديل الإعدادات (إلزامي للتدقيق)' : 'Audit Reason'}</label>
              <input name="reason" id="set-reason" required placeholder="${isAr ? 'تحديث ساعات الدوام / السياسة التشغيلية' : 'Operational policy update'}" />
            </div>
          </div>
          <button type="submit" class="btn btn-accent">${isAr ? 'حفظ وتطبيق الإعدادات فوراً' : 'Save & Apply Settings Immediately'}</button>
        </form>
      </div>

      <!-- AUDIT TRAIL & OUTBOX -->
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>${isAr ? 'صندوق رسائل التواصل (Transactional Outbox)' : 'Simulated Outbox Queue'}</h3>
          </div>
          <div class="table-wrap" style="max-height: 260px; overflow-y: auto;">
            <table class="ui-table">
              <thead>
                <tr>
                  <th>${isAr ? 'القالب' : 'Template'}</th>
                  <th>${isAr ? 'القناة' : 'Channel'}</th>
                  <th>${isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody id="outbox-tbody"></tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>${isAr ? 'سجل التدقيق غير القابل للتعديل (من غيّر ماذا ومتى ولماذا)' : 'Append-Only Governance & Financial Audit Log'}</h3>
          </div>
          <div class="table-wrap" style="max-height: 260px; overflow-y: auto;">
            <table class="ui-table">
              <thead>
                <tr>
                  <th>${isAr ? 'الوقت' : 'When'}</th>
                  <th>${isAr ? 'الفاعل' : 'Who'}</th>
                  <th>${isAr ? 'العملية' : 'Action'}</th>
                  <th>${isAr ? 'السبب' : 'Reason'}</th>
                </tr>
              </thead>
              <tbody id="audit-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script id="boot-state" type="application/json">${trustedHtml(bootStateJson)}</script>
  <script type="module" src="/public/app.js"></script>
</body>
</html>`.__html;
}
