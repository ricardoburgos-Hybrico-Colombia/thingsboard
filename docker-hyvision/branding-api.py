#!/usr/bin/env python3
import json
import os
import sys
import base64
import time
import urllib.request
import urllib.error
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

CONFIG_PATH = os.environ.get("HYVISION_CONFIG_PATH", "/usr/share/nginx/html/hyvision-config.json")
CSS_PATH = os.environ.get("HYVISION_CSS_PATH", "/usr/share/nginx/html/dynamic-branding.css")
PORT = int(os.environ.get("HYVISION_API_PORT", 8085))

DEFAULT_CONFIG = {
    "appTitle": "HYVISION",
    "appSubtitle": "POWERED BY HYBRICO ENERGY",
    "browserTitle": "HyVision",
    "primaryColor": "#436A3C",
    "loginCardColor": "#2b4c23",
    "backgroundColor": "#173117",
    "backgroundMode": "dark_scada",
    "logoLoginUrl": "assets/logo_title_white.png",
    "logoToolbarUrl": "assets/logo_title_white.png",
    "faviconUrl": "thingsboard.ico",
    "customCss": "",
    "telegramEnabled": False,
    "telegramBotToken": "",
    "telegramChatId": "",
    "telegramAlertSeverity": "CRITICAL"
}

# Cooldown memory store for anti-spam (5 minutes per device+alarm)
alert_cooldown = {}

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                merged = DEFAULT_CONFIG.copy()
                merged.update(loaded)
                return merged
        except Exception as e:
            print(f"Error reading config: {e}")
    return DEFAULT_CONFIG.copy()

def generate_css(config):
    primary = config.get("primaryColor", "#436A3C")
    card_color = config.get("loginCardColor", "#2b4c23")
    bg_color = config.get("backgroundColor", "#173117")
    mode = config.get("backgroundMode", "dark_scada")
    custom_css = config.get("customCss", "")

    if mode == "dark_scada":
        bg_css = f"radial-gradient(circle at 50% 36%, {bg_color} 0%, #0c1c0c 48%, #070e07 100%) !important"
    elif mode == "clean_light":
        bg_css = f"linear-gradient(135deg, #f0f5f0 0%, #e2ece2 100%) !important"
    else:
        bg_css = f"{bg_color} !important"

    css = f"""/* HyVision Dynamic White-Label Styles */
:root {{
  --hyvision-primary: {primary};
  --hyvision-login-card: {card_color};
  --hyvision-bg: {bg_color};
}}

body, html, tb-login, .tb-login-content, .tb-login-content.mat-app-background {{
  background: {bg_css};
}}

.hyvision-login-header .hyvision-main-title {{
  text-shadow: 0 0 45px {primary}cc, 0 4px 20px rgba(0, 0, 0, 0.9) !important;
}}

.tb-login-content mat-card, .tb-login-content .mat-mdc-card {{
  background: linear-gradient(165deg, {card_color} 0%, rgba(20, 39, 17, 0.95) 100%) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px {primary}40 !important;
}}

.tb-login-content .tb-login-form .tb-action-button {{
  background: linear-gradient(135deg, {primary} 0%, #2f4e2a 100%) !important;
  box-shadow: 0 6px 20px {primary}80 !important;
}}

.mat-mdc-unelevated-button.mat-primary,
.mat-mdc-raised-button.mat-primary,
.mat-mdc-flat-button.mat-primary {{
  background-color: {primary} !important;
}}

/* Custom user CSS overrides */
{custom_css}
"""
    return css

def save_config(config):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        css_content = generate_css(config)
        with open(CSS_PATH, "w", encoding="utf-8") as f:
            f.write(css_content)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

def is_admin_token(auth_header):
    if not auth_header:
        return False
    try:
        token = auth_header.replace("Bearer ", "").strip()
        parts = token.split(".")
        if len(parts) < 2:
            return False
        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        scopes = payload.get("scopes", [])
        return "TENANT_ADMIN" in scopes or "SYS_ADMIN" in scopes
    except Exception as e:
        print(f"Auth check error: {e}")
        return False

