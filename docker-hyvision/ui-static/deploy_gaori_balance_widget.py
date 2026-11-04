import urllib.request
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://10.55.150.174:8082"
DASH_ID = "8b81f730-be69-11f1-a395-4fe608e17de1"
WIDGET_INSTANCE_ID = "6c3094d4-1628-a188-2f5b-85682588c8e7"
GAORI_ALIAS_ID = "68411acd-78fd-4271-bed2-9f5df57811e5"

print("================================================================")
print("=== DEPLOYMENT: WIDGET DEDICADO BALANCE ENERGIA GAORI SCADA ===")
print("================================================================")

# 1. Login
print(f"\n[1/5] Autenticando en ThingsBoard ({BASE_URL})...")
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req_login = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_login) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("-> Autenticado con éxito.")

# 2. Descargar estado actual del Dashboard
print(f"\n[2/5] Descargando estado actual del Dashboard GAORI ({DASH_ID})...")
req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_dash) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

# 3. Leer archivos fuente locales
print("\n[3/5] Leyendo HTML, CSS y JS de scada_balance_energia_gaori...")
base_dir = os.path.dirname(__file__)
with open(os.path.join(base_dir, "scada_balance_energia_gaori.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

with open(os.path.join(base_dir, "scada_balance_energia_gaori.css"), "r", encoding="utf-8") as f:
    css_content = f.read()

with open(os.path.join(base_dir, "scada_balance_energia_gaori.js"), "r", encoding="utf-8") as f:
    js_content = f.read()

# 4. Crear o Actualizar Widget Type DEDICADO scada_balance_energia_gaori
print("\n[4/5] Verificando Widget Type dedicado 'scada_balance_energia_gaori'...")
req_all_w = urllib.request.Request(f"{BASE_URL}/api/widgetTypes?pageSize=500&page=0", headers=headers)
with urllib.request.urlopen(req_all_w) as resp:
    all_w = json.loads(resp.read().decode("utf-8")).get("data", [])

existing_widget = None
for w in all_w:
    if w.get("fqn") == "scada_balance_energia_gaori":
        existing_widget = w
        break

widget_type_payload = {
    "name": "SCADA - Balance de Energía Diario y Flujo de Microrred (GAORI)",
    "fqn": "scada_balance_energia_gaori",
    "deprecated": False,
    "scada": False,
    "tenantId": {
        "entityType": "TENANT",
        "id": dash["tenantId"]["id"]
    },
    "descriptor": {
        "type": "timeseries",
        "sizeX": 12,
        "sizeY": 6,
        "resources": [
            {"url": "/echarts.min.js"}
        ],
        "templateHtml": html_content,
        "templateCss": css_content,
        "controllerScript": js_content,
        "settingsSchema": "{}",
        "dataKeySettingsSchema": "{}",
        "defaultConfig": '{"datasources":[],"timewindow":{"realtime":{"timewindowMs":36000000}},"showTitle":false,"backgroundColor":"transparent","padding":"0px","dropShadow":false}'
    }
}

if existing_widget:
    print(f"-> Widget Type existente encontrado ({existing_widget['id']['id']}). Actualizando...")
    widget_type_payload["id"] = existing_widget["id"]
else:
    print("-> Creando nuevo Widget Type exclusivo 'scada_balance_energia_gaori'...")

req_save_w = urllib.request.Request(
    f"{BASE_URL}/api/widgetType",
    data=json.dumps(widget_type_payload).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(req_save_w) as resp:
    saved_w_type = json.loads(resp.read().decode("utf-8"))
    target_widget_type_id = saved_w_type["id"]["id"]

print(f"-> Widget Type guardado con éxito. ID: {target_widget_type_id}, FQN: {saved_w_type.get('fqn')}")

# Guardar copia local en repositorio
local_wt_file = os.path.join(base_dir, "scada_balance_energia_gaori.json")
with open(local_wt_file, "w", encoding="utf-8") as f:
    json.dump(saved_w_type, f, indent=2, ensure_ascii=False)
print(f"-> Definición local guardada en: {local_wt_file}")

# 5. Actualizar el widget en el Dashboard GAORI
print("\n[5/5] Actualizando widget de Balance en el Dashboard EPM_GAORI...")
widgets_dict = dash.setdefault("configuration", {}).setdefault("widgets", {})

if WIDGET_INSTANCE_ID not in widgets_dict:
    print(f"ERROR: Widget {WIDGET_INSTANCE_ID} no encontrado en dashboard!")
    sys.exit(1)

target_widget = widgets_dict[WIDGET_INSTANCE_ID]
target_widget["type"] = "timeseries"
target_widget["typeFullFqn"] = "tenant.scada_balance_energia_gaori"

w_config = target_widget.setdefault("config", {})
w_config["title"] = "BALANCE DE ENERGÍA DIARIO Y FLUJO DE MICRORRED"
w_config["useDashboardTimewindow"] = True

# Asegurar datasource con alias canónico de GAORI
target_widget["config"]["datasources"] = [
    {
        "type": "entity",
        "entityAliasId": GAORI_ALIAS_ID,
        "dataKeys": [
            {
                "name": "energia_solar_hoy",
                "type": "timeseries",
                "label": "Solar",
                "color": "#F59E0B",
                "settings": {}
            },
            {
                "name": "ebat_carga_hoy_kwh",
                "type": "timeseries",
                "label": "BESS In",
                "color": "#A855F7",
                "settings": {}
            },
            {
                "name": "ebat_descarga_hoy_kwh",
                "type": "timeseries",
                "label": "BESS Out",
                "color": "#06B6D4",
                "settings": {}
            },
            {
                "name": "energia_carga_hoy",
                "type": "timeseries",
                "label": "Carga",
                "color": "#10B981",
                "settings": {}
            }
        ],
        "alarmFilterConfig": {
            "statusList": ["ACTIVE"]
        },
        "latestDataKeys": []
    }
]

# Guardar localmente
local_dash_file = os.path.join(base_dir, "dashboard_gaori_updated_20261103.json")
with open(local_dash_file, "w", encoding="utf-8") as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)
print(f"-> Dashboard local guardado en: {local_dash_file}")

# Enviar actualización a ThingsBoard
req_save_dash = urllib.request.Request(
    f"{BASE_URL}/api/dashboard",
    data=json.dumps(dash).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(req_save_dash) as resp:
    deployed_dash = json.loads(resp.read().decode("utf-8"))

print(f"-> Dashboard GAORI actualizado exitosamente en ThingsBoard! ID: {deployed_dash['id']['id']}")
print("\n>>> DEPLOYMENT COMPLETADO CON ÉXITO! <<<")

