import urllib.request
import json
import ssl
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://10.55.150.174:8082"
DASH_ID = "8b81f730-be69-11f1-a395-4fe608e17de1"

print("=================================================================")
print("=== ACTIVACIÓN DE PANTALLA COMPLETA EN BALANCE DE ENERGÍA =======")
print("=================================================================")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Login
print(f"\n[1/4] Autenticando con ThingsBoard ({BASE_URL})...")
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req_login = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_login, context=ctx) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("-> Autenticado con éxito.")

# 2. Descargar estado actual del Dashboard
print(f"\n[2/4] Descargando estado actual del Dashboard GAORI ({DASH_ID})...")
req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_dash, context=ctx) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

# 3. Modificar enableFullscreen en Balance de Energía (y asegurar en gráficas de tendencia)
widgets = dash.setdefault("configuration", {}).setdefault("widgets", {})
balance_wid = "6c3094d4-1628-a188-2f5b-85682588c8e7"

if balance_wid in widgets:
    w = widgets[balance_wid]
    w_title = w.get("config", {}).get("title")
    prev_ef = w.get("config", {}).get("enableFullscreen")
    w["config"]["enableFullscreen"] = True
    print(f"-> Activado enableFullscreen: True en widget '{w_title}' ({balance_wid}) (anterior: {prev_ef})")
else:
    print(f"ERROR: Widget {balance_wid} no encontrado!")
    sys.exit(1)

# Asegurar también en Dispersión Térmica para consistencia total en gráficas SCADA
thermal_wid = "2b74186e-820d-216a-f2bd-1edf6a3b619f"
if thermal_wid in widgets:
    widgets[thermal_wid]["config"]["enableFullscreen"] = True
    print(f"-> Activado enableFullscreen: True en 'Tendencia Dispersión Térmica BESS' ({thermal_wid})")

vc_wid = "f2501c3a-d82d-edd2-7bcf-ebbd988a07f9"
if vc_wid in widgets:
    widgets[vc_wid]["config"]["enableFullscreen"] = True
    print(f"-> Activado enableFullscreen: True en 'Tendencia Tensión y Corriente BESS' ({vc_wid})")

# Guardar localmente
base_dir = os.path.dirname(__file__)
local_dash_file = os.path.join(base_dir, "dashboard_gaori_updated_20261103.json")
with open(local_dash_file, "w", encoding="utf-8") as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)
print(f"-> Guardado localmente en: {local_dash_file}")

# 4. Desplegar en ThingsBoard
print(f"\n[3/4] Desplegando en ThingsBoard producción...")
post_data = json.dumps(dash).encode("utf-8")
req_save = urllib.request.Request(f"{BASE_URL}/api/dashboard", data=post_data, headers=headers, method="POST")
with urllib.request.urlopen(req_save, context=ctx) as resp:
    saved = json.loads(resp.read().decode("utf-8"))

print(f"-> Dashboard GAORI actualizado exitosamente en ThingsBoard! ID: {saved['id']['id']}")

# 5. Verificación de lectura
print(f"\n[4/4] Verificando estado en vivo...")
req_verify = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_verify, context=ctx) as resp:
    live = json.loads(resp.read().decode("utf-8"))

live_w = live.get("configuration", {}).get("widgets", {}).get(balance_wid, {})
live_ef = live_w.get("config", {}).get("enableFullscreen")
print(f"  Widget: {live_w.get('config', {}).get('title')} | enableFullscreen: {live_ef}")
assert live_ef == True, "enableFullscreen no se guardó como True"

print("\n>>> PANTALLA COMPLETA ACTIVADA Y VERIFICADA AL 100%! <<<")
