import urllib.request
import json
import os

print("[1/3] Autenticando con ThingsBoard...")
login_url = "http://localhost:8082/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

wid = "f9465430-be6b-11f1-a395-4fe608e17de1"
print(f"[2/3] Actualizando Widget Type Compartido Telecom ({wid})...")

base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "eventos_fallas_telecom.html"), "r", encoding="utf-8") as f:
    telecom_html = f.read()

with open(os.path.join(base_dir, "eventos_fallas_adaptive.css"), "r", encoding="utf-8") as f:
    telecom_css = f.read()

with open(os.path.join(base_dir, "eventos_fallas_telecom.js"), "r", encoding="utf-8") as f:
    telecom_js = f.read()

url = f"http://localhost:8082/api/widgetType/{wid}"
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
    w_data = json.loads(resp.read().decode("utf-8"))

descriptor = w_data.get("descriptor", {})
descriptor["templateHtml"] = telecom_html
descriptor["templateCss"] = telecom_css
descriptor["controllerScript"] = telecom_js
w_data["descriptor"] = descriptor
w_data["name"] = "SCADA Telecom - Registro de Eventos y Fallas"

save_req = urllib.request.Request(
    "http://localhost:8082/api/widgetType",
    data=json.dumps(w_data).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req) as resp:
    saved = json.loads(resp.read().decode("utf-8"))
    print(f"-> Widget Type compartido actualizado: '{saved.get('name')}' ({saved.get('fqn')})")

# 3. Actualizar datasources en los 15 dashboards Telecom
print("[3/3] Actualizando llaves de telemetría en los 15 Dashboards Telecom...")
telecom_keys = [
    "alarmas_activas_total", "faults_30d_total", "warnings_30d_total", "fault_history_json",
    "battery_soc", "soc_promedio", "battery_voltage", "vbat_promedio", "load_dc_voltage",
    "temp_bateria_max", "battery_temperature", "load_power_kw", "demanda_carga_kw", "load_dc_power_kw",
    "solar_power_kw", "generacion_solar_kw", "solar_charger_power_kw", "solar_charger_voltage",
    "grid_power_kw", "grid_voltage", "tension_fase_u", "grid_frequency", "frecuencia_red_hz", "grid_available",
    "dg_potencia_activa_kw", "generator_power_kw", "generator_fuel_level", "generator_runtime_hours",
    "rectifier_power_kw", "rectifier_voltage", "edge_offline_alarm", "system_state_code",
    "battery_autonomy_hours", "site_topology"
]

colors = ["#2196f3", "#4caf50", "#f44336", "#64B856", "#f59e0b", "#38bdf8", "#a855f7"]
data_keys = []
for idx, k in enumerate(telecom_keys):
    data_keys.append({
        "name": k,
        "type": "timeseries",
        "label": k,
        "color": colors[idx % len(colors)],
        "settings": {}
    })

dash_list_url = "http://localhost:8082/api/tenant/dashboards?pageSize=50&page=0"
with urllib.request.urlopen(urllib.request.Request(dash_list_url, headers=headers)) as resp:
    dashboards = json.loads(resp.read().decode("utf-8")).get("data", [])

updated_dash_count = 0
for d in dashboards:
    did = d["id"]["id"]
    title = d.get("title", "")
    if "GAORI" in title.upper():
        continue # GAORI ya usa su widget dedicado independiente
        
    d_url = f"http://localhost:8082/api/dashboard/{did}"
    try:
        with urllib.request.urlopen(urllib.request.Request(d_url, headers=headers)) as resp:
            d_obj = json.loads(resp.read().decode("utf-8"))
            
        cfg = d_obj.get("configuration", {})
        if isinstance(cfg, str):
            cfg = json.loads(cfg)
            d_obj["configuration"] = cfg
            
        widgets = cfg.get("widgets", {})
        w_inst = widgets.get("052de3af-13b9-f603-76bb-59e4a5e4805d")
        if w_inst:
            w_inst["config"]["title"] = f"Registro de Eventos y Fallas • {title}"
            w_inst["typeFullFqn"] = "tenant.registro_eventos_fallas_scada"
            ds_list = w_inst["config"].get("datasources", [])
            if ds_list:
                ds = ds_list[0]
                ds["dataKeys"] = data_keys
                ds["alarmFilterConfig"] = {"statusList": ["ACTIVE"]}
                
            save_d_req = urllib.request.Request(
                "http://localhost:8082/api/dashboard",
                data=json.dumps(d_obj).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(save_d_req) as resp:
                updated_dash_count += 1
                print(f"  [OK] Dashboard Telecom '{title}' ({did}) actualizado.")
    except Exception as e:
        print(f"  [!] Error actualizando dashboard '{title}': {e}")

print(f"\n>>> ACTUALIZACIÓN EXITOSA: {updated_dash_count} Dashboards Telecom configurados al 100% <<<")
