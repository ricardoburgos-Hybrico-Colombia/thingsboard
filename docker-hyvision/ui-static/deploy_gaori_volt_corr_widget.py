import urllib.request
import json
import ssl
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://10.55.150.174:8082"
GAORI_DASH_ID = "8b81f730-be69-11f1-a395-4fe608e17de1"
TARGET_WIDGET_INSTANCE = "f2501c3a-d82d-edd2-7bcf-ebbd988a07f9"
GAORI_ALIAS_ID = "68411acd-78fd-4271-bed2-9f5df57811e5"
NEW_WIDGET_FQN = "scada_voltaje_corriente_gaori"
ORIG_WIDGET_ID = "f95b62d0-be6b-11f1-a395-4fe608e17de1"

print("==========================================================================")
print("=== DEPLOYMENT: WIDGET DEDICADO TENSIÓN, CORRIENTE Y CELDA MÍN GAORI ===")
print("==========================================================================")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Login
print("\n[1/6] Autenticando en ThingsBoard API...")
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req_login = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_login, context=ctx) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("-> Autenticado con éxito.")

# 2. Leer archivos locales
print("\n[2/6] Leyendo archivos locales (HTML, CSS, JS)...")
base_dir = os.path.dirname(__file__)
with open(os.path.join(base_dir, "scada_voltaje_corriente_gaori.html"), "r", encoding="utf-8") as f:
    html_content = f.read()
with open(os.path.join(base_dir, "scada_voltaje_corriente_gaori.css"), "r", encoding="utf-8") as f:
    css_content = f.read()
with open(os.path.join(base_dir, "scada_voltaje_corriente_gaori.js"), "r", encoding="utf-8") as f:
    js_content = f.read()

# 3. Comprobar / Crear Widget Type DEDICADO
print(f"\n[3/6] Gestionando Widget Type dedicado '{NEW_WIDGET_FQN}'...")
existing_new_widget = None
try:
    req_check = urllib.request.Request(f"{BASE_URL}/api/widgetType?fqn=tenant.{NEW_WIDGET_FQN}", headers=headers)
    existing_new_widget = json.loads(urllib.request.urlopen(req_check, context=ctx).read().decode("utf-8"))
    print(f"  Widget Type ya existe. ID: {existing_new_widget.get('id', {}).get('id')}")
except Exception:
    try:
        req_check2 = urllib.request.Request(f"{BASE_URL}/api/widgetType?fqn={NEW_WIDGET_FQN}", headers=headers)
        existing_new_widget = json.loads(urllib.request.urlopen(req_check2, context=ctx).read().decode("utf-8"))
        print(f"  Widget Type ya existe. ID: {existing_new_widget.get('id', {}).get('id')}")
    except Exception:
        print("  Widget Type no existe aún. Se creará nuevo.")

widget_type_payload = {
    "name": "SCADA GAORI - Tendencia Tensión, Corriente y Celda Mín BESS",
    "fqn": NEW_WIDGET_FQN,
    "deprecated": False,
    "scada": False,
    "descriptor": {
        "type": "timeseries",
        "sizeX": 12,
        "sizeY": 8,
        "resources": [
            {"url": "/echarts.min.js"}
        ],
        "templateHtml": html_content,
        "templateCss": css_content,
        "controllerScript": js_content,
        "settingsSchema": "{}",
        "dataKeySettingsSchema": "{}",
        "defaultConfig": json.dumps({
            "datasources": [{
                "type": "entity",
                "entityAliasId": GAORI_ALIAS_ID,
                "dataKeys": [
                    {"name": "vbat_promedio", "type": "timeseries", "label": "vbat_promedio", "color": "#38bdf8"},
                    {"name": "ibat_total", "type": "timeseries", "label": "ibat_total", "color": "#f59e0b"},
                    {"name": "demanda_carga_kw", "type": "timeseries", "label": "demanda_carga_kw", "color": "#ffffff"},
                    {"name": "min_volt_celda_mv", "type": "timeseries", "label": "min_volt_celda_mv", "color": "#ec4899"}
                ]
            }],
            "timewindow": {"realtime": {"timewindowMs": 3600000}},
            "showTitle": False,
            "backgroundColor": "transparent",
            "title": "Tendencia Tensión y Corriente BESS Industrial",
            "useDashboardTimewindow": True,
            "enableFullscreen": True
        })
    }
}

