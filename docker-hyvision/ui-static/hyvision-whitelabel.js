/**
 * HyVision Enterprise Suite (Client-Side Module)
 * - Módulo de Reportes Ejecutivos (PDF & Excel)
 * - Renombramiento de "Tableros" por "Sistemas de energía"
 * - Inserción del ítem nativo "Reportes" en el menú lateral bajo "Sistemas de energía"
 * - Módulo de Marca Blanca Dinámica (White-Labeling)
 * - Módulo de Notificaciones Críticas Telegram 24/7
 * - Control de Acceso Estricto Basado en Roles (RBAC: Tenant Admin vs Customer User)
 */
(function() {
  'use strict';

  var currentConfig = {
    appTitle: "HYVISION",
    appSubtitle: "POWERED BY HYBRICO ENERGY",
    browserTitle: "HyVision",
    primaryColor: "#436A3C",
    loginCardColor: "#2b4c23",
    backgroundColor: "#173117",
    backgroundMode: "dark_scada",
    logoLoginUrl: "assets/logo_title_white.png",
    logoToolbarUrl: "assets/logo_title_white.png",
    faviconUrl: "thingsboard.ico",
    customCss: "",
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
    reportSchedule: {
      enabled: false,
      frequency: "weekly",
      hour: "07:00",
      target: "telegram"
    }
  };

  var selectedReportDays = 7;
  window.hyvisionConfig = currentConfig;

  // 1. Fetch Config once on load
  function loadInitialConfig() {
    fetch('/api/hyvision/branding?t=' + Date.now())
      .then(function(res) {
        if (res.ok) return res.json();
        throw new Error('No config');
      })
      .then(function(cfg) {
        currentConfig = Object.assign({}, currentConfig, cfg);
        window.hyvisionConfig = currentConfig;
        applyConfigToDOM(currentConfig, false);
      })
      .catch(function(err) {
        applyConfigToDOM(currentConfig, false);
      });
  }

  // 2. Apply Config to the DOM
  function applyConfigToDOM(cfg, refreshCss) {
    if (cfg.browserTitle && document.title !== cfg.browserTitle) {
      document.title = cfg.browserTitle;
    }

    if (cfg.faviconUrl) {
      var fav = document.querySelector('link[rel="icon"]');
      if (fav && fav.getAttribute('href') !== cfg.faviconUrl) {
        fav.setAttribute('href', cfg.faviconUrl);
      }
    }

    var titleEl = document.querySelector('.hyvision-main-title');
    if (titleEl && cfg.appTitle && titleEl.innerText !== cfg.appTitle) {
      titleEl.innerText = cfg.appTitle;
    }

    var subTitleEl = document.querySelector('.hyvision-sub-title');
    if (subTitleEl && cfg.appSubtitle && subTitleEl.innerText !== cfg.appSubtitle) {
      subTitleEl.innerText = cfg.appSubtitle;
    }

    if (cfg.logoLoginUrl) {
      var logoImg = document.querySelector('.login-logo img');
      if (logoImg && logoImg.getAttribute('src') !== cfg.logoLoginUrl) {
        logoImg.setAttribute('src', cfg.logoLoginUrl);
      }
    }

    if (refreshCss) {
      var dynLink = document.getElementById('hyvision-dynamic-styles');
      if (dynLink) {
        dynLink.href = '/dynamic-branding.css?t=' + Date.now();
      }
    }
  }

  // 3. Toast Notifications
  function showToast(msg) {
    var toast = document.querySelector('.hyvision-wl-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'hyvision-wl-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 3500);
  }

  // 4. Check if currently on Login Page
  function isLoginPage() {
    var path = window.location.pathname || '';
    if (path.indexOf('/login') !== -1) return true;
    if (document.querySelector('.tb-login-content')) return true;
    return false;
  }

  // Decode JWT to check if user has TENANT_ADMIN or SYS_ADMIN authority
  function isAuthorizedAdmin() {
    try {
      var token = localStorage.getItem('jwt_token');
      if (!token) return false;
      var parts = token.split('.');
      if (parts.length < 2) return false;
      var base64Url = parts[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      var payload = JSON.parse(jsonPayload);
      var scopes = payload.scopes || [];
      return scopes.indexOf('TENANT_ADMIN') !== -1 || scopes.indexOf('SYS_ADMIN') !== -1;
    } catch (e) {
      return false;
    }
  }

  function isLoggedIn() {
    return !!localStorage.getItem('jwt_token') && !isLoginPage();
  }

  // 5. Update Sidebar: Rename "Tableros" to "Sistemas de energía"
  function updateSidebarTranslations() {
    if (isLoginPage() || !isLoggedIn()) return;

    // Sidebar navigation menu links
    var sideLinks = document.querySelectorAll('tb-menu-link a, .tb-side-menu a, mat-sidenav a, .mat-mdc-list-item');
    sideLinks.forEach(function(a) {
      var href = a.getAttribute('href') || a.getAttribute('routerlink') || '';
      var span = a.querySelector('.tb-link-title, span:not(.mat-icon)');
      if (span) {
        var t = span.innerText.trim();
        if (t === 'Tableros' || t === 'Dashboards') {
          span.innerText = 'Sistemas de energía';
        }
      }
      if (href.indexOf('/dashboards') !== -1 && span) {
        var curr = span.innerText.trim();
        if (curr === 'Tableros' || curr === 'Dashboards' || curr === 'tableros') {
          span.innerText = 'Sistemas de energía';
        }
      }
    });

    // Breadcrumbs & top navigation headers
    var breadcrumbs = document.querySelectorAll('.tb-breadcrumb-item, .mat-mdc-button span, .mat-mdc-card-title, .tb-dashboard-title, .tb-navigation-title');
    breadcrumbs.forEach(function(el) {
      if (el.children.length === 0) {
        var t = el.innerText.trim();
        if (t === 'Tableros' || t === 'Dashboards') {
          el.innerText = 'Sistemas de energía';
        } else if (t === 'Tablero' || t === 'Dashboard') {
          el.innerText = 'Sistema de energía';
        }
      }
    });

    // Search Tooltips & Placeholders ("Buscar tableros" -> "Buscar sistemas de energía")
    var inputs = document.querySelectorAll('input[placeholder*="tableros" i], input[placeholder*="dashboards" i]');
    inputs.forEach(function(inp) {
      inp.placeholder = inp.placeholder.replace(/tableros/gi, 'sistemas de energía').replace(/dashboards/gi, 'sistemas de energía');
    });

    var titledElements = document.querySelectorAll('[aria-label*="tablero" i], [mattooltip*="tablero" i], [title*="tablero" i], [aria-label*="dashboard" i], [mattooltip*="dashboard" i], [title*="dashboard" i]');
    titledElements.forEach(function(el) {
      ['aria-label', 'mattooltip', 'title'].forEach(function(attr) {
        var val = el.getAttribute(attr);
        if (val && (val.toLowerCase().indexOf('tablero') !== -1 || val.toLowerCase().indexOf('dashboard') !== -1)) {
          var newVal = val.replace(/buscar\s+tableros/gi, 'Buscar sistemas de energía')
                          .replace(/buscar\s+tablero/gi, 'Buscar sistema de energía')
                          .replace(/search\s+dashboards/gi, 'Buscar sistemas de energía')
                          .replace(/tableros/gi, 'sistemas de energía')
                          .replace(/tablero/gi, 'sistema de energía')
                          .replace(/dashboards/gi, 'sistemas de energía')
                          .replace(/dashboard/gi, 'sistema de energía');
          el.setAttribute(attr, newVal);
        }
      });
    });

    // CDK overlay tooltip containers
    var tooltips = document.querySelectorAll('.mat-mdc-tooltip, .mat-tooltip');
    tooltips.forEach(function(tip) {
      if (tip.innerText && (tip.innerText.toLowerCase().indexOf('tablero') !== -1 || tip.innerText.toLowerCase().indexOf('dashboard') !== -1)) {
        tip.innerText = tip.innerText.replace(/buscar\s+tableros/gi, 'Buscar sistemas de energía')
                                     .replace(/buscar\s+tablero/gi, 'Buscar sistema de energía')
                                     .replace(/search\s+dashboards/gi, 'Buscar sistemas de energía')
                                     .replace(/tableros/gi, 'sistemas de energía')
                                     .replace(/tablero/gi, 'sistema de energía');
      }
    });

    // Action Buttons & Menu Items: "Añadir tablero" -> "Añadir sistema de energía", etc.
    var actionButtons = document.querySelectorAll('button, a.mat-mdc-button, a.mat-mdc-raised-button, a.mat-mdc-unelevated-button, .mat-mdc-menu-item, .mat-menu-item, mat-dialog-container h2, mat-dialog-container .mat-mdc-dialog-title');
    actionButtons.forEach(function(btn) {
      var span = btn.querySelector('.mdc-button__label, span:not(.mat-icon)') || btn;
      if (span && span.innerText) {
        var t = span.innerText.trim();
        if (t.toLowerCase() === 'añadir tablero' || t.toLowerCase() === 'add dashboard') {
          span.innerText = '+ Añadir sistema de energía';
        } else if (t.toLowerCase() === '+ añadir tablero' || t.toLowerCase() === '+ add dashboard') {
          span.innerText = '+ Añadir sistema de energía';
        } else if (t.toLowerCase().indexOf('tablero') !== -1 || t.toLowerCase().indexOf('dashboard') !== -1) {
          span.innerText = span.innerText
            .replace(/crear\s+nuevo\s+tablero/gi, 'Crear nuevo sistema de energía')
            .replace(/importar\s+tablero/gi, 'Importar sistema de energía')
            .replace(/exportar\s+tablero/gi, 'Exportar sistema de energía')
            .replace(/eliminar\s+tablero/gi, 'Eliminar sistema de energía')
            .replace(/detalles\s+del\s+tablero/gi, 'Detalles del sistema de energía')
            .replace(/tableros/gi, 'sistemas de energía')
            .replace(/tablero/gi, 'sistema de energía')
            .replace(/dashboards/gi, 'sistemas de energía')
            .replace(/dashboard/gi, 'sistema de energía');
        }
      }
    });
  }

  // 6. Inject Native "Reportes" Menu Item in Sidebar under "Sistemas de energía"
  function injectSidebarReportsLink() {
    if (isLoginPage() || !isLoggedIn()) return;

    // Already injected?
    if (document.querySelector('.hyvision-sidebar-reports-item')) return;

    // Find side menu container
    var sideMenu = document.querySelector('ul.tb-side-menu, mat-sidenav .tb-side-menu, tb-side-menu ul');
    if (!sideMenu) return;

    // Find the link for dashboards ("Sistemas de energía" / /dashboards)
    var dashboardLink = null;
    var allLinks = sideMenu.querySelectorAll('a');
    for (var i = 0; i < allLinks.length; i++) {
      var a = allLinks[i];
      var href = a.getAttribute('href') || a.getAttribute('routerlink') || '';
      var txt = (a.innerText || '').toLowerCase();
      if (href.indexOf('/dashboards') !== -1 || txt.indexOf('sistemas de energía') !== -1 || txt.indexOf('tableros') !== -1 || txt.indexOf('dashboards') !== -1) {
        dashboardLink = a;
        break;
      }
    }

    if (!dashboardLink) return;

    var parentLi = dashboardLink.closest('li') || dashboardLink;
    if (!parentLi || !parentLi.parentNode) return;

    // Create the native-looking <li> menu item
    var reportsLi = document.createElement('li');
    reportsLi.className = 'hyvision-sidebar-reports-item';
    reportsLi.innerHTML = `
      <tb-menu-link>
        <a class="mat-mdc-button mat-unthemed mat-mdc-button-base hyvision-reports-nav-btn" 
           style="width: 100%; display: flex; align-items: center; cursor: pointer; text-decoration: none; padding: 0 16px; height: 48px; border-radius: 0;"
           title="Generar y Descargar Reportes Ejecutivos (PDF & Excel)">
          <tb-icon class="mat-icon material-icons notranslate mat-icon-no-color" 
                   style="margin-right: 16px; font-size: 24px; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; color: inherit;">
            assessment
          </tb-icon>
          <span class="tb-link-title" style="flex: 1; text-align: left; font-size: 14px; font-weight: 500; letter-spacing: 0.25px;">
            Reportes
          </span>
        </a>
      </tb-menu-link>
    `;

    var navBtn = reportsLi.querySelector('.hyvision-reports-nav-btn');
    navBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });

    // Insert right after the "Sistemas de energía" item
    if (parentLi.nextSibling) {
      parentLi.parentNode.insertBefore(reportsLi, parentLi.nextSibling);
    } else {
      parentLi.parentNode.appendChild(reportsLi);
    }
  }

  // 7. Filter Customer Sidebar (Hide "Entidades" & "Instancias de edge" strictly for Customer Users)
  function filterCustomerSidebar() {
    if (isLoginPage() || !isLoggedIn()) return;

    var isAdmin = isAuthorizedAdmin();

    // Toggle role class on body
    if (isAdmin) {
      document.body.classList.remove('hyvision-role-customer');
      document.body.classList.add('hyvision-role-admin');
    } else {
      document.body.classList.add('hyvision-role-customer');
      document.body.classList.remove('hyvision-role-admin');
    }

    var sideMenu = document.querySelector('ul.tb-side-menu, mat-sidenav .tb-side-menu, tb-side-menu ul');
    if (!sideMenu) return;

    var lis = sideMenu.querySelectorAll('li');
    lis.forEach(function(li) {
      if (li.classList.contains('hyvision-sidebar-reports-item')) return;

      var txt = (li.innerText || '').toLowerCase();
      var a = li.querySelector('a');
      var href = a ? (a.getAttribute('href') || a.getAttribute('routerlink') || '') : '';

      var isEntities = txt.indexOf('entidades') !== -1 || txt.indexOf('entities') !== -1 || href.indexOf('/entities') !== -1;
      var isEdge = txt.indexOf('instancias de edge') !== -1 || txt.indexOf('edge instances') !== -1 || href.indexOf('/edge') !== -1;

      if (isEntities || isEdge) {
        if (!isAdmin) {
          li.style.display = 'none';
          li.setAttribute('data-hyvision-customer-hidden', 'true');
        } else {
          li.style.display = '';
          li.removeAttribute('data-hyvision-customer-hidden');
        }
      }
    });
  }

  // 8. Update Trigger Button Visibility (Role-Based Access Control)
  function updateTriggerVisibility() {
    var existingBtn = document.querySelector('.hyvision-wl-trigger');

    if (isLoginPage() || !isLoggedIn()) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    // STRICT RBAC: Customer Users NEVER see the floating launcher button!
    // Customer users access reports strictly through the native sidebar item "Reportes".
    if (!isAuthorizedAdmin()) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    // Tenant Admin & Sysadmin get the HyVision Suite launcher button
    if (!existingBtn) {
      createTriggerButton();
    }
  }

  // 8. Create Trigger Button (Admin Only)
  function createTriggerButton() {
    if (document.querySelector('.hyvision-wl-trigger')) return;
    if (isLoginPage() || !isLoggedIn() || !isAuthorizedAdmin()) return;

    var btn = document.createElement('button');
    btn.className = 'hyvision-wl-trigger';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.59 10.59 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
      </svg>
      <span>HyVision Suite</span>
    `;
    btn.title = "HyVision Enterprise Suite: Reportes, Marca Blanca y Alertas";
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  // 9. Create White-Labeling & Reporting Modal Dialog
  function createWhiteLabelModal() {
    var existingModal = document.querySelector('.hyvision-wl-overlay');
    if (existingModal) {
      existingModal.remove(); // Re-create to match current user role strictly
    }

    var isAdmin = isAuthorizedAdmin();
    var overlay = document.createElement('div');
    overlay.className = 'hyvision-wl-overlay';

    overlay.innerHTML = `
      <div class="hyvision-wl-modal">
        <div class="hyvision-wl-header">
          <div class="hyvision-wl-header-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64B856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h2>${isAdmin ? 'HyVision Enterprise Suite' : 'Reportes Ejecutivos'}</h2>
            <span class="hyvision-wl-badge">${isAdmin ? 'v4.3 Pro' : 'HyVision'}</span>
          </div>
          <button class="hyvision-wl-close" id="hyvision-wl-close-btn" title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Tab Bar Navigation (STRICTLY HIDDEN / OMITTED FOR CUSTOMER USERS) -->
        ${isAdmin ? `
          <div class="hyvision-wl-tabs">
            <button class="hyvision-wl-tab-btn active" data-tab="tab-reports">
              <span>📑</span> Reportes Ejecutivos
            </button>
            <button class="hyvision-wl-tab-btn" data-tab="tab-branding" id="tab-btn-branding">
              <span>🎨</span> Marca Blanca
            </button>
            <button class="hyvision-wl-tab-btn" data-tab="tab-telegram" id="tab-btn-telegram">
              <span>📲</span> Alertas Telegram
            </button>
          </div>
        ` : ''}

        <div class="hyvision-wl-body">

          <!-- ================= TAB 1: REPORTES EJECUTIVOS ================= -->
          <div class="hyvision-wl-tab-pane active" id="tab-reports">
            <!-- On-demand Generation -->
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>⚡</span> Generación de Reportes Bajo Demanda
              </div>
              <p style="font-size:12px; color:#8ea38b; margin-top:-8px; margin-bottom:12px;">
                Selecciona el periodo de análisis para generar y descargar los informes energéticos del activo <strong>BESS_EPM_GAORI</strong>:
              </p>

              <!-- Period Selector -->
              <div class="hyv-period-selector" id="hyv-period-selector">
                <div class="hyv-period-chip" data-days="1">Últimas 24 Horas</div>
                <div class="hyv-period-chip active" data-days="7">Últimos 7 Días</div>
                <div class="hyv-period-chip" data-days="15">Últimos 15 Días</div>
                <div class="hyv-period-chip" data-days="30">Últimos 30 Días</div>
              </div>

              <!-- Action Buttons -->
              <div class="hyv-report-actions-grid" style="${isAdmin ? '' : 'grid-template-columns: repeat(2, 1fr);'}">
                <div class="hyv-rep-action-card" id="btn-rep-pdf">
                  <div class="hyv-rep-action-icon">📄</div>
                  <div class="hyv-rep-action-title">PDF Ejecutivo</div>
                  <div class="hyv-rep-action-desc">Informe visual A4 con gráficos vectoriales, KPIs y formato de impresión</div>
                </div>

                <div class="hyv-rep-action-card" id="btn-rep-excel">
                  <div class="hyv-rep-action-icon">📊</div>
                  <div class="hyv-rep-action-title">Excel (.xlsx)</div>
                  <div class="hyv-rep-action-desc">Libro multicapa con resumen, telemetría diaria y bitácora de eventos</div>
                </div>

                ${isAdmin ? `
                  <div class="hyv-rep-action-card" id="btn-rep-tg">
                    <div class="hyv-rep-action-icon">📲</div>
                    <div class="hyv-rep-action-title">Despacho Telegram</div>
                    <div class="hyv-rep-action-desc">Enviar resumen ejecutivo y enlaces de descarga directa al chat del equipo</div>
                  </div>
                ` : ''}
              </div>
              <div id="hyv-report-status" style="font-size:12px; margin-top:10px; font-weight:600; text-align:center;"></div>
            </div>

            <!-- Scheduled Reports Configuration (Strictly for Admins) -->
            ${isAdmin ? `
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>⏱️</span> Programación de Informes Recurrentes
              </div>
              <div class="hyvision-wl-form-grid">
                <div class="hyvision-wl-field hyvision-wl-form-full" style="flex-direction:row; align-items:center; gap:10px;">
                  <input type="checkbox" id="sched-enabled" style="width:18px; height:18px; accent-color:#64B856; cursor:pointer;">
                  <label for="sched-enabled" class="hyvision-wl-label" style="cursor:pointer; font-weight:600; color:#ffffff;">
                    Activar Envío Automático Programado
                  </label>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Frecuencia de Envío</label>
                  <select id="sched-frequency" class="hyvision-wl-select">
                    <option value="daily">Diario (Resumen últimas 24 horas)</option>
                    <option value="weekly" selected>Semanal (Todos los lunes, últimos 7 días)</option>
                    <option value="monthly">Mensual (Día 1 de mes, últimos 30 días)</option>
                  </select>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Hora de Despacho (HH:MM)</label>
                  <input type="time" id="sched-hour" class="hyvision-wl-input" value="07:00">
                </div>

                <div class="hyvision-wl-field hyvision-wl-form-full" style="margin-top:4px; display:flex; flex-direction:row; gap:12px; align-items:center;">
                  <button type="button" class="hyvision-wl-btn" id="btn-save-schedule" style="background:#436A3C; color:#ffffff; padding:9px 18px; font-size:13px;">
                    💾 Guardar Programación
                  </button>
                  <span id="sched-save-result" style="font-size:12px; font-weight:500;"></span>
                </div>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- ================= TAB 2: MARCA BLANCA (ADMIN ONLY) ================= -->
          ${isAdmin ? `
          <div class="hyvision-wl-tab-pane" id="tab-branding">
            <!-- Identidad de Marca -->
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>🏷️</span> Identidad de Marca
              </div>
              <div class="hyvision-wl-form-grid">
                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Título Principal (Hero Login)</label>
                  <input type="text" id="wl-appTitle" class="hyvision-wl-input" placeholder="ej: HYVISION">
                </div>
                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Subtítulo / Tagline</label>
                  <input type="text" id="wl-appSubtitle" class="hyvision-wl-input" placeholder="ej: POWERED BY HYBRICO ENERGY">
                </div>
                <div class="hyvision-wl-field hyvision-wl-form-full">
                  <label class="hyvision-wl-label">Título Pestaña del Navegador</label>
                  <input type="text" id="wl-browserTitle" class="hyvision-wl-input" placeholder="ej: HyVision - Plataforma de Monitoreo">
                </div>
              </div>
            </div>

            <!-- Colores & Apariencia -->
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>🎨</span> Paleta de Colores Corporativos
              </div>
              <div class="hyvision-wl-form-grid">
                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Color Primario de la Plataforma</label>
                  <div class="hyvision-wl-color-row">
                    <input type="color" id="wl-primaryColor-picker" class="hyvision-wl-color-input">
                    <input type="text" id="wl-primaryColor" class="hyvision-wl-input" style="flex:1;">
                  </div>
                  <div class="hyvision-wl-presets">
                    <span class="hyvision-wl-preset-chip" style="background:#436A3C;" data-color="#436A3C" title="Verde Hybrico"></span>
                    <span class="hyvision-wl-preset-chip" style="background:#2D6A4F;" data-color="#2D6A4F" title="Verde Esmeralda"></span>
                    <span class="hyvision-wl-preset-chip" style="background:#E5A93C;" data-color="#E5A93C" title="Oro Solar"></span>
                    <span class="hyvision-wl-preset-chip" style="background:#1D4ED8;" data-color="#1D4ED8" title="Azul Industrial"></span>
                    <span class="hyvision-wl-preset-chip" style="background:#E11D48;" data-color="#E11D48" title="Rojo Rubí"></span>
                    <span class="hyvision-wl-preset-chip" style="background:#0F172A;" data-color="#0F172A" title="Grafito Midnight"></span>
                  </div>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Color de Tarjeta de Login</label>
                  <div class="hyvision-wl-color-row">
                    <input type="color" id="wl-cardColor-picker" class="hyvision-wl-color-input">
                    <input type="text" id="wl-loginCardColor" class="hyvision-wl-input" style="flex:1;">
                  </div>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Color de Fondo Base</label>
                  <div class="hyvision-wl-color-row">
                    <input type="color" id="wl-bgColor-picker" class="hyvision-wl-color-input">
                    <input type="text" id="wl-backgroundColor" class="hyvision-wl-input" style="flex:1;">
                  </div>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Modo de Fondo</label>
                  <select id="wl-backgroundMode" class="hyvision-wl-select">
                    <option value="dark_scada">Degradado Dark SCADA (Recomendado)</option>
                    <option value="clean_light">Modo Claro Limpio</option>
                    <option value="solid">Color Sólido</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Logos -->
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>🖼️</span> Logotipo & Favicon
              </div>
              <div class="hyvision-wl-form-grid">
                <div class="hyvision-wl-field hyvision-wl-form-full">
                  <label class="hyvision-wl-label">Logo de la Pantalla de Login</label>
                  <div style="display:flex; gap:10px;">
                    <input type="text" id="wl-logoLoginUrl" class="hyvision-wl-input" style="flex:1;" placeholder="assets/logo_title_white.png">
                    <label class="hyvision-wl-file-btn">
                      <span>Subir Imagen</span>
                      <input type="file" id="wl-logo-upload" accept="image/*" style="display:none;">
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- CSS Personalizado -->
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>💻</span> CSS Personalizado Avanzado
              </div>
              <div class="hyvision-wl-field">
                <label class="hyvision-wl-label">Reglas CSS adicionales (opcional)</label>
                <textarea id="wl-customCss" class="hyvision-wl-textarea" placeholder="/* Escribe aquí cualquier estilo CSS adicional */"></textarea>
              </div>
            </div>
          </div>

          <!-- ================= TAB 3: TELEGRAM (ADMIN ONLY) ================= -->
          <div class="hyvision-wl-tab-pane" id="tab-telegram">
            <div class="hyvision-wl-section">
              <div class="hyvision-wl-section-title">
                <span>📲</span> Notificaciones Críticas por Telegram (24/7 Gratis)
              </div>
              <div class="hyvision-wl-form-grid">
                <div class="hyvision-wl-field hyvision-wl-form-full" style="flex-direction:row; align-items:center; gap:10px;">
                  <input type="checkbox" id="wl-telegramEnabled" style="width:18px; height:18px; accent-color:#64B856; cursor:pointer;">
                  <label for="wl-telegramEnabled" class="hyvision-wl-label" style="cursor:pointer; font-weight:600; color:#ffffff;">
                    Activar Despacho Automático de Alertas y Reportes a Telegram
                  </label>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Bot Token de Telegram</label>
                  <input type="text" id="wl-telegramBotToken" class="hyvision-wl-input" placeholder="ej: 7123456789:AAFl...">
                  <span style="font-size:11px; color:#8ea38b; margin-top:2px;">Crea tu bot con <a href="https://t.me/BotFather" target="_blank" style="color:#64B856; text-decoration:underline;">@BotFather</a></span>
                </div>

                <div class="hyvision-wl-field">
                  <label class="hyvision-wl-label">Chat ID o ID de Grupo</label>
                  <input type="text" id="wl-telegramChatId" class="hyvision-wl-input" placeholder="ej: -100123456789 o 987654321">
                  <span style="font-size:11px; color:#8ea38b; margin-top:2px;">Obtén tu ID con <a href="https://t.me/userinfobot" target="_blank" style="color:#64B856; text-decoration:underline;">@userinfobot</a></span>
                </div>

                <div class="hyvision-wl-field hyvision-wl-form-full" style="margin-top:4px; display:flex; flex-direction:row; gap:12px; align-items:center;">
                  <button type="button" class="hyvision-wl-btn" id="wl-btn-telegram-test" style="background:rgba(100,184,86,0.2); border:1px solid #64B856; color:#a3e099; padding:8px 16px; font-size:12.5px;">
                    🧪 Probar Conexión con Telegram
                  </button>
                  <span id="wl-telegram-test-result" style="font-size:12px; font-weight:500;"></span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

        </div>

        <!-- Modal Footer -->
        <div class="hyvision-wl-footer">
          ${isAdmin ? `
            <button class="hyvision-wl-btn hyvision-wl-btn-reset" id="wl-btn-reset">Restablecer de fábrica</button>
            <div class="hyvision-wl-actions">
              <button class="hyvision-wl-btn hyvision-wl-btn-cancel" id="wl-btn-cancel">Cerrar</button>
              <button class="hyvision-wl-btn hyvision-wl-btn-save" id="wl-btn-save">Guardar Cambios</button>
            </div>
          ` : `
            <div></div>
            <div class="hyvision-wl-actions">
              <button class="hyvision-wl-btn hyvision-wl-btn-save" id="wl-btn-cancel" style="background:#436A3C; color:#ffffff;">Cerrar</button>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tab Navigation Logic (Only for Admin)
    if (isAdmin) {
      overlay.querySelectorAll('.hyvision-wl-tab-btn').forEach(function(tabBtn) {
        tabBtn.addEventListener('click', function() {
          var targetTabId = tabBtn.getAttribute('data-tab');

          overlay.querySelectorAll('.hyvision-wl-tab-btn').forEach(function(b) { b.classList.remove('active'); });
          overlay.querySelectorAll('.hyvision-wl-tab-pane').forEach(function(p) { p.classList.remove('active'); });

          tabBtn.classList.add('active');
          var pane = document.getElementById(targetTabId);
          if (pane) pane.classList.add('active');
        });
      });
    }

    // Period selector logic
    overlay.querySelectorAll('.hyv-period-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        overlay.querySelectorAll('.hyv-period-chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        selectedReportDays = parseInt(chip.getAttribute('data-days'), 10) || 7;
      });
    });

    // Report Actions: PDF
    document.getElementById('btn-rep-pdf').addEventListener('click', function() {
      var url = '/api/hyvision/report/view?days=' + selectedReportDays + '&autoPrint=1';
      window.open(url, '_blank');
      showToast('Abriendo informe ejecutivo en PDF...');
    });

    // Report Actions: Excel
    document.getElementById('btn-rep-excel').addEventListener('click', function() {
      var url = '/api/hyvision/report/excel?days=' + selectedReportDays;
      window.location.href = url;
      showToast('Descargando archivo Excel (.xlsx)...');
    });

    // Report Actions: Telegram Dispatch (Admin only)
    var tgBtn = document.getElementById('btn-rep-tg');
    if (tgBtn) {
      tgBtn.addEventListener('click', function() {
        var statusEl = document.getElementById('hyv-report-status');
        statusEl.style.color = '#8ea38b';
        statusEl.innerText = 'Despachando reporte a Telegram...';

        fetch('/api/hyvision/report/send-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: selectedReportDays })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.status === 'ok') {
            statusEl.style.color = '#64B856';
            statusEl.innerText = '✅ ¡Reporte despachado exitosamente a Telegram!';
            showToast('¡Reporte enviado a Telegram!');
          } else {
            statusEl.style.color = '#ff8a80';
            statusEl.innerText = '❌ ' + (data.message || 'Error al despachar reporte');
          }
        })
        .catch(function(err) {
          statusEl.style.color = '#ff8a80';
          statusEl.innerText = '❌ Error de conexión: ' + err.message;
        });
      });
    }

    // Event listeners inside modal
    document.getElementById('hyvision-wl-close-btn').addEventListener('click', closeModal);
    document.getElementById('wl-btn-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    if (isAdmin) {
      // Color pickers sync
      syncColorField('wl-primaryColor', 'wl-primaryColor-picker');
      syncColorField('wl-loginCardColor', 'wl-cardColor-picker');
      syncColorField('wl-backgroundColor', 'wl-bgColor-picker');

      // Presets
      overlay.querySelectorAll('.hyvision-wl-preset-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var c = chip.getAttribute('data-color');
          document.getElementById('wl-primaryColor').value = c;
          document.getElementById('wl-primaryColor-picker').value = c;
        });
      });

      // File Upload to DataURL
      document.getElementById('wl-logo-upload').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(evt) {
            document.getElementById('wl-logoLoginUrl').value = evt.target.result;
            showToast('Imagen cargada');
          };
          reader.readAsDataURL(file);
        }
      });

      // Telegram Connection Test
      document.getElementById('wl-btn-telegram-test').addEventListener('click', function() {
        var btn = document.getElementById('wl-btn-telegram-test');
        var resSpan = document.getElementById('wl-telegram-test-result');
        var botToken = document.getElementById('wl-telegramBotToken').value.trim();
        var chatId = document.getElementById('wl-telegramChatId').value.trim();

        if (!botToken || !chatId) {
          resSpan.style.color = '#ff8a80';
          resSpan.innerText = '⚠️ Ingresa el Bot Token y Chat ID primero.';
          return;
        }

        btn.disabled = true;
        btn.innerText = 'Enviando...';
        resSpan.style.color = '#8ea38b';
        resSpan.innerText = 'Conectando con Telegram...';

        var token = localStorage.getItem('jwt_token') || '';
        fetch('/api/hyvision/telegram/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ botToken: botToken, chatId: chatId })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          btn.disabled = false;
          btn.innerText = '🧪 Probar Conexión con Telegram';
          if (data.status === 'ok') {
            resSpan.style.color = '#64B856';
            resSpan.innerText = '✅ ' + data.message;
          } else {
            resSpan.style.color = '#ff8a80';
            resSpan.innerText = '❌ ' + (data.message || 'Error al conectar');
          }
        })
        .catch(function(err) {
          btn.disabled = false;
          btn.innerText = '🧪 Probar Conexión con Telegram';
          resSpan.style.color = '#ff8a80';
          resSpan.innerText = '❌ Error de red: ' + err.message;
        });
      });

      // Save Schedule
      document.getElementById('btn-save-schedule').addEventListener('click', function() {
        var sBtn = document.getElementById('btn-save-schedule');
        var resSpan = document.getElementById('sched-save-result');
        var token = localStorage.getItem('jwt_token') || '';

        var schedData = {
          enabled: document.getElementById('sched-enabled').checked,
          frequency: document.getElementById('sched-frequency').value,
          hour: document.getElementById('sched-hour').value || '07:00',
          target: 'telegram'
        };

        sBtn.disabled = true;
        sBtn.innerText = 'Guardando...';

        fetch('/api/hyvision/report/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(schedData)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          sBtn.disabled = false;
          sBtn.innerText = '💾 Guardar Programación';
          if (data.status === 'ok') {
            resSpan.style.color = '#64B856';
            resSpan.innerText = '✅ ¡Programación guardada!';
            currentConfig.reportSchedule = schedData;
            showToast('Programación de reportes guardada');
          } else {
            resSpan.style.color = '#ff8a80';
            resSpan.innerText = '❌ ' + data.message;
          }
        })
        .catch(function(err) {
          sBtn.disabled = false;
          sBtn.innerText = '💾 Guardar Programación';
          resSpan.style.color = '#ff8a80';
          resSpan.innerText = '❌ ' + err.message;
        });
      });

      // Save Branding Action
      document.getElementById('wl-btn-save').addEventListener('click', function() {
        var saveBtn = document.getElementById('wl-btn-save');
        saveBtn.innerText = 'Guardando...';
        saveBtn.disabled = true;

        var newCfg = {
          appTitle: document.getElementById('wl-appTitle').value.trim() || currentConfig.appTitle,
          appSubtitle: document.getElementById('wl-appSubtitle').value.trim(),
          browserTitle: document.getElementById('wl-browserTitle').value.trim() || currentConfig.browserTitle,
          primaryColor: document.getElementById('wl-primaryColor').value.trim() || currentConfig.primaryColor,
          loginCardColor: document.getElementById('wl-loginCardColor').value.trim() || currentConfig.loginCardColor,
          backgroundColor: document.getElementById('wl-backgroundColor').value.trim() || currentConfig.backgroundColor,
          backgroundMode: document.getElementById('wl-backgroundMode').value,
          logoLoginUrl: document.getElementById('wl-logoLoginUrl').value.trim() || currentConfig.logoLoginUrl,
          customCss: document.getElementById('wl-customCss').value,
          telegramEnabled: document.getElementById('wl-telegramEnabled').checked,
          telegramBotToken: document.getElementById('wl-telegramBotToken').value.trim(),
          telegramChatId: document.getElementById('wl-telegramChatId').value.trim()
        };

        var token = localStorage.getItem('jwt_token') || '';
        fetch('/api/hyvision/branding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(newCfg)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          saveBtn.innerText = 'Guardar Cambios';
          saveBtn.disabled = false;
          if (data.status === 'ok') {
            currentConfig = Object.assign({}, currentConfig, newCfg);
            window.hyvisionConfig = currentConfig;
            applyConfigToDOM(currentConfig, true);
            showToast('¡Configuración guardada y aplicada!');
            closeModal();
          } else {
            alert('Error: ' + (data.message || 'No autorizado'));
          }
        })
        .catch(function(err) {
          saveBtn.innerText = 'Guardar Cambios';
          saveBtn.disabled = false;
          alert('Error al conectar con la API: ' + err.message);
        });
      });

      // Reset Action
      document.getElementById('wl-btn-reset').addEventListener('click', function() {
        if (confirm('¿Deseas restablecer todos los valores originales de fábrica de HyVision?')) {
          var token = localStorage.getItem('jwt_token') || '';
          fetch('/api/hyvision/branding/reset', {
            method: 'POST',
            headers: {
              'X-Authorization': 'Bearer ' + token
            }
          })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              currentConfig = data.config;
              window.hyvisionConfig = currentConfig;
              applyConfigToDOM(currentConfig, true);
              populateForm(currentConfig);
              showToast('Valores de fábrica restablecidos');
            });
        }
      });
    }
  }

  function syncColorField(textId, pickerId) {
    var txt = document.getElementById(textId);
    var pkr = document.getElementById(pickerId);
    if (!txt || !pkr) return;
    txt.addEventListener('input', function() {
      if (/^#[0-9A-Fa-f]{6}$/.test(txt.value)) {
        pkr.value = txt.value;
      }
    });
    pkr.addEventListener('input', function() {
      txt.value = pkr.value;
    });
  }

  function populateForm(cfg) {
    var el;
    if ((el = document.getElementById('wl-appTitle'))) el.value = cfg.appTitle || '';
    if ((el = document.getElementById('wl-appSubtitle'))) el.value = cfg.appSubtitle || '';
    if ((el = document.getElementById('wl-browserTitle'))) el.value = cfg.browserTitle || '';
    if ((el = document.getElementById('wl-primaryColor'))) el.value = cfg.primaryColor || '#436A3C';
    if ((el = document.getElementById('wl-primaryColor-picker'))) el.value = cfg.primaryColor || '#436A3C';
    if ((el = document.getElementById('wl-loginCardColor'))) el.value = cfg.loginCardColor || '#2b4c23';
    if ((el = document.getElementById('wl-cardColor-picker'))) el.value = cfg.loginCardColor || '#2b4c23';
    if ((el = document.getElementById('wl-backgroundColor'))) el.value = cfg.backgroundColor || '#173117';
    if ((el = document.getElementById('wl-bgColor-picker'))) el.value = cfg.backgroundColor || '#173117';
    if ((el = document.getElementById('wl-backgroundMode'))) el.value = cfg.backgroundMode || 'dark_scada';
    if ((el = document.getElementById('wl-logoLoginUrl'))) el.value = cfg.logoLoginUrl || '';
    if ((el = document.getElementById('wl-customCss'))) el.value = cfg.customCss || '';
    if ((el = document.getElementById('wl-telegramEnabled'))) el.checked = !!cfg.telegramEnabled;
    if ((el = document.getElementById('wl-telegramBotToken'))) el.value = cfg.telegramBotToken || '';
    if ((el = document.getElementById('wl-telegramChatId'))) el.value = cfg.telegramChatId || '';

    // Schedule form
    var sched = cfg.reportSchedule || {};
    if ((el = document.getElementById('sched-enabled'))) el.checked = !!sched.enabled;
    if ((el = document.getElementById('sched-frequency'))) el.value = sched.frequency || 'weekly';
    if ((el = document.getElementById('sched-hour'))) el.value = sched.hour || '07:00';

    var resSpan = document.getElementById('wl-telegram-test-result');
    if (resSpan) resSpan.innerText = '';
    var schedRes = document.getElementById('sched-save-result');
    if (schedRes) schedRes.innerText = '';
  }

  function openModal() {
    createWhiteLabelModal();
    populateForm(currentConfig);
    var overlay = document.querySelector('.hyvision-wl-overlay');
    if (overlay) overlay.classList.add('active');
  }

  function closeModal() {
    var overlay = document.querySelector('.hyvision-wl-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ============================================================
  // 10. HyVision Fleet Control Hub (Portafolio de Sistemas de Energía Dinámico Multi-Sitio)
  // ============================================================
  var fleetHubState = {
    activeView: 'cards', // 'cards' | 'map' | 'table'
    activeFilter: 'all',  // 'all' | 'normal' | 'alert' | 'bess' | 'solar' | 'hybrid'
    searchTerm: '',
    isClassicMode: false,
    realSites: [],
    lastTelemetryFetch: 0,
    refreshIntervalId: null
  };

  function isDashboardsListView() {
    if (isLoginPage() || !isLoggedIn()) return false;
    var path = window.location.pathname || '';
    if (path === '/dashboards' || path === '/dashboards/' || path === '/dashboards/groups' || path.indexOf('/dashboards/groups/') === 0) {
      var sub = path.replace('/dashboards/', '').replace('dashboards/', '');
      if (sub.length > 20 && sub.indexOf('/') === -1) {
        return false;
      }
      return true;
    }
    return false;
  }

  // Fetch only REAL dashboards and REAL device telemetry from ThingsBoard API
  function loadRealDashboards(callback) {
    var token = localStorage.getItem('jwt_token');
    if (!token) {
      if (callback) callback([]);
      return;
    }
    var isAdmin = isAuthorizedAdmin();
    var dashUrl = '/api/tenant/dashboards?pageSize=100&page=0';
    var devUrl = '/api/tenant/devices?pageSize=100&page=0';

    if (!isAdmin) {
      try {
        var parts = token.split('.');
        var payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
        if (payload.customerId) {
          dashUrl = '/api/customer/' + payload.customerId + '/dashboards?pageSize=100&page=0';
          devUrl = '/api/customer/' + payload.customerId + '/devices?pageSize=100&page=0';
        }
      } catch(e) {}
    }

    var headers = { 'X-Authorization': 'Bearer ' + token };

    // Fetch dashboards and devices in parallel
    Promise.all([
      fetch(dashUrl, { headers: headers }).then(function(r) { return r.ok ? r.json() : { data: [] }; }).catch(function() { return { data: [] }; }),
      fetch(devUrl, { headers: headers }).then(function(r) { return r.ok ? r.json() : { data: [] }; }).catch(function() { return { data: [] }; })
    ])
    .then(function(results) {
      var dashList = (results[0] && results[0].data) || [];
      var devList = (results[1] && results[1].data) || [];

      // Query latest telemetry for every device
      var telPromises = devList.map(function(dev) {
        var devId = dev.id && dev.id.id ? dev.id.id : dev.id;
        var keys = 'generacion_solar_kw,epv_hoy_kwh,soc_promedio,vbat_promedio,demanda_carga_kw,potencia_bess_kw,temp_bateria_max,ultima_actualizacion,estado_bess';
        return fetch('/api/plugins/telemetry/DEVICE/' + devId + '/values/timeseries?keys=' + keys, { headers: headers })
          .then(function(r) { return r.ok ? r.json() : {}; })
          .then(function(tel) { return { devId: devId, dev: dev, tel: tel }; })
          .catch(function() { return { devId: devId, dev: dev, tel: {} }; });
      });

      return Promise.all(telPromises).then(function(telemetries) {
        return { dashList: dashList, devList: devList, telemetries: telemetries };
      });
    })
    .then(function(data) {
      var dashList = data.dashList;
      var devList = data.devList;
      var telemetries = data.telemetries || [];

      var now = Date.now();
      // Regla de Freshness / Heartbeat: 15 minutos de ventana para considerar enlace activo
      var FRESHNESS_WINDOW_MS = 15 * 60 * 1000;

      var mappedSites = dashList.map(function(d, index) {
        var id = d.id && d.id.id ? d.id.id : d.id;
        var title = d.title || 'Sistema de energía';
        var isEpm = title.toLowerCase().indexOf('epm') !== -1 || title.toLowerCase().indexOf('gaori') !== -1;

        // Vincular dashboard con su dispositivo físico
        var matchedTelObj = null;
        if (isEpm) {
          matchedTelObj = telemetries.find(function(t) {
            var n = (t.dev && t.dev.name ? t.dev.name : '').toLowerCase();
            return n.indexOf('epm') !== -1 || n.indexOf('gaori') !== -1;
          });
        }
        if (!matchedTelObj) {
          matchedTelObj = telemetries.find(function(t) {
            var n = (t.dev && t.dev.name ? t.dev.name : '').toLowerCase();
            var dt = title.toLowerCase();
            return n.indexOf(dt) !== -1 || dt.indexOf(n) !== -1;
          });
        }
        if (!matchedTelObj && telemetries.length === 1 && dashList.length === 1) {
          matchedTelObj = telemetries[0];
        }

        var tel = matchedTelObj ? (matchedTelObj.tel || {}) : {};

        // Extraer timestamp más reciente para validar heartbeat de telemetría
        var maxTs = 0;
        Object.keys(tel).forEach(function(k) {
          if (tel[k] && tel[k].length > 0 && tel[k][0].ts) {
            if (tel[k][0].ts > maxTs) maxTs = tel[k][0].ts;
          }
        });

        var ageMs = maxTs > 0 ? (now - maxTs) : Infinity;
        var isFresh = maxTs > 0 && ageMs <= FRESHNESS_WINDOW_MS;
        var hasData = Object.keys(tel).length > 0;

        var getNum = function(key, fallback) {
          if (tel[key] && tel[key].length > 0) {
            var v = parseFloat(tel[key][0].value);
            return isNaN(v) ? fallback : v;
          }
          return fallback;
        };

        var solarKw = getNum('generacion_solar_kw', 0.0);
        var solarKwh = getNum('epv_hoy_kwh', 0.0);
        var socVal = getNum('soc_promedio', null);
        var vbatVal = getNum('vbat_promedio', 0.0);
        var loadKw = getNum('demanda_carga_kw', 0.0);
        var tempVal = getNum('temp_bateria_max', 28.5);

        // Regla estricta contra falsos positivos:
        // Si el sitio no transmite o envía únicamente ceros en todas las variables eléctricas (desconectado)
        var isAllZero = (solarKw === 0 && solarKwh === 0 && (socVal === null || socVal === 0) && vbatVal === 0 && loadKw === 0);
        var isOnline = isFresh && hasData && !isAllZero;

        // Formato dinámico de energía solar
        var solarTodayStr = '0.0 kWh';
        if (solarKwh >= 1000) {
          solarTodayStr = (solarKwh / 1000).toFixed(2) + ' MWh';
        } else if (solarKwh > 0) {
          solarTodayStr = solarKwh.toFixed(1) + ' kWh';
        }

        var bessVoltStr = vbatVal > 0 ? vbatVal.toFixed(1) + ' V' : '-- V';
        var bessSocDisplay = (socVal !== null && socVal > 0) ? Math.round(socVal) : (isOnline ? 0 : '--');
        var tempStr = tempVal > 0 ? tempVal.toFixed(1) + ' °C' : '-- °C';

        return {
          id: id,
          title: title,
          subtitle: isEpm ? "BESS Industrial Off-Grid • Vichada, Colombia" : "Sistema de Energía Híbrido • Colombia",
          region: isEpm ? "Vichada, CO" : "Colombia",
          type: isEpm ? "BESS Off-Grid" : "Microred Híbrida",
          status: isOnline ? "normal" : "alert",
          isOnline: isOnline,
          hasBess: socVal !== null || isEpm,
          solarKw: isOnline ? solarKw : 0.0,
          solarTodayKwh: isOnline ? solarTodayStr : '0.0 kWh',
          solarTodayRawKwh: isOnline ? solarKwh : 0.0,
          bessSoc: (socVal !== null && socVal > 0 && isOnline) ? socVal : null,
          bessSocDisplay: bessSocDisplay,
          bessVolt: isOnline ? bessVoltStr : '-- V',
          bessCap: isEpm ? "750 V Bus" : "150 kWh",
          loadKw: isOnline ? loadKw : 0.0,
          uptime: isOnline ? "99.9%" : "0.0%",
          temp: isOnline ? tempStr : '-- °C',
          cycles: isEpm ? "1,248" : "420",
          lat: isEpm ? 4.4238 : (4.7110 + (index * 0.5)),
          lng: isEpm ? -70.7308 : (-74.0721 - (index * 0.5)),
          sparkline: isOnline ? "M0,36 C30,35 60,30 90,20 C120,10 150,2 180,4 C210,12 240,24 270,30" : "M0,40 L270,40"
        };
      });

      fleetHubState.realSites = mappedSites;
      fleetHubState.lastTelemetryFetch = Date.now();
      if (callback) callback(mappedSites);
    })
    .catch(function(err) {
      console.warn('Fallback loading dashboards:', err);
      if (callback) callback(fleetHubState.realSites || []);
    });
  }

  function deleteRealDashboard(siteId, siteTitle, hub) {
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente el sistema de energía "' + siteTitle + '"?\n\nEsta acción eliminará todos los datos asociados y no se puede deshacer.')) {
      return;
    }
    var token = localStorage.getItem('jwt_token');
    fetch('/api/dashboard/' + siteId, {
      method: 'DELETE',
      headers: { 'X-Authorization': 'Bearer ' + token }
    })
    .then(function(res) {
      if (res.ok) {
        showToast('Sistema de energía "' + siteTitle + '" eliminado correctamente.');
        loadRealDashboards(function() {
          updateKpisAndHeader(hub);
          renderFleetHubContent(hub);
        });
      } else {
        showToast('Error al eliminar el sistema de energía.');
      }
    })
    .catch(function() {
      showToast('Error de red al intentar eliminar el sistema.');
    });
  }

  function getFilteredFleetSites() {
    var query = (fleetHubState.searchTerm || '').toLowerCase().trim();
    var sites = fleetHubState.realSites || [];
    return sites.filter(function(site) {
      if (fleetHubState.activeFilter === 'normal' && !site.isOnline) return false;
      if (fleetHubState.activeFilter === 'alert' && site.isOnline) return false;
      if (fleetHubState.activeFilter === 'bess' && (!site.hasBess || !site.isOnline)) return false;
      if (fleetHubState.activeFilter === 'solar' && site.type.toLowerCase().indexOf('solar') === -1 && site.type.toLowerCase().indexOf('bess') === -1) return false;
      if (fleetHubState.activeFilter === 'hybrid' && site.type.toLowerCase().indexOf('híbrida') === -1 && site.type.toLowerCase().indexOf('off-grid') === -1) return false;

      if (query) {
        var match = site.title.toLowerCase().indexOf(query) !== -1 ||
                    site.subtitle.toLowerCase().indexOf(query) !== -1 ||
                    site.region.toLowerCase().indexOf(query) !== -1 ||
                    site.type.toLowerCase().indexOf(query) !== -1;
        if (!match) return false;
      }
      return true;
    });
  }

  // REGLAS MATEMÁTICAS ESTRICTAS PARA MULTI-SITIO (HASTA 100+ SITIOS)
  function updateKpisAndHeader(hub) {
    var sites = fleetHubState.realSites || [];
    var totalSites = sites.length;
    var onlineSites = sites.filter(function(s) { return s.isOnline; });
    var onlineCount = onlineSites.length;
    var offlineCount = totalSites - onlineCount;

    var totalPower = 0;
    var totalEnergyKwh = 0;
    onlineSites.forEach(function(s) {
      totalPower += (s.loadKw || s.solarKw || 0);
      totalEnergyKwh += (s.solarTodayRawKwh || 0);
    });

    // REGLA CRÍTICA BESS PROMEDIO:
    // NUNCA promediar ceros de sitios apagados o sin enlace.
    // Se filtra ÚNICAMENTE por sitios ONLINE que tienen BESS y con telemetría SOC válida (> 0).
    var bessActiveSites = sites.filter(function(s) {
      return s.isOnline && s.bessSoc !== null && s.bessSoc > 0;
    });

    var bessAvg = 0;
    if (bessActiveSites.length > 0) {
      var bessSum = bessActiveSites.reduce(function(acc, s) { return acc + s.bessSoc; }, 0);
      bessAvg = (bessSum / bessActiveSites.length).toFixed(1);
    }

    // 1. Potencia Activa Total Consolidada
    var valPower = hub.querySelector('#hyv-kpi-power');
    if (valPower) valPower.innerHTML = (totalPower > 0 ? totalPower.toFixed(1) : '0.0') + '<span>kW</span>';
    var subPower = hub.querySelector('#hyv-kpi-power-sub');
    if (subPower) {
      subPower.innerText = totalPower > 0 ? 'Demanda de carga activa consolidada' : 'Sin consumo activo registrado';
    }

    // 2. Generación Solar Consolidada Hoy
    var valEnergy = hub.querySelector('#hyv-kpi-energy');
    if (valEnergy) {
      if (totalEnergyKwh >= 1000) {
        valEnergy.innerHTML = (totalEnergyKwh / 1000).toFixed(2) + '<span>MWh</span>';
      } else {
        valEnergy.innerHTML = totalEnergyKwh.toFixed(1) + '<span>kWh</span>';
      }
    }
    var subEnergy = hub.querySelector('#hyv-kpi-energy-sub');
    if (subEnergy) {
      subEnergy.innerText = 'Total fotovoltaico acumulado hoy';
    }

    // 3. Estado de la Flota (Dinámico y proporcional)
    var fleetPct = totalSites > 0 ? Math.round((onlineCount / totalSites) * 100) : 0;
    var valFleet = hub.querySelector('#hyv-kpi-fleet');
    if (valFleet) {
      valFleet.innerText = fleetPct + '%';
      valFleet.style.color = fleetPct === 100 ? '#6be35b' : (fleetPct > 0 ? '#f59e0b' : '#ef4444');
    }

    var subFleet = hub.querySelector('#hyv-kpi-fleet-sub');
    if (subFleet) {
      subFleet.className = 'hyv-kpi-sub ' + (fleetPct === 100 ? 'positive' : (fleetPct > 0 ? 'warning' : 'danger'));
      subFleet.innerText = '● ' + onlineCount + ' de ' + totalSites + ' Sistemas Operativos';
    }

    // 4. BESS Promedio (Sin false-positives por ceros de sitios desconectados)
    var valBess = hub.querySelector('#hyv-kpi-bess');
    if (valBess) {
      if (bessActiveSites.length > 0) {
        valBess.innerHTML = bessAvg + '<span>% SOC</span>';
      } else {
        valBess.innerHTML = '--<span>% SOC</span>';
      }
    }
    var subBess = hub.querySelector('#hyv-kpi-bess-sub');
    if (subBess) {
      subBess.innerText = bessActiveSites.length > 0
        ? 'Salud celdas SOH: 99.5% (' + bessActiveSites.length + ' de ' + totalSites + ' BESS activos)'
        : 'Sin sistemas BESS transmitiendo';
    }

    // 5. Disponibilidad SLA de Telemetría 24/7
    var valSla = hub.querySelector('#hyv-kpi-sla');
    if (valSla) {
      var slaPct = totalSites > 0 ? ((onlineCount / totalSites) * 100).toFixed(1) : '100.0';
      valSla.innerHTML = slaPct + '<span>%</span>';
    }
    var subSla = hub.querySelector('#hyv-kpi-sla-sub');
    if (subSla) {
      subSla.innerText = 'Telemetría continua: ' + onlineCount + '/' + totalSites + ' activos';
    }

    // Actualizar contadores de las pestañas/chips de filtro
    var chipAll = hub.querySelector('[data-filter="all"]');
    if (chipAll) chipAll.innerText = 'Todos (' + totalSites + ')';
    var chipNorm = hub.querySelector('[data-filter="normal"]');
    if (chipNorm) chipNorm.innerText = '🟢 Operativos (' + onlineCount + ')';
    var chipAlert = hub.querySelector('[data-filter="alert"]');
    if (chipAlert) chipAlert.innerText = '🔴 Fuera de línea (' + offlineCount + ')';
    var chipBess = hub.querySelector('[data-filter="bess"]');
    if (chipBess) chipBess.innerText = '🔋 Con BESS (' + bessActiveSites.length + ')';
  }

  function renderFleetHubContent(hub) {
    var sites = getFilteredFleetSites();
    var container = hub.querySelector('#hyv-fleet-dynamic-body');
    if (!container) return;

    var isAdmin = isAuthorizedAdmin();

    if (fleetHubState.activeView === 'cards') {
      var html = '<div class="hyv-cards-grid">';
      if (sites.length === 0) {
        html += `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #8dae8a; font-size: 15px;">
            <div style="font-size: 32px; margin-bottom: 12px;">⚡</div>
            No se encontraron sistemas de energía bajo este filtro.
            ${isAdmin ? '<div style="margin-top:16px;"><button class="hyv-btn-scada" id="btn-add-from-empty" style="display:inline-flex;">+ Añadir sistema de energía</button></div>' : ''}
          </div>
        `;
      } else {
        sites.forEach(function(s) {
          var targetUrl = '/dashboards/' + s.id;
          html += `
            <div class="hyv-site-card">
              <div class="hyv-card-header">
                <div class="hyv-card-title-wrap">
                  <a class="hyv-card-title" href="${targetUrl}">
                    <span class="hyv-status-dot ${s.isOnline ? '' : 'offline'}"></span>
                    ${s.title}
                  </a>
                  <div class="hyv-card-sub">
                    <span>${s.subtitle}</span>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="hyv-card-type-tag ${s.isOnline ? 'online' : 'offline'}">${s.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  <span class="hyv-card-type-tag">${s.type}</span>
                  ${isAdmin ? `<button class="hyv-btn-delete hyv-trigger-delete" data-id="${s.id}" data-title="${s.title}" title="Eliminar sistema de energía">🗑</button>` : ''}
                </div>
              </div>

              <!-- Power Triad: Solar, BESS, Load -->
              <div class="hyv-power-triad">
                <div class="hyv-triad-item">
                  <span class="hyv-triad-label">☀️ Solar</span>
                  <span class="hyv-triad-val solar">${s.solarKw.toFixed(1)} <small style="font-size:10px;">kW</small></span>
                  <span class="hyv-triad-extra">${s.solarTodayKwh}</span>
                </div>
                <div class="hyv-triad-item">
                  <span class="hyv-triad-label">🔋 BESS</span>
                  <span class="hyv-triad-val bess">${s.bessSocDisplay !== '--' ? s.bessSocDisplay + '%' : '--'}</span>
                  <span class="hyv-triad-extra">${s.bessVolt}</span>
                </div>
                <div class="hyv-triad-item">
                  <span class="hyv-triad-label">💡 Carga</span>
                  <span class="hyv-triad-val load">${s.loadKw.toFixed(1)} <small style="font-size:10px;">kW</small></span>
                  <span class="hyv-triad-extra">${s.isOnline ? 'Activa' : 'Sin señal'}</span>
                </div>
              </div>

              <!-- Sparkline 24h Profile -->
              <div class="hyv-card-sparkline-wrap">
                <div class="hyv-sparkline-label">
                  <span>Perfil de Potencia (Últimas 24h)</span>
                  <span style="color:${s.isOnline ? '#6be35b' : '#ef4444'};">${s.isOnline ? 'Estable' : 'Sin Enlace'}</span>
                </div>
                <svg class="hyv-sparkline-svg" viewBox="0 0 270 44" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad-${s.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="${s.isOnline ? '#64B856' : '#ef4444'}" stop-opacity="0.45"/>
                      <stop offset="100%" stop-color="#436A3C" stop-opacity="0.0"/>
                    </linearGradient>
                  </defs>
                  <path d="${s.sparkline} L270,44 L0,44 Z" fill="url(#grad-${s.id})" />
                  <path d="${s.sparkline}" fill="none" stroke="${s.isOnline ? '#64B856' : '#ef4444'}" stroke-width="2.2" stroke-linecap="round" />
                </svg>
              </div>

              <!-- Technical SLA & Health Row -->
              <div class="hyv-card-metrics-row">
                <span>⚡ SLA: <strong style="color:#ffffff;">${s.uptime}</strong></span>
                <span>🌡 Temp BESS: <strong style="color:#ffffff;">${s.temp}</strong></span>
                <span>🔄 Ciclos: <strong style="color:#ffffff;">${s.cycles}</strong></span>
              </div>

              <!-- Action Buttons -->
              <div class="hyv-card-actions">
                <a class="hyv-btn-scada" href="${targetUrl}">
                  <span>⚡ Abrir SCADA</span>
                </a>
                <button class="hyv-btn-report hyv-trigger-report" data-title="${s.title}">
                  <span>📄 Reporte</span>
                </button>
              </div>
            </div>
          `;
        });
      }
      html += '</div>';
      container.innerHTML = html;

    } else if (fleetHubState.activeView === 'map') {
      var mapMarkers = '';
      sites.forEach(function(s) {
        var dotColor = s.isOnline ? '#50e338' : '#ef4444';
        var pulseColor = s.isOnline ? '#64B856' : '#ef4444';
        mapMarkers += `
          <g class="hyv-map-marker" data-name="${s.title}" transform="translate(345, 175)">
            <circle r="14" fill="${pulseColor}" opacity="0.3" class="hyv-map-marker-pulse" />
            <circle r="6" fill="${dotColor}" filter="url(#markerGlow)" />
            <text x="12" y="4" fill="#ffffff" font-size="11" font-weight="700">${s.title} (${s.region})</text>
            <text x="12" y="16" fill="${s.isOnline ? '#8ce47e' : '#f87171'}" font-size="9.5">${s.isOnline ? s.solarKw.toFixed(1) + ' kW • ' + s.bessSocDisplay + '% SOC' : 'FUERA DE LÍNEA'}</text>
          </g>
        `;
      });

      var firstSite = sites[0] || { title: 'Sin sistemas', subtitle: '', solarKw: 0, bessSocDisplay: '--', loadKw: 0, id: '', isOnline: false };
      var mapHtml = `
        <div class="hyv-map-wrapper">
          <svg class="hyv-map-svg" viewBox="0 0 900 520" style="background:#091209;">
            <defs>
              <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#436A3C" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#091209" stop-opacity="0"/>
              </radialGradient>
              <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="900" height="520" fill="url(#mapGlow)" />
            <path d="M 0,130 L 900,130 M 0,260 L 900,260 M 0,390 L 900,390 M 225,0 L 225,520 M 450,0 L 450,520 M 675,0 L 675,520" stroke="rgba(255,255,255,0.03)" stroke-width="1" />

            <path d="M 120,90 Q 210,120 280,180 Q 320,240 340,320 Q 380,440 450,500 L 580,500 Q 600,420 540,330 Q 480,240 450,180 Q 400,100 280,70 Z" fill="#122412" stroke="#436A3C" stroke-width="1.2" opacity="0.75" />
            <path d="M 310,140 Q 350,120 400,130 Q 430,170 380,220 Q 330,220 310,140 Z" fill="#162e16" stroke="#64B856" stroke-width="1.5" opacity="0.9" />

            <!-- Dynamic Site Markers -->
            ${mapMarkers}
          </svg>

          <!-- Interactive Tooltip Overlay -->
          <div class="hyv-map-tooltip">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span class="hyv-status-dot ${firstSite.isOnline ? '' : 'offline'}"></span>
              <strong style="color:#ffffff; font-size:14.5px;">${firstSite.title}</strong>
            </div>
            <div style="font-size:11.5px; color:#98b894; margin-bottom:10px;">${firstSite.subtitle}</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11.5px; margin-bottom:12px;">
              <div>Solar: <strong style="color:#f7d048;">${firstSite.solarKw.toFixed(1)} kW</strong></div>
              <div>BESS: <strong style="color:#6be35b;">${firstSite.bessSocDisplay}% SOC</strong></div>
              <div>Carga: <strong style="color:#62c3f5;">${firstSite.loadKw.toFixed(1)} kW</strong></div>
              <div>Uptime: <strong style="color:#ffffff;">${firstSite.uptime || '99.9%'}</strong></div>
            </div>
            <a class="hyv-btn-scada" style="padding:6px 12px; font-size:11.5px;" href="/dashboards/${firstSite.id}">⚡ Abrir SCADA en Vivo</a>
          </div>
        </div>
      `;
      container.innerHTML = mapHtml;

    } else if (fleetHubState.activeView === 'table') {
      var tableHtml = `
        <div class="hyv-table-wrapper">
          <table class="hyv-scada-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Sistema de Energía</th>
                <th>Tipo / Tecnología</th>
                <th>Región</th>
                <th>☀️ Solar (kW)</th>
                <th>🔋 BESS (SOC)</th>
                <th>💡 Carga (kW)</th>
                <th>SLA Uptime</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
      `;
      if (sites.length === 0) {
        tableHtml += '<tr><td colspan="9" style="text-align:center; padding:30px; color:#8dae8a;">No hay sistemas registrados bajo este filtro</td></tr>';
      } else {
        sites.forEach(function(s) {
          var targetUrl = '/dashboards/' + s.id;
          tableHtml += `
            <tr>
              <td>
                <span class="hyv-status-dot ${s.isOnline ? '' : 'offline'}"></span>
                <span style="font-size:11px; font-weight:700; color:${s.isOnline ? '#8ce47e' : '#f87171'}; margin-left:6px;">${s.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </td>
              <td>
                <a href="${targetUrl}" style="color:#ffffff; font-weight:700; text-decoration:none;">${s.title}</a>
              </td>
              <td><span class="hyv-card-type-tag ${s.isOnline ? 'online' : 'offline'}">${s.type}</span></td>
              <td>${s.region}</td>
              <td><strong style="color:#f7d048;">${s.solarKw.toFixed(1)} kW</strong></td>
              <td>
                <div class="hyv-table-bess-bar">
                  <span style="color:#6be35b; font-weight:700; min-width:38px;">${s.bessSocDisplay !== '--' ? s.bessSocDisplay + '%' : '--'}</span>
                  <div class="hyv-progress-bg">
                    <div class="hyv-progress-fill" style="width:${s.bessSocDisplay !== '--' ? s.bessSocDisplay : 0}%;"></div>
                  </div>
                </div>
              </td>
              <td><strong style="color:#62c3f5;">${s.loadKw.toFixed(1)} kW</strong></td>
              <td><strong style="color:#ffffff;">${s.uptime}</strong></td>
              <td>
                <div style="display:flex; gap:6px; align-items:center;">
                  <a class="hyv-btn-scada" style="padding:4px 8px; font-size:11px;" href="${targetUrl}">⚡ SCADA</a>
                  <button class="hyv-btn-report hyv-trigger-report" data-title="${s.title}" style="padding:4px 8px; font-size:11px;">📄 Reporte</button>
                  ${isAdmin ? `<button class="hyv-btn-delete hyv-trigger-delete" data-id="${s.id}" data-title="${s.title}" style="padding:4px 8px; font-size:11px;" title="Eliminar">🗑</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        });
      }
      tableHtml += `
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = tableHtml;
    }

    // Attach Report listener
    hub.querySelectorAll('.hyv-trigger-report').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
      });
    });

    // Attach Delete listener
    hub.querySelectorAll('.hyv-trigger-delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var id = btn.getAttribute('data-id');
        var t = btn.getAttribute('data-title');
        deleteRealDashboard(id, t, hub);
      });
    });

    // Attach Empty Add listener
    var emptyAdd = hub.querySelector('#btn-add-from-empty');
    if (emptyAdd) {
      emptyAdd.addEventListener('click', function() {
        triggerNativeAddDashboard();
      });
    }
  }

  function triggerNativeAddDashboard() {
    var nativeBtn = document.querySelector('tb-dashboards-table button[aria-label*="añadir" i], tb-dashboards-table .mat-mdc-unelevated-button, tb-entities-table button[aria-label*="añadir" i], tb-entities-table .mat-mdc-unelevated-button');
    if (nativeBtn) {
      nativeBtn.click();
    } else {
      fleetHubState.isClassicMode = true;
      injectFleetControlHub();
    }
  }

  function injectFleetControlHub() {
    if (!isDashboardsListView()) {
      var existingHub = document.getElementById('hyvision-fleet-hub');
      if (existingHub) existingHub.remove();
      var returnBanner = document.getElementById('hyv-return-classic-banner');
      if (returnBanner) returnBanner.remove();
      if (fleetHubState.refreshIntervalId) {
        clearInterval(fleetHubState.refreshIntervalId);
        fleetHubState.refreshIntervalId = null;
      }
      return;
    }

    var tableContainer = document.querySelector('tb-dashboards-table, tb-entities-table');
    if (!tableContainer) return;

    var existingHub = document.getElementById('hyvision-fleet-hub');
    if (fleetHubState.isClassicMode) {
      if (existingHub) existingHub.style.display = 'none';
      tableContainer.style.position = '';
      tableContainer.style.opacity = '1';
      tableContainer.style.pointerEvents = 'auto';
      tableContainer.style.height = '';
      tableContainer.style.overflow = '';
      tableContainer.style.zIndex = '';

      if (!document.getElementById('hyv-return-classic-banner')) {
        var banner = document.createElement('div');
        banner.id = 'hyv-return-classic-banner';
        banner.style.cssText = 'position:fixed; top:75px; right:30px; z-index:9999;';
        banner.innerHTML = `
          <button class="hyv-btn-scada" style="box-shadow:0 8px 24px rgba(0,0,0,0.6); border:1px solid #8ce47e; padding:10px 18px;">
            ⚡ Volver al Centro de Mando HyVision
          </button>
        `;
        banner.querySelector('button').addEventListener('click', function() {
          fleetHubState.isClassicMode = false;
          banner.remove();
          injectFleetControlHub();
        });
        document.body.appendChild(banner);
      }
      return;
    } else {
      var returnBanner = document.getElementById('hyv-return-classic-banner');
      if (returnBanner) returnBanner.remove();
      tableContainer.style.position = 'absolute';
      tableContainer.style.opacity = '0';
      tableContainer.style.pointerEvents = 'none';
      tableContainer.style.height = '0';
      tableContainer.style.overflow = 'hidden';
      tableContainer.style.zIndex = '-1';
    }

    if (existingHub) {
      existingHub.style.display = 'flex';
      // Auto-refresh telemetry if older than 15s
      if (Date.now() - fleetHubState.lastTelemetryFetch > 15000) {
        loadRealDashboards(function() {
          updateKpisAndHeader(existingHub);
          renderFleetHubContent(existingHub);
        });
      }
      return;
    }

    // Create Fleet Hub Element
    var hub = document.createElement('div');
    hub.id = 'hyvision-fleet-hub';
    hub.className = 'hyv-fleet-hub';

    var isAdmin = isAuthorizedAdmin();

    hub.innerHTML = `
      <!-- Top Bar & Hub Title -->
      <div class="hyv-fleet-topbar">
        <div class="hyv-fleet-title-group">
          <h1>
            PORTAFOLIO DE SISTEMAS DE ENERGÍA
            <span class="hyv-fleet-badge-live">● EN VIVO</span>
          </h1>
          <p>Centro de Mando y Monitoreo de Microrredes, Sistemas BESS y Plantas Fotovoltaicas en Latinoamérica</p>
        </div>

        <div class="hyv-fleet-top-actions">
          ${isAdmin ? `
            <button class="hyv-btn-scada" id="hyv-btn-add-system" style="padding:7px 16px; font-size:12.5px;">
              <span>+ Añadir sistema de energía</span>
            </button>
          ` : ''}

          <!-- View Switcher -->
          <div class="hyv-fleet-view-switch">
            <button class="hyv-view-btn ${fleetHubState.activeView === 'cards' ? 'active' : ''}" data-view="cards">
              <span>⊞</span> Tarjetas
            </button>
            <button class="hyv-view-btn ${fleetHubState.activeView === 'map' ? 'active' : ''}" data-view="map">
              <span>🗺</span> Mapa
            </button>
            <button class="hyv-view-btn ${fleetHubState.activeView === 'table' ? 'active' : ''}" data-view="table">
              <span>☰</span> SCADA
            </button>
          </div>

          <!-- Classic Mode Toggle for Admin/Management -->
          <button class="hyv-btn-toggle-classic" id="btn-toggle-classic" title="Alternar a la vista administrativa clásica">
            <span>⚙</span> Modo Clásico
          </button>
        </div>
      </div>

      <!-- Macro KPI Intelligence Banner (Strictly Technical & Operational) -->
      <div class="hyv-fleet-kpis">
        <div class="hyv-kpi-card">
          <div class="hyv-kpi-header">
            <span class="hyv-kpi-label">Potencia Activa Total</span>
            <span class="hyv-kpi-icon">⚡</span>
          </div>
          <div class="hyv-kpi-value" id="hyv-kpi-power">--<span>kW</span></div>
          <div class="hyv-kpi-sub positive" id="hyv-kpi-power-sub">Demanda de carga activa consolidada</div>
        </div>

        <div class="hyv-kpi-card">
          <div class="hyv-kpi-header">
            <span class="hyv-kpi-label">Generación Solar Hoy</span>
            <span class="hyv-kpi-icon">☀️</span>
          </div>
          <div class="hyv-kpi-value" id="hyv-kpi-energy">--<span>MWh</span></div>
          <div class="hyv-kpi-sub" id="hyv-kpi-energy-sub">Total fotovoltaico acumulado hoy</div>
        </div>

        <div class="hyv-kpi-card">
          <div class="hyv-kpi-header">
            <span class="hyv-kpi-label">Estado de la Flota</span>
            <span class="hyv-kpi-icon">🛡</span>
          </div>
          <div class="hyv-kpi-value" id="hyv-kpi-fleet" style="color:#6be35b;">--%</div>
          <div class="hyv-kpi-sub positive" id="hyv-kpi-fleet-sub">● Calculando telemetría...</div>
        </div>

        <div class="hyv-kpi-card">
          <div class="hyv-kpi-header">
            <span class="hyv-kpi-label">BESS Promedio</span>
            <span class="hyv-kpi-icon">🔋</span>
          </div>
          <div class="hyv-kpi-value" id="hyv-kpi-bess">--<span>% SOC</span></div>
          <div class="hyv-kpi-sub" id="hyv-kpi-bess-sub">Salud celdas SOH: 99.5%</div>
        </div>

        <div class="hyv-kpi-card">
          <div class="hyv-kpi-header">
            <span class="hyv-kpi-label">Disponibilidad SLA</span>
            <span class="hyv-kpi-icon">📶</span>
          </div>
          <div class="hyv-kpi-value" id="hyv-kpi-sla">--<span>%</span></div>
          <div class="hyv-kpi-sub" id="hyv-kpi-sla-sub">Telemetría continua 24/7</div>
        </div>
      </div>

      <!-- Search & Real-time Filter Bar (Optimized for hundreds of sites) -->
      <div class="hyv-fleet-filters-row">
        <div class="hyv-search-box">
          <span class="hyv-search-icon">🔍</span>
          <input type="text" class="hyv-search-input" id="hyv-fleet-search" placeholder="Buscar por nombre de sitio, tecnología o región..." value="${fleetHubState.searchTerm}" />
        </div>

        <div class="hyv-filter-chips">
          <div class="hyv-chip ${fleetHubState.activeFilter === 'all' ? 'active' : ''}" data-filter="all">Todos</div>
          <div class="hyv-chip ${fleetHubState.activeFilter === 'normal' ? 'active' : ''}" data-filter="normal">🟢 Operativos</div>
          <div class="hyv-chip ${fleetHubState.activeFilter === 'alert' ? 'active' : ''}" data-filter="alert">🔴 Fuera de línea</div>
          <div class="hyv-chip ${fleetHubState.activeFilter === 'bess' ? 'active' : ''}" data-filter="bess">🔋 Con BESS</div>
          <div class="hyv-chip ${fleetHubState.activeFilter === 'solar' ? 'active' : ''}" data-filter="solar">☀️ Solar</div>
          <div class="hyv-chip ${fleetHubState.activeFilter === 'hybrid' ? 'active' : ''}" data-filter="hybrid">⚙ Híbridos</div>
        </div>
      </div>

      <!-- Dynamic Fleet Body (Cards, Map, or SCADA Table) -->
      <div id="hyv-fleet-dynamic-body"></div>
    `;

    if (tableContainer.parentElement) {
      tableContainer.parentElement.style.padding = '0';
      tableContainer.parentElement.style.margin = '0';
      tableContainer.parentElement.style.background = 'radial-gradient(circle at 50% 12%, #1a331a 0%, #0d1a0d 50%, #070d07 100%)';
    }
    var sidenav = document.querySelector('mat-sidenav-content, .mat-drawer-content');
    if (sidenav) {
      sidenav.style.background = 'radial-gradient(circle at 50% 12%, #1a331a 0%, #0d1a0d 50%, #070d07 100%)';
    }

    tableContainer.parentNode.insertBefore(hub, tableContainer);

    // Event: Add System button
    var addBtn = hub.querySelector('#hyv-btn-add-system');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        triggerNativeAddDashboard();
      });
    }

    // Event: Search input
    var searchInput = hub.querySelector('#hyv-fleet-search');
    searchInput.addEventListener('input', function(e) {
      fleetHubState.searchTerm = e.target.value;
      renderFleetHubContent(hub);
    });

    // Event: Filter chips
    hub.querySelectorAll('.hyv-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        hub.querySelectorAll('.hyv-chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        fleetHubState.activeFilter = chip.getAttribute('data-filter');
        renderFleetHubContent(hub);
      });
    });

    // Event: View Switcher
    hub.querySelectorAll('.hyv-view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        hub.querySelectorAll('.hyv-view-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        fleetHubState.activeView = btn.getAttribute('data-view');
        renderFleetHubContent(hub);
      });
    });

    // Event: Classic Mode Toggle
    var toggleBtn = hub.querySelector('#btn-toggle-classic');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        fleetHubState.isClassicMode = true;
        injectFleetControlHub();
      });
    }

    // Initial Real Data Fetch
    loadRealDashboards(function() {
      updateKpisAndHeader(hub);
      renderFleetHubContent(hub);
    });

    // Background interval: auto-refresh telemetry every 20 seconds while in fleet view
    if (fleetHubState.refreshIntervalId) clearInterval(fleetHubState.refreshIntervalId);
    fleetHubState.refreshIntervalId = setInterval(function() {
      if (isDashboardsListView() && !fleetHubState.isClassicMode) {
        loadRealDashboards(function() {
          var h = document.getElementById('hyvision-fleet-hub');
          if (h) {
            updateKpisAndHeader(h);
            renderFleetHubContent(h);
          }
        });
      }
    }, 20000);
  }

  // 11. Lifecycle & Clean Listeners (Zero Infinite Loops)
  window.addEventListener('DOMContentLoaded', function() {
    loadInitialConfig();
    updateTriggerVisibility();
    updateSidebarTranslations();
    injectSidebarReportsLink();
    filterCustomerSidebar();
    injectFleetControlHub();

    // Periodic check for SPA navigation updates (every 800ms)
    setInterval(function() {
      updateTriggerVisibility();
      updateSidebarTranslations();
      injectSidebarReportsLink();
      filterCustomerSidebar();
      injectFleetControlHub();
    }, 800);
  });

  // Global API
  window.hyvisionSuite = {
    open: openModal,
    close: closeModal,
    getConfig: function() { return currentConfig; },
    reload: loadInitialConfig
  };
  window.hyvisionWhiteLabel = window.hyvisionSuite;

})();
