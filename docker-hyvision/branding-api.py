#!/usr/bin/env python3
import json
import os
import sys
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
    "customCss": ""
}

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
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

import base64

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

        if self.path.startswith("/api/hyvision/branding/reset"):
            save_config(DEFAULT_CONFIG)
            data = json.dumps({"status": "ok", "message": "Restablecido a valores de fábrica", "config": DEFAULT_CONFIG}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors()
            self.end_headers()
            self.wfile.write(data)
            return

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
    # Generate initial dynamic CSS if needed
    save_config(load_config())
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, BrandingHandler)
    print(f"HyVision White-Labeling API running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == "__main__":
    run()