if existing_new_widget:
    widget_type_payload["id"] = existing_new_widget.get("id")
    widget_type_payload["createdTime"] = existing_new_widget.get("createdTime")
    widget_type_payload["tenantId"] = existing_new_widget.get("tenantId")

req_save_wt = urllib.request.Request(
    f"{BASE_URL}/api/widgetType",
    data=json.dumps(widget_type_payload).encode("utf-8"),
    headers=headers
)
with urllib.request.urlopen(req_save_wt, context=ctx) as resp:
    saved_wt = json.loads(resp.read().decode("utf-8"))

dedicated_wt_id = saved_wt.get("id", {}).get("id")
dedicated_wt_fqn = saved_wt.get("fqn")
print(f"-> Widget Type dedicado guardado con éxito. ID: {dedicated_wt_id} | FQN: {dedicated_wt_fqn}")

# 4. Actualizar Dashboard GAORI
print(f"\n[4/6] Actualizando Dashboard GAORI ({GAORI_DASH_ID})...")
req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/{GAORI_DASH_ID}", headers=headers)
with urllib.request.urlopen(req_dash, context=ctx) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

target_widget = dash.get("configuration", {}).get("widgets", {}).get(TARGET_WIDGET_INSTANCE)
if not target_widget:
    print(f"ERROR: No se encontró la instancia {TARGET_WIDGET_INSTANCE} en el dashboard GAORI!")
    sys.exit(1)

# Asignar nuevo widgetType FQN dedicado
target_widget["type"] = "timeseries"
target_widget["typeFullFqn"] = f"tenant.{dedicated_wt_fqn}"
target_widget["config"]["useDashboardTimewindow"] = True
target_widget["config"]["enableFullscreen"] = True
target_widget["config"]["title"] = "Tendencia Tensión y Corriente BESS Industrial"

# Garantizar datasources con las 4 series optimizadas
target_widget["config"]["datasources"] = [{
    "type": "entity",
    "name": None,
    "entityAliasId": GAORI_ALIAS_ID,
    "dataKeys": [
        {"name": "vbat_promedio", "label": "Tensión Bus DC (V)", "type": "timeseries", "color": "#38bdf8", "settings": {}, "_hash": 0.11},
        {"name": "ibat_total", "label": "Corriente BESS (A)", "type": "timeseries", "color": "#f59e0b", "settings": {}, "_hash": 0.22},
        {"name": "demanda_carga_kw", "label": "Demanda AC (kW)", "type": "timeseries", "color": "#ffffff", "settings": {}, "_hash": 0.33},
        {"name": "min_volt_celda_mv", "label": "Voltaje Mínimo Celda (mV)", "type": "timeseries", "color": "#ec4899", "settings": {}, "_hash": 0.44}
    ]
}]

# Enviar dashboard actualizado
req_save_dash = urllib.request.Request(
    f"{BASE_URL}/api/dashboard",
    data=json.dumps(dash).encode("utf-8"),
    headers=headers
)
with urllib.request.urlopen(req_save_dash, context=ctx) as resp:
    res_dash = json.loads(resp.read().decode("utf-8"))

print("-> Dashboard GAORI actualizado y guardado correctamente en ThingsBoard!")

# Guardar copia local de respaldo actualizada
with open(os.path.join(base_dir, "dashboard_gaori_updated_20261104.json"), "w", encoding="utf-8") as f:
    json.dump(res_dash, f, indent=2, ensure_ascii=False)

# 5. Pruebas de Redundancia y Verificación en Vivo
print("\n[5/6] Ejecutando Pruebas de Redundancia y Validación en Vivo...")