def send_telegram_message(bot_token, chat_id, text):
    if not bot_token or not chat_id:
        return False, "Bot token o Chat ID no configurados"
    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
    payload = json.dumps({
        "chat_id": str(chat_id).strip(),
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return True, "Mensaje enviado exitosamente"
            else:
                return False, data.get("description", "Error desconocido de Telegram")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            return False, err_json.get("description", str(e))
        except Exception:
            return False, f"HTTP Error {e.code}: {e.reason}"
    except Exception as e:
        return False, str(e)

class BrandingHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Authorization, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/hyvision/branding"):
            config = load_config()
            data = json.dumps(config).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self._send_cors()
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

    def do_POST(self):
        # 1. Telegram Alert Endpoint (receives alerts from Rule Engine or internal services)
        if self.path.startswith("/api/hyvision/telegram/alert"):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                alert_data = json.loads(body)
            except Exception:
                alert_data = {}

            current = load_config()
            if not current.get("telegramEnabled"):
                res = {"status": "skipped", "message": "Notificaciones de Telegram desactivadas"}
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            bot_token = current.get("telegramBotToken", "")
            chat_id = current.get("telegramChatId", "")
            if not bot_token or not chat_id:
                res = {"status": "error", "message": "Bot token o Chat ID no configurados"}
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            device_name = alert_data.get("deviceName", "Dispositivo BESS")
            alarm_type = alert_data.get("alarmType", "Alerta Crítica")
            severity = alert_data.get("severity", "CRITICAL")
            details = alert_data.get("details", "")
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Anti-spam: 300s cooldown per device + alarmType
            cooldown_key = f"{device_name}:{alarm_type}"
            now_ts = time.time()
            if cooldown_key in alert_cooldown and (now_ts - alert_cooldown[cooldown_key]) < 300:
                res = {"status": "throttled", "message": "Alerta suprimida por enfriamiento anti-spam (5 min)"}
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            alert_cooldown[cooldown_key] = now_ts

            telemetry = alert_data.get("telemetry", {})
            telemetry_lines = ""
            if isinstance(telemetry, dict):
                for k, v in telemetry.items():
                    telemetry_lines += f"• *{k}:* `{v}`\n"

            msg_text = (
                "🚨 *ALERTA CRÍTICA — HYVISION SOLAR*\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                f"📍 *Dispositivo:* `{device_name}`\n"
                f"⚠️ *Alarma:* *{alarm_type}*\n"
                f"🔴 *Severidad:* `{severity}`\n"
                f"🕒 *Hora:* `{now_str}`\n"
            )
            if details:
                msg_text += f"📝 *Detalle:* {details}\n"
            if telemetry_lines:
                msg_text += f"\n📊 *Telemetría:*\n{telemetry_lines}"
            msg_text += (
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "👉 [Abrir Monitoreo SCADA en Vivo](http://localhost:8082)\n"
            )

            success, send_msg = send_telegram_message(bot_token, chat_id, msg_text)
            status_code = 200 if success else 400
            res = {"status": "ok" if success else "error", "message": send_msg}
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 2. Endpoints requiring Admin Authorization
        auth_header = self.headers.get("X-Authorization") or self.headers.get("Authorization")
        if not is_admin_token(auth_header):
            self.send_response(403)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "forbidden",
                "message": "Acceso denegado: solo administradores (Tenant / Sysadmin) pueden modificar la configuración"
            }).encode("utf-8"))
            return

        # 3. Telegram Test Endpoint
        if self.path.startswith("/api/hyvision/telegram/test"):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            current = load_config()
            bot_token = data.get("botToken") or current.get("telegramBotToken", "")
            chat_id = data.get("chatId") or current.get("telegramChatId", "")
            
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            test_msg = (
                "☀️ *HYVISION IOT — NOTIFICACIÓN DE PRUEBA*\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "✅ *Conexión con Telegram Exitosa*\n"
                "🤖 *Bot:* Vinculado y operativo 24/7\n"
                "🏢 *Instalación:* Hybrico Solar / Parque BESS\n"
                f"🕒 *Fecha y Hora:* `{now_str}`\n"
                "━━━━━━━━━━━━━━━━━━━━━━\n"
                "🔔 *A partir de ahora, las alertas críticas de telemetría y fallas de planta se notificarán de forma inmediata en este chat.*"
            )
            success, msg = send_telegram_message(bot_token, chat_id, test_msg)
            if success:
                res = {"status": "ok", "message": "¡Mensaje de prueba enviado con éxito a Telegram!"}
                self.send_response(200)
            else:
                res = {"status": "error", "message": f"Error de Telegram: {msg}"}
                self.send_response(400)
                
            data = json.dumps(res).encode("utf-8")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(data)
            return

        # 4. Reset Branding
        if self.path.startswith("/api/hyvision/branding/reset"):
            save_config(DEFAULT_CONFIG)
            data = json.dumps({"status": "ok", "message": "Restablecido a valores de fábrica", "config": DEFAULT_CONFIG}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(data)
            return

        # 5. Save Branding & Config
        if self.path.startswith("/api/hyvision/branding"):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                new_config = json.loads(body)
                current = load_config()
                current.update(new_config)
                if save_config(current):
                    res = {"status": "ok", "message": "Configuración guardada correctamente", "config": current}
                    self.send_response(200)
                else:
                    res = {"status": "error", "message": "Error al guardar en disco"}
                    self.send_response(500)
            except Exception as e:
                res = {"status": "error", "message": str(e)}
                self.send_response(400)

            data = json.dumps(res).encode("utf-8")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

def run():
    save_config(load_config())
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, BrandingHandler)
    print(f"HyVision White-Labeling & Telegram API running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == "__main__":
    run()
