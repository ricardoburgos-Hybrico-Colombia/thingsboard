import urllib.request
import json
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://10.55.150.174:8082"
DASH_ID = "8b81f730-be69-11f1-a395-4fe608e17de1"
WIDGET_INSTANCE_ID = "2b74186e-820d-216a-f2bd-1edf6a3b619f"
DEVICE_BESS_ID = "64af58e0-be6a-11f1-a395-4fe608e17de1"

print("=============================================================")
print("=== DEPLOYMENT: WIDGET DEDICADO DISPERSIÓN TÉRMICA GAORI ===")
print("=============================================================")

# 1. Login
print(f"\n[1/6] Autenticando con ThingsBoard ({BASE_URL})...")
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req_login = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_login) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("-> Autenticado exitosamente.")

# 2. Descargar estado actual del Dashboard GAORI y respaldar
print(f"\n[2/6] Descargando estado actual del Dashboard GAORI ({DASH_ID})...")
req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_dash) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

backup_path = os.path.join(os.path.dirname(__file__), "dashboard_gaori_backup_pre_termica_20261103.json")
with open(backup_path, "w", encoding="utf-8") as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)
print(f"-> Respaldo íntegro de seguridad guardado en: {backup_path}")

# 3. Leer archivos fuente locales
print("\n[3/6] Leyendo plantillas HTML y JS locales...")
base_dir = os.path.dirname(__file__)
with open(os.path.join(base_dir, "tendencia_termica_adaptive.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

with open(os.path.join(base_dir, "tendencia_termica_adaptive.js"), "r", encoding="utf-8") as f:
    js_content = f.read()

css_content = """
.trend-card-container.therm {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);
  border-radius: 10px;
  border: 1px solid rgba(100, 184, 86, 0.22);
  border-top: 3.5px solid #64B856;
  padding: 12px 18px 10px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  transition: border-top-color 0.3s ease;
}
.trend-card-container.therm.alert { border-top-color: #ef4444; }
.trend-card-container.therm.ok { border-top-color: #64B856; }
.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.trend-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #94a3b8;
}
.trend-icon { font-size: 16px; }
.trend-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
}
.trend-badge.alert {
  color: #ef4444;
  border: 1.5px solid #ef4444;
  background: rgba(239, 68, 68, 0.15);
}
.trend-badge.ok {
  color: #64B856;
  border: 1.5px solid #64B856;
  background: rgba(100, 184, 86, 0.12);
}
.trend-kpi-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(100, 184, 86, 0.12);
  border-radius: 8px;
  padding: 5px 12px 6px 12px;
  margin: 6px 0 4px 0;
}
.kpi-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.kpi-lbl { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
.kpi-val-group { display: flex; align-items: baseline; gap: 4px; }
.kpi-num { font-size: 19px; font-weight: 800; line-height: 1.1; }
.kpi-num.dt-color { color: #64B856; }
.kpi-num.tmax-color { color: #ef4444; }
.kpi-num.tmin-color { color: #38bdf8; }
.kpi-unit { font-size: 12px; font-weight: 600; color: #94a3b8; }
.kpi-sub { font-size: 10px; font-weight: 600; color: #94a3b8; margin-top: 1px; letter-spacing: 0.3px; }
.kpi-divider { width: 1px; height: 32px; background: rgba(148, 163, 184, 0.15); }
.chart-wrapper {
  width: 100%;
  flex: 1;
  min-height: 140px;
  position: relative;
}
.trend-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #64748b;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  padding-top: 4px;
  margin-top: 2px;
}
"""

# 4. Crear o Actualizar Widget Type DEDICADO scada_dispersion_termica_gaori
print("\n[4/6] Verificando Widget Type dedicado 'scada_dispersion_termica_gaori'...")
req_all_w = urllib.request.Request(f"{BASE_URL}/api/widgetTypes?pageSize=500&page=0", headers=headers)
with urllib.request.urlopen(req_all_w) as resp:
    all_w = json.loads(resp.read().decode("utf-8")).get("data", [])

existing_widget = None
for w in all_w:
    if w.get("fqn") == "scada_dispersion_termica_gaori":
        existing_widget = w
        break

widget_type_payload = {
    "name": "SCADA - Dispersión Térmica BESS (ΔT)",
    "fqn": "scada_dispersion_termica_gaori",
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
        "defaultConfig": '{"datasources":[],"timewindow":{"realtime":{"timewindowMs":3600000}},"showTitle":false,"backgroundColor":"transparent","padding":"0px","dropShadow":false}'
    }
}

if existing_widget:
    print(f"-> Widget Type existente encontrado ({existing_widget['id']['id']}). Actualizando...")
    widget_type_payload["id"] = existing_widget["id"]
else:
    print("-> Creando nuevo Widget Type exclusivo 'scada_dispersion_termica_gaori'...")

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
local_wt_file = os.path.join(base_dir, "scada_dispersion_termica_gaori.json")
with open(local_wt_file, "w", encoding="utf-8") as f:
    json.dump(saved_w_type, f, indent=2, ensure_ascii=False)
print(f"-> Definición local guardada en: {local_wt_file}")

# 5. Inyectar el Widget en el Dashboard GAORI
print("\n[5/6] Configurando e inyectando widget en el Dashboard EPM_GAORI...")
widgets_dict = dash.setdefault("configuration", {}).setdefault("widgets", {})
layouts_dict = dash.setdefault("configuration", {}).setdefault("states", {}).setdefault("default", {}).setdefault("layouts", {}).setdefault("main", {}).setdefault("widgets", {})

thermal_widget_config = {
    "id": WIDGET_INSTANCE_ID,
    "type": "timeseries",
    "typeFullFqn": "tenant.scada_dispersion_termica_gaori",
    "typeId": {"entityType": "WIDGET_TYPE", "id": target_widget_type_id},
    "sizeX": 24,
    "sizeY": 6,
    "row": 0,
    "col": 0,
    "config": {
        "title": "Tendencia Dispersión Térmica BESS (ΔT)",
        "showTitle": False,
        "backgroundColor": "transparent",
        "color": "rgba(255, 255, 255, 0.87)",
        "padding": "0px",
        "dropShadow": False,
        "useDashboardTimewindow": True,
        "settings": {},
        "datasources": [
            {
                "type": "device",
                "name": "",
                "deviceId": DEVICE_BESS_ID,
                "dataKeys": [
                    {
                        "name": "delta_temp_bateria",
                        "type": "timeseries",
                        "label": "delta_temp_bateria",
                        "color": "#64B856",
                        "settings": {}
                    },
                    {
                        "name": "temp_bateria_max",
                        "type": "timeseries",
                        "label": "temp_bateria_max",
                        "color": "#ef4444",
                        "settings": {}
                    },
                    {
                        "name": "temp_bateria_min",
                        "type": "timeseries",
                        "label": "temp_bateria_min",
                        "color": "#38bdf8",
                        "settings": {}
                    }
                ],
                "alarmFilterConfig": {
                    "statusList": ["ACTIVE"]
                }
            }
        ]
    }
}

widgets_dict[WIDGET_INSTANCE_ID] = thermal_widget_config

# Posicionar en Layout:
# Row 50: Dispersión Térmica BESS (SizeX 24, SizeY 6)
layouts_dict[WIDGET_INSTANCE_ID] = {
    "row": 50,
    "col": 0,
    "sizeX": 24,
    "sizeY": 6
}

# Desplazar la tabla histórica a Row 56
table_id = "db18c56e-f0d6-f699-c3ae-e93cae4bb739"
if table_id in layouts_dict:
    layouts_dict[table_id]["row"] = 56
    layouts_dict[table_id]["sizeY"] = 9

# Guardar Dashboard actualizado en ThingsBoard
print("-> Enviando actualización del Dashboard a ThingsBoard...")
req_save_dash = urllib.request.Request(
    f"{BASE_URL}/api/dashboard",
    data=json.dumps(dash).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(req_save_dash) as resp:
    saved_dash = json.loads(resp.read().decode("utf-8"))

print(f"-> Dashboard GAORI guardado exitosamente en producción (Total Widgets: {len(saved_dash.get('configuration', {}).get('widgets', {}))})")

# Guardar JSON actualizado en repositorio
local_dash_file = os.path.join(base_dir, "dashboard_gaori_updated_20261103.json")
with open(local_dash_file, "w", encoding="utf-8") as f:
    json.dump(saved_dash, f, indent=2, ensure_ascii=False)
print(f"-> Copia local actualizada guardada en: {local_dash_file}")

# 6. Verificación final
print("\n[6/6] Verificación final de integridad...")
with urllib.request.urlopen(urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)) as resp:
    verify_dash = json.loads(resp.read().decode("utf-8"))

v_widgets = verify_dash.get("configuration", {}).get("widgets", {})
v_layouts = verify_dash.get("configuration", {}).get("states", {}).get("default", {}).get("layouts", {}).get("main", {}).get("widgets", {})

if WIDGET_INSTANCE_ID in v_widgets and WIDGET_INSTANCE_ID in v_layouts:
    pos = v_layouts[WIDGET_INSTANCE_ID]
    print(f"-> VERIFICACIÓN EXITOSA: Widget {WIDGET_INSTANCE_ID} activo en Row {pos.get('row')}, Col {pos.get('col')}, Size ({pos.get('sizeX')}x{pos.get('sizeY')})")
    print(f"-> FQN asignado: {v_widgets[WIDGET_INSTANCE_ID].get('typeFullFqn')}")
else:
    print("-> ADVERTENCIA: No se pudo verificar la presencia del widget en la consulta de retorno.")

print("\n=============================================================")
print("=== DESPLIEGUE FINALIZADO EXITOSAMENTE SIN ERRORES ===")
print("=============================================================")

