/**
 * HyVision White-Labeling Module (Client-Side)
 * - Carga configuración de marca de forma ultra-ligera y sin bucles.
 * - En la pantalla de login: NO muestra el botón flotante.
 * - Dentro de la plataforma (usuario autenticado): Muestra el botón de Marca Blanca para el administrador.
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
    customCss: ""
  };

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

    // Only reload CSS link when explicitly requested (e.g. on save)
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

  // Strictly decode JWT token to check if user has TENANT_ADMIN or SYS_ADMIN authority
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
      // STRICT RBAC: Customer Users (CUSTOMER_USER) are NOT authorized!
      return scopes.indexOf('TENANT_ADMIN') !== -1 || scopes.indexOf('SYS_ADMIN') !== -1;
    } catch (e) {
      return false;
    }
  }

  // 5. Update Trigger Button Visibility (Role-Based Access Control)
  function updateTriggerVisibility() {
    var existingBtn = document.querySelector('.hyvision-wl-trigger');

    // Rule 1: NEVER show on login page!
    // Rule 2: NEVER show for Customer Users or unauthenticated guests!
    if (isLoginPage() || !isAuthorizedAdmin()) {
      if (existingBtn) {
        existingBtn.remove();
      }
      return;
    }

    // Only show if user is TENANT_ADMIN or SYS_ADMIN inside the platform
    if (!existingBtn) {
      createTriggerButton();
    }
  }

  // 6. Create Trigger Button (Only for Tenant Admin & SysAdmin)
  function createTriggerButton() {
    if (document.querySelector('.hyvision-wl-trigger')) return;
    if (isLoginPage() || !isAuthorizedAdmin()) return;

    var btn = document.createElement('button');
    btn.className = 'hyvision-wl-trigger';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.59 10.59 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
      </svg>
      <span>Marca Blanca</span>
    `;
    btn.title = "Personalizar Marca Blanca y Apariencia (HyVision)";
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  // 7. Create White-Labeling Modal Dialog
  function createWhiteLabelModal() {
    if (document.querySelector('.hyvision-wl-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'hyvision-wl-overlay';

    overlay.innerHTML = `
      <div class="hyvision-wl-modal">
        <div class="hyvision-wl-header">
          <div class="hyvision-wl-header-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64B856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <h2>Personalización & Marca Blanca</h2>
            <span class="hyvision-wl-badge">HyVision</span>
          </div>
          <button class="hyvision-wl-close" id="hyvision-wl-close-btn" title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="hyvision-wl-body">
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

          <!-- Notificaciones Telegram 24/7 -->
          <div class="hyvision-wl-section">
            <div class="hyvision-wl-section-title">
              <span>📲</span> Notificaciones Críticas por Telegram (24/7 Gratis)
            </div>
            <div class="hyvision-wl-form-grid">
              <div class="hyvision-wl-field hyvision-wl-form-full" style="flex-direction:row; align-items:center; gap:10px;">
                <input type="checkbox" id="wl-telegramEnabled" style="width:18px; height:18px; accent-color:#64B856; cursor:pointer;">
                <label for="wl-telegramEnabled" class="hyvision-wl-label" style="cursor:pointer; font-weight:600; color:#ffffff;">
                  Activar Despacho Automático de Alertas a Telegram
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

        <div class="hyvision-wl-footer">
          <button class="hyvision-wl-btn hyvision-wl-btn-reset" id="wl-btn-reset">Restablecer valores de fábrica</button>
          <div class="hyvision-wl-actions">
            <button class="hyvision-wl-btn hyvision-wl-btn-cancel" id="wl-btn-cancel">Cancelar</button>
            <button class="hyvision-wl-btn hyvision-wl-btn-save" id="wl-btn-save">Guardar y Aplicar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners inside modal
    document.getElementById('hyvision-wl-close-btn').addEventListener('click', closeModal);
    document.getElementById('wl-btn-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

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

    // Save Action
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
        saveBtn.innerText = 'Guardar y Aplicar';
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
        saveBtn.innerText = 'Guardar y Aplicar';
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

  function syncColorField(textId, pickerId) {
    var txt = document.getElementById(textId);
    var pkr = document.getElementById(pickerId);
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
    document.getElementById('wl-appTitle').value = cfg.appTitle || '';
    document.getElementById('wl-appSubtitle').value = cfg.appSubtitle || '';
    document.getElementById('wl-browserTitle').value = cfg.browserTitle || '';
    document.getElementById('wl-primaryColor').value = cfg.primaryColor || '#436A3C';
    document.getElementById('wl-primaryColor-picker').value = cfg.primaryColor || '#436A3C';
    document.getElementById('wl-loginCardColor').value = cfg.loginCardColor || '#2b4c23';
    document.getElementById('wl-cardColor-picker').value = cfg.loginCardColor || '#2b4c23';
    document.getElementById('wl-backgroundColor').value = cfg.backgroundColor || '#173117';
    document.getElementById('wl-bgColor-picker').value = cfg.backgroundColor || '#173117';
    document.getElementById('wl-backgroundMode').value = cfg.backgroundMode || 'dark_scada';
    document.getElementById('wl-logoLoginUrl').value = cfg.logoLoginUrl || '';
    document.getElementById('wl-customCss').value = cfg.customCss || '';
    document.getElementById('wl-telegramEnabled').checked = !!cfg.telegramEnabled;
    document.getElementById('wl-telegramBotToken').value = cfg.telegramBotToken || '';
    document.getElementById('wl-telegramChatId').value = cfg.telegramChatId || '';
    var resSpan = document.getElementById('wl-telegram-test-result');
    if (resSpan) resSpan.innerText = '';
  }

  function openModal() {
    if (!isAuthorizedAdmin()) {
      alert("Acceso restringido: Solo los administradores (Tenant / Sysadmin) pueden modificar la Marca Blanca.");
      return;
    }
    createWhiteLabelModal();
    populateForm(currentConfig);
    var overlay = document.querySelector('.hyvision-wl-overlay');
    if (overlay) overlay.classList.add('active');
  }

  function closeModal() {
    var overlay = document.querySelector('.hyvision-wl-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 8. Lifecycle & Clean Listeners (Zero Infinite Loops)
  window.addEventListener('DOMContentLoaded', function() {
    loadInitialConfig();
    updateTriggerVisibility();

    // Check visibility on route change or periodically (every 1s)
    setInterval(updateTriggerVisibility, 1000);
  });

  // Global API
  window.hyvisionWhiteLabel = {
    open: openModal,
    close: closeModal,
    getConfig: function() { return currentConfig; },
    reload: loadInitialConfig
  };

})();