# 5.1 Verificar GAORI live
req_read_gaori = urllib.request.Request(f"{BASE_URL}/api/dashboard/{GAORI_DASH_ID}", headers=headers)
with urllib.request.urlopen(req_read_gaori, context=ctx) as resp:
    live_gaori = json.loads(resp.read().decode("utf-8"))

live_w = live_gaori["configuration"]["widgets"][TARGET_WIDGET_INSTANCE]
print(f"  [GAORI OK] Instancia: {TARGET_WIDGET_INSTANCE}")
print(f"  [GAORI OK] typeFullFqn: {live_w.get('typeFullFqn')}")
print(f"  [GAORI OK] useDashboardTimewindow: {live_w.get('config', {}).get('useDashboardTimewindow')}")
print(f"  [GAORI OK] enableFullscreen: {live_w.get('config', {}).get('enableFullscreen')}")
keys_verified = [k["name"] for k in live_w["config"]["datasources"][0]["dataKeys"]]
print(f"  [GAORI OK] dataKeys configuradas: {keys_verified}")

assert live_w.get("typeFullFqn") == f"tenant.{dedicated_wt_fqn}", "FQN no coincide"
assert "min_volt_celda_mv" in keys_verified, "min_volt_celda_mv no está en las llaves"

# 5.2 Verificar que el widget ORIGINAL de Telecom NO FUE TOCADO
req_orig_wt = urllib.request.Request(f"{BASE_URL}/api/widgetType/{ORIG_WIDGET_ID}", headers=headers)
with urllib.request.urlopen(req_orig_wt, context=ctx) as resp:
    orig_wt = json.loads(resp.read().decode("utf-8"))

print(f"\n  [TELECOM ORIGINAL OK] Widget Type: {orig_wt.get('name')} (ID: {ORIG_WIDGET_ID})")
print(f"  [TELECOM ORIGINAL OK] FQN: {orig_wt.get('fqn')}")
assert orig_wt.get("fqn") == "tendencia_voltaje_corriente_scada", "El FQN original cambió!"
assert orig_wt.get("id", {}).get("id") == ORIG_WIDGET_ID, "El ID original cambió!"

# 5.3 Verificar aislamiento estricto en los 15 sitios de Telecom
print("\n[6/6] Verificando aislamiento estricto en los 15 sitios de Telecom...")
req_all_dash = urllib.request.Request(f"{BASE_URL}/api/tenant/dashboards?pageSize=100&page=0", headers=headers)
all_dashboards = json.loads(urllib.request.urlopen(req_all_dash, context=ctx).read().decode("utf-8")).get("data", [])

telecom_count = 0
for d in all_dashboards:
    d_id = d.get("id", {}).get("id")
    d_title = d.get("title")
    if d_id == GAORI_DASH_ID:
        continue
    telecom_count += 1
    # Fetch full dashboard of telecom site
    req_t = urllib.request.Request(f"{BASE_URL}/api/dashboard/{d_id}", headers=headers)
    t_dash = json.loads(urllib.request.urlopen(req_t, context=ctx).read().decode("utf-8"))
    t_widgets = t_dash.get("configuration", {}).get("widgets", {})
    for tw_id, tw in t_widgets.items():
        tw_fqn = tw.get("typeFullFqn", "")
        if NEW_WIDGET_FQN in tw_fqn:
            print(f"CRÍTICO: El widget dedicado {NEW_WIDGET_FQN} fue encontrado en Telecom '{d_title}'!")
            sys.exit(1)

print(f"  [AISLAMIENTO TOTAL] Se verificaron los {telecom_count} dashboards de Telecom.")
print(f"  [AISLAMIENTO TOTAL] Ningún sitio de Telecom contiene '{NEW_WIDGET_FQN}'.")
print("\n>>> DEPLIEGUE, REDUNDANCIA Y CALIDAD DE INFORMACIÓN COMPLETADOS AL 100%! <<<")
