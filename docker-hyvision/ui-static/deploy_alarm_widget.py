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
print(f"[2/3] Actualizando Widget Type: {wid}...")
url = f"http://localhost:8082/api/widgetType/{wid}"
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
    w_data = json.loads(resp.read().decode("utf-8"))

base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "eventos_fallas_adaptive.html"), "r", encoding="utf-8") as f:
    new_html = f.read()

with open(os.path.join(base_dir, "eventos_fallas_adaptive.css"), "r", encoding="utf-8") as f:
    new_css = f.read()

with open(os.path.join(base_dir, "eventos_fallas_adaptive.js"), "r", encoding="utf-8") as f:
    new_js = f.read()

descriptor = w_data.get("descriptor", {})
descriptor["templateHtml"] = new_html
descriptor["templateCss"] = new_css
descriptor["controllerScript"] = new_js
w_data["descriptor"] = descriptor

save_req = urllib.request.Request(
    "http://localhost:8082/api/widgetType",
    data=json.dumps(w_data).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req) as resp:
    saved = json.loads(resp.read().decode("utf-8"))
    print(f"-> Widget Type '{w_data.get('name')}' ({w_data.get('fqn')}) actualizado exitosamente.")

# 3. Actualizar configuración del widget en el Dashboard de GAORI
print("[3/3] Actualizando llaves de telemetría en Dashboard EPM_GAORI...")
dash_id = "8b81f730-be69-11f1-a395-4fe608e17de1"
dash_url = f"http://localhost:8082/api/dashboard/{dash_id}"
with urllib.request.urlopen(urllib.request.Request(dash_url, headers=headers)) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

widget_instance_id = "052de3af-13b9-f603-76bb-59e4a5e4805d"
if widget_instance_id in dash.get("configuration", {}).get("widgets", {}):
    w_conf = dash["configuration"]["widgets"][widget_instance_id]
    dev_id = "64af58e0-be6a-11f1-a395-4fe608e17de1"
    
    # Lista integral de llaves de telemetría para alimentar las 33 reglas en vivo
    keys_needed = [
        "alarmas_activas_total", "faults_30d_total", "warnings_30d_total", "fault_history_json",
        "bess_soc", "delta_v_celdas_mv", "max_volt_celda_mv", "min_volt_celda_mv",
        "temp_bateria_max", "temp_bateria_min", "delta_temp_bateria", "temp_igbt_max",
        "pbd_bus_voltage", "potencia_bess", "demanda_carga_kw", "generacion_solar_kw",
        "frecuencia_red_hz", "estado_generador", "dg_potencia_activa_kw", "pbd_matrix_json"
    ]
    
    data_keys = []
    colors = ["#2196f3", "#4caf50", "#f44336", "#64B856", "#f59e0b", "#38bdf8", "#a855f7"]
    for idx, k in enumerate(keys_needed):
        data_keys.append({
            "name": k,
            "type": "timeseries",
            "label": k,
            "color": colors[idx % len(colors)],
            "settings": {}
        })
        
    w_conf["config"]["datasources"] = [{
        "type": "device",
        "name": "",
        "deviceId": dev_id,
        "dataKeys": data_keys,
        "alarmFilterConfig": { "statusList": ["ACTIVE"] }
    }]
    
    save_dash_req = urllib.request.Request(
        "http://localhost:8082/api/dashboard",
        data=json.dumps(dash).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_dash_req) as resp:
        dash_saved = json.loads(resp.read().decode("utf-8"))
        print("-> Dashboard EPM_GAORI actualizado con todas las llaves de telemetría para supervisión SCADA.")

print(">>> DESPLIEGUE COMPLETADO AL 100% <<<")
