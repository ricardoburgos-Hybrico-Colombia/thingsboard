import urllib.request
import json

HOST = "http://10.55.150.174:8082"
login_url = f"{HOST}/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {"X-Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# =========================================================================
# 1. FIX WIDGET TYPE: registro_eventos_fallas_gaori2 (Fix resources = [])
# =========================================================================
print("[1/3] Arreglando descriptor.resources en registro_eventos_fallas_gaori2...")
wt_url = f"{HOST}/api/widgetType/5d3700a0-cbde-11f1-bd57-9f45b80f9ffd"
with urllib.request.urlopen(urllib.request.Request(wt_url, headers=headers)) as resp:
    wt = json.loads(resp.read().decode("utf-8"))

desc = wt.get("descriptor", {})
desc["resources"] = []
wt["descriptor"] = desc
wt["resources"] = []

save_wt_req = urllib.request.Request(
    f"{HOST}/api/widgetType",
    data=json.dumps(wt).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_wt_req) as resp:
    saved_wt = json.loads(resp.read().decode("utf-8"))
    print(f"  -> Widget Type reparado: descriptor.resources = {saved_wt.get('descriptor',{}).get('resources')}")

# =========================================================================
# 2. FIX WIDGET TYPE: pbd_tableros_dc_scada (Asegurar resources = [])
# =========================================================================
print("[2/3] Verificando descriptor.resources en pbd_tableros_dc_scada...")
pbd_wt_url = f"{HOST}/api/widgetType/f9360080-be6b-11f1-a395-4fe608e17de1"
with urllib.request.urlopen(urllib.request.Request(pbd_wt_url, headers=headers)) as resp:
    pbd_wt = json.loads(resp.read().decode("utf-8"))

pbd_desc = pbd_wt.get("descriptor", {})
pbd_desc["resources"] = []
pbd_wt["descriptor"] = pbd_desc
pbd_wt["resources"] = []

save_pbd_req = urllib.request.Request(
    f"{HOST}/api/widgetType",
    data=json.dumps(pbd_wt).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_pbd_req) as resp:
    print("  -> pbd_tableros_dc_scada verificado con resources: []")

# =========================================================================
# 3. FIX DASHBOARD GAORI: DATASOURCES PARA AMBOS WIDGETS
# =========================================================================
print("[3/3] Actualizando datasources en Dashboard EPM_GAORI...")
dash_url = f"{HOST}/api/dashboard/8b81f730-be69-11f1-a395-4fe608e17de1"
with urllib.request.urlopen(urllib.request.Request(dash_url, headers=headers)) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

widgets = dash.get("configuration", {}).get("widgets", {})

# A. Arreglar Widget Alarmas (052de3af-13b9-f603-76bb-59e4a5e4805d)
w_alarm = widgets.get("052de3af-13b9-f603-76bb-59e4a5e4805d")
if w_alarm:
    alarm_keys = [
        "alarmas_activas_total", "faults_30d_total", "warnings_30d_total", "fault_history_json",
        "bess_soc", "soc_promedio", "delta_v_celdas_mv", "max_volt_celda_mv", "min_volt_celda_mv",
        "temp_bateria_max", "temp_bateria_min", "delta_temp_bateria", "temp_igbt_max",
        "frecuencia_red_hz", "generacion_solar_kw", "demanda_carga_kw", "potencia_bess",
        "dg_potencia_activa_kw", "pbd_bus_voltage", "pbd_matrix_json"
    ]
    ds_list = w_alarm.get("config", {}).get("datasources", [])
    if ds_list:
        device_id = ds_list[0].get("deviceId", "64af58e0-be6a-11f1-a395-4fe608e17de1")
        new_datakeys = []
        for k in alarm_keys:
            new_datakeys.append({
                "name": k,
                "type": "timeseries",
                "label": k,
                "color": "#64B856",
                "settings": {}
            })
        ds_list[0]["dataKeys"] = new_datakeys
        ds_list[0]["deviceId"] = device_id
        w_alarm["config"]["datasources"] = ds_list
        print(f"  -> Widget Alarmas configurado con {len(new_datakeys)} llaves de telemetría.")

# B. Arreglar Widget PBD (743bfd18-efaa-5b84-3df8-74ebd640012a)
w_pbd = widgets.get("743bfd18-efaa-5b84-3df8-74ebd640012a")
if w_pbd:
    pbd_keys = [
        "pbd_matrix_json", "pbd_bus_voltage", "pbd_disconnect_status", "pbd_potencia_dc_kw",
        "string_1_corriente_a", "string_2_corriente_a", "string_3_corriente_a",
        "string_4_corriente_a", "string_5_corriente_a"
    ]
    ds_list_pbd = w_pbd.get("config", {}).get("datasources", [])
    if ds_list_pbd:
        device_id = ds_list_pbd[0].get("deviceId", "64af58e0-be6a-11f1-a395-4fe608e17de1")
        new_pbd_keys = []
        for k in pbd_keys:
            new_pbd_keys.append({
                "name": k,
                "type": "timeseries",
                "label": k,
                "color": "#f7d048" if "string" in k or "pbd" in k else "#64B856",
                "settings": {}
            })
        ds_list_pbd[0]["dataKeys"] = new_pbd_keys
        ds_list_pbd[0]["deviceId"] = device_id
        w_pbd["config"]["datasources"] = ds_list_pbd
        print(f"  -> Widget PBD configurado con {len(new_pbd_keys)} llaves (incluyendo pbd_matrix_json).")

# Guardar Dashboard
save_dash_req = urllib.request.Request(
    f"{HOST}/api/dashboard",
    data=json.dumps(dash).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_dash_req) as resp:
    print(">>> DASHBOARD EPM_GAORI GUARDADO Y REPARADO EXITOSAMENTE EN PRODUCCIÓN <<<")
