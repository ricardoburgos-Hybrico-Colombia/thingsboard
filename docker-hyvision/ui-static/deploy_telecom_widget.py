import urllib.request
import json
import os

# 1. Login to ThingsBoard
login_url = "http://localhost:8082/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 2. Read widget template files
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "telecom_planta_fuerza_adaptive.html"), "r", encoding="utf-8") as f:
    w_html = f.read()
with open(os.path.join(base_dir, "telecom_planta_fuerza_adaptive.css"), "r", encoding="utf-8") as f:
    w_css = f.read()
with open(os.path.join(base_dir, "telecom_planta_fuerza_adaptive.js"), "r", encoding="utf-8") as f:
    w_js = f.read()

# 3. Check if widget already exists or create new
fqn_target = "telecom_planta_fuerza_dc_scada"
check_url = f"http://localhost:8082/api/widgetType?fqn=tenant.{fqn_target}"
existing_wid = None
try:
    with urllib.request.urlopen(urllib.request.Request(check_url, headers=headers)) as resp:
        w_exist = json.loads(resp.read().decode("utf-8"))
        if w_exist and w_exist.get("id"):
            existing_wid = w_exist["id"]["id"]
            print(f"Widget already exists with ID: {existing_wid}")
except Exception:
    pass

new_widget_payload = {
    "tenantId": {
        "entityType": "TENANT",
        "id": "db80e5d0-be68-11f1-a395-4fe608e17de1"
    },
    "fqn": fqn_target,
    "name": "SCADA - Planta de Fuerza DC & Cargador Solar (Telecom 48V)",
    "deprecated": False,
    "scada": False,
    "descriptor": {
        "type": "latest",
        "sizeX": 11,
        "sizeY": 4,
        "resources": [],
        "templateHtml": w_html,
        "templateCss": w_css,
        "controllerScript": w_js,
        "settingsSchema": "{}",
        "dataKeySettingsSchema": "{}",
        "defaultConfig": "{}"
    }
}

if existing_wid:
    new_widget_payload["id"] = {"entityType": "WIDGET_TYPE", "id": existing_wid}

create_req = urllib.request.Request(
    "http://localhost:8082/api/widgetType",
    data=json.dumps(new_widget_payload).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(create_req) as resp:
    created_w = json.loads(resp.read().decode("utf-8"))
    new_wid = created_w["id"]["id"]
    print(f"Widget type created/updated successfully! ID: {new_wid}")

# 4. Migrate the 15 Telecom Dashboards
# Find dashboards for all telecom sites
d_list_req = urllib.request.Request("http://localhost:8082/api/tenant/dashboards?pageSize=50&page=0", headers=headers)
with urllib.request.urlopen(d_list_req) as resp:
    all_dashboards = json.loads(resp.read().decode("utf-8")).get("data", [])

telecom_keys = [
    {"name": "solar_charger_voltage", "type": "timeseries", "label": "solar_charger_voltage", "color": "#38bdf8", "settings": {}},
    {"name": "solar_charger_current", "type": "timeseries", "label": "solar_charger_current", "color": "#f59e0b", "settings": {}},
    {"name": "solar_charger_power_kw", "type": "timeseries", "label": "solar_charger_power_kw", "color": "#64B856", "settings": {}},
    {"name": "solar_power_kw", "type": "timeseries", "label": "solar_power_kw", "color": "#64B856", "settings": {}},
    {"name": "battery_voltage", "type": "timeseries", "label": "battery_voltage", "color": "#2196f3", "settings": {}},
    {"name": "battery_current", "type": "timeseries", "label": "battery_current", "color": "#ff9800", "settings": {}},
    {"name": "battery_power_kw", "type": "timeseries", "label": "battery_power_kw", "color": "#4caf50", "settings": {}},
    {"name": "battery_soc", "type": "timeseries", "label": "battery_soc", "color": "#8bc34a", "settings": {}},
    {"name": "rectifier_voltage", "type": "timeseries", "label": "rectifier_voltage", "color": "#00bcd4", "settings": {}},
    {"name": "rectifier_current", "type": "timeseries", "label": "rectifier_current", "color": "#c084fc", "settings": {}},
    {"name": "rectifier_power_kw", "type": "timeseries", "label": "rectifier_power_kw", "color": "#9c27b0", "settings": {}},
    {"name": "ambient_temperature", "type": "timeseries", "label": "ambient_temperature", "color": "#fb923c", "settings": {}},
    {"name": "grid_available", "type": "timeseries", "label": "grid_available", "color": "#eab308", "settings": {}}
]

migrated_count = 0
for d in all_dashboards:
    d_title = d.get("title", "")
    d_id = d["id"]["id"]
    if d_title == "EPM_GAORI":
        print("Skipping EPM_GAORI (keeps PBD250 industrial widget)")
        continue

    # Fetch full dashboard config
    get_d_req = urllib.request.Request(f"http://localhost:8082/api/dashboard/{d_id}", headers=headers)
    with urllib.request.urlopen(get_d_req) as d_resp:
        dash_obj = json.loads(d_resp.read().decode("utf-8"))

    widgets = dash_obj.get("configuration", {}).get("widgets", {})
    updated = False
    for w_key, w in widgets.items():
        w_title = w.get("config", {}).get("title", "")
        w_fqn = w.get("typeFullFqn", "")
        # Identify the DC power / string widget in Telecom
        if "tableros dc" in w_title.lower() or "pbd_tableros_dc" in w_fqn or "planta de fuerza" in w_title.lower():
            w["typeId"] = new_wid
            w["typeFullFqn"] = f"tenant.{fqn_target}"
            w["config"]["title"] = "Planta de Fuerza DC & Cargador Solar"
            if w.get("config", {}).get("datasources"):
                w["config"]["datasources"][0]["dataKeys"] = telecom_keys
            updated = True

    if updated:
        save_d_req = urllib.request.Request(
            "http://localhost:8082/api/dashboard",
            data=json.dumps(dash_obj).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(save_d_req) as s_resp:
            print(f"Migrated dashboard {d_title} ({d_id}) to dedicated Telecom 48V widget!")
            migrated_count += 1

print(f"\nAll done! Successfully migrated {migrated_count} telecom dashboards.")
