import urllib.request
import json
import ssl
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://10.55.150.174:8082"
DASH_ID = "8b81f730-be69-11f1-a395-4fe608e17de1"

print("====================================================================")
print("=== HABILITACIÓN DE TELEMETRÍA HISTÓRICA EN WIDGETS DE INSTANTÁNEAS ===")
print("====================================================================")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Login
print(f"\n[1/5] Autenticando con ThingsBoard ({BASE_URL})...")
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req_login = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_login, context=ctx) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("-> Autenticado con éxito.")

# 2. Descargar estado actual del Dashboard y crear backup de seguridad
print(f"\n[2/5] Descargando y respaldando Dashboard GAORI ({DASH_ID})...")
req_dash = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_dash, context=ctx) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

base_dir = os.path.dirname(__file__)
backup_file = os.path.join(base_dir, "dashboard_gaori_backup_pre_snapshot_hist_20261103.json")
with open(backup_file, "w", encoding="utf-8") as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)
print(f"-> Respaldo previo guardado en: {backup_file}")

# 3. Actualizar los widgets en el Dashboard GAORI
print("\n[3/5] Actualizando configuración de widgets para sincronización histórica...")
widgets = dash.setdefault("configuration", {}).setdefault("widgets", {})

target_widget_ids = [
    "dd61b573-72ae-8820-8d30-08d4e0f35a57", # Sinóptico Animado Microrred
    "84c0eca6-e17c-48e6-cbe0-745bec95bfb7", # Generación Solar (KPI)
    "90ea4fdf-2231-417f-5639-d31e1194db60", # Demanda de Carga (KPI)
    "60552401-8cfd-dd1d-c01c-53af3ba7ac4c", # Almacenamiento BESS (KPI)
    "a73d9a4a-3235-e5a0-f90b-2dc451e6065d", # Respaldo DG (KPI)
    "d9cde2ca-cb04-83f6-9acf-0d9fa0ee5ca8", # Estado General (KPI)
    "9dd08064-4544-9977-9a67-378b60ff1129", # SOC por Cluster de Baterías
    "0323c11a-06a2-5d91-f1e3-a08cd882995a", # Perfil Térmico Inversores
    "743bfd18-efaa-5b84-3df8-74ebd640012a", # Tableros DC y Strings Solares (PBD)
    "052de3af-13b9-f603-76bb-59e4a5e4805d"  # Registro de Eventos y Fallas
]

updated_count = 0
for wid in target_widget_ids:
    if wid in widgets:
        w = widgets[wid]
        title = w.get("config", {}).get("title", "Sin título")
        prev_type = w.get("type")
        prev_dtw = w.get("config", {}).get("useDashboardTimewindow")
        
        w["type"] = "timeseries"
        w["config"]["useDashboardTimewindow"] = True
        updated_count += 1
        print(f"  [MODIFICADO] '{title}' ({wid})")
        print(f"               type: {prev_type} -> timeseries | useDTW: {prev_dtw} -> True")

print(f"\nTotal widgets actualizados a timeseries con timewindow: {updated_count}")

# Guardar localmente
local_dash_file = os.path.join(base_dir, "dashboard_gaori_updated_20261103.json")
with open(local_dash_file, "w", encoding="utf-8") as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)
print(f"-> Dashboard local guardado en: {local_dash_file}")

# 4. Desplegar en ThingsBoard
print(f"\n[4/5] Desplegando actualización en ThingsBoard producción ({DASH_ID})...")
post_data = json.dumps(dash).encode("utf-8")
req_save = urllib.request.Request(f"{BASE_URL}/api/dashboard", data=post_data, headers=headers, method="POST")
with urllib.request.urlopen(req_save, context=ctx) as resp:
    saved = json.loads(resp.read().decode("utf-8"))

print(f"-> Dashboard GAORI actualizado exitosamente en ThingsBoard! ID: {saved['id']['id']}")

# 5. Verificación inmediata de lectura
print("\n[5/5] Verificación inmediata de lectura desde la API de producción...")
req_verify = urllib.request.Request(f"{BASE_URL}/api/dashboard/{DASH_ID}", headers=headers)
with urllib.request.urlopen(req_verify, context=ctx) as resp:
    live = json.loads(resp.read().decode("utf-8"))

live_widgets = live.get("configuration", {}).get("widgets", {})
errors = []
for wid in target_widget_ids:
    lw = live_widgets.get(wid)
    ltitle = lw.get("config", {}).get("title")
    ltype = lw.get("type")
    ldtw = lw.get("config", {}).get("useDashboardTimewindow")
    if ltype != "timeseries":
        errors.append(f"Widget '{ltitle}' tipo es '{ltype}' (esperado 'timeseries')")
    if ldtw != True:
        errors.append(f"Widget '{ltitle}' useDashboardTimewindow es '{ldtw}' (esperado True)")
    print(f"  [VERIFICADO EN PRODUCCIÓN] {ltitle:50} | type={ltype} | useDTW={ldtw}")

if errors:
    print(f"\nERROR: Se encontraron {len(errors)} fallas:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\n>>> TODOS LOS WIDGETS DE GAORI AHORA SINCRONIZAN 100% CON LA VENTANA DE TIEMPO! <<<")
