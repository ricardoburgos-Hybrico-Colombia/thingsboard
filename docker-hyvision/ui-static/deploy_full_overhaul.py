import urllib.request
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8082"

# 1. Login
login_payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def update_widget_type(wid, html_file=None, js_file=None, css_file=None):
    url = f"{BASE_URL}/api/widgetType/{wid}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
        w_data = json.loads(resp.read().decode("utf-8"))
    
    descriptor = w_data.get("descriptor", {})
    
    if html_file and os.path.exists(html_file):
        with open(html_file, "r", encoding="utf-8") as f:
            descriptor["templateHtml"] = f.read()
            
    if js_file and os.path.exists(js_file):
        with open(js_file, "r", encoding="utf-8") as f:
            descriptor["controllerScript"] = f.read()

    if css_file and os.path.exists(css_file):
        with open(css_file, "r", encoding="utf-8") as f:
            descriptor["templateCss"] = f.read()
            
    w_data["descriptor"] = descriptor
    
    save_req = urllib.request.Request(
        f"{BASE_URL}/api/widgetType",
        data=json.dumps(w_data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_req) as resp:
        print(f"[*] Widget '{w_data.get('name')}' ({wid}) updated successfully!")

print("=== STEP 1: DEPLOYING ALL SANITIZED & ADAPTIVE WIDGET TYPES ===")

# 1. Sinóptico
update_widget_type("5fbbe930-be69-11f1-a395-4fe608e17de1", 
                   "docker-hyvision/ui-static/sinoptico_adaptive.html", 
                   "docker-hyvision/ui-static/sinoptico_adaptive.js",
                   "docker-hyvision/ui-static/sinoptico_adaptive.css")

# 2. Generación Solar
update_widget_type("f932cc30-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/generacion_solar_adaptive.html",
                   "docker-hyvision/ui-static/generacion_solar_adaptive.js")

# 3. Demanda de Carga
update_widget_type("f9233bd0-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/demanda_carga_adaptive.html",
                   "docker-hyvision/ui-static/demanda_carga_adaptive.js")

# 4. Almacenamiento BESS Dinámico
update_widget_type("f9199ee0-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/almacenamiento_bess_adaptive.html",
                   "docker-hyvision/ui-static/almacenamiento_bess_adaptive.js",
                   "docker-hyvision/ui-static/almacenamiento_bess_adaptive.css")

# 5. Respaldo DG / Red
update_widget_type("f94ac100-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/respaldo_dg_adaptive.html",
                   "docker-hyvision/ui-static/respaldo_dg_adaptive.js")

# 6. Balance de Planta
update_widget_type("f91cfa40-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/balance_planta_adaptive.html",
                   "docker-hyvision/ui-static/balance_planta_adaptive.js")

# 7. Corrientes DG por Fase (Eliminación Math.sin)
update_widget_type("f9262200-be6b-11f1-a395-4fe608e17de1",
                   None,
                   "docker-hyvision/ui-static/dg_corrientes_adaptive.js")

# 8. Potencia Reactiva Inversores (Eliminación fake 0.8)
update_widget_type("f9436e00-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/potencia_reactiva_adaptive.html",
                   "docker-hyvision/ui-static/potencia_reactiva_adaptive.js")

# 9. Tableros DC y Strings MPPT (Eliminación fake 766V)
update_widget_type("f9360080-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/pbd_tableros_adaptive.html",
                   "docker-hyvision/ui-static/pbd_tableros_adaptive.js")

# 10. SOC por Rack Linear (Eliminación fake 86/85/87)
update_widget_type("f954ac10-be6b-11f1-a395-4fe608e17de1",
                   None,
                   "docker-hyvision/ui-static/soc_racks_adaptive.js")

# 11. Desbalance Celdas (Eliminación fake 14mV)
update_widget_type("f9200780-be6b-11f1-a395-4fe608e17de1",
                   None,
                   "docker-hyvision/ui-static/desbalance_celdas_adaptive.js")

# 12. Estabilidad y Sincronismo DG (Eliminación fake 220V en standby)
update_widget_type("f92c1570-be6b-11f1-a395-4fe608e17de1",
                   None,
                   "docker-hyvision/ui-static/dg_sincronismo_adaptive.js")

# 13. Registro de Eventos y Fallas (Eliminación fake 1 falla / 4 warnings)
update_widget_type("f9465430-be6b-11f1-a395-4fe608e17de1",
                   None,
                   "docker-hyvision/ui-static/eventos_fallas_adaptive.js")

# 14. Gráfica Especializada 1: Desglose de Potencia por Fuente vs Demanda BTS
update_widget_type("f94087d0-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/potencia_pcs_adaptive.html",
                   "docker-hyvision/ui-static/potencia_pcs_adaptive.js",
                   "docker-hyvision/ui-static/potencia_pcs_adaptive.css")

# 15. Gráfica Especializada 2: Dinámica de Tensión de Bus DC y Corrientes Telecom
update_widget_type("f95b62d0-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/tendencia_vc_adaptive.html",
                   "docker-hyvision/ui-static/tendencia_vc_adaptive.js",
                   "docker-hyvision/ui-static/tendencia_vc_adaptive.css")

# 16. Perfil Térmico Inversores / Ambiental
update_widget_type("f9390dc0-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/perfil_termico_adaptive.html",
                   "docker-hyvision/ui-static/perfil_termico_adaptive.js")

# 17. Tendencia Dispersión Térmica BESS
update_widget_type("f9580770-be6b-11f1-a395-4fe608e17de1",
                   "docker-hyvision/ui-static/tendencia_termica_adaptive.html",
                   "docker-hyvision/ui-static/tendencia_termica_adaptive.js")

print("\n=== STEP 2: ENHANCING ALL 15 DASHBOARDS DATASOURCES AND ALIASES ===")

req_dash = urllib.request.Request(f"{BASE_URL}/api/tenant/dashboards?pageSize=50&page=0", headers=headers)
with urllib.request.urlopen(req_dash) as resp:
    dashboards = json.loads(resp.read().decode("utf-8")).get("data", [])

def ensure_keys(ds, key_names):
    existing = set([k.get("name") for k in ds.get("dataKeys", [])])
    for kn in key_names:
        if kn not in existing:
            ds["dataKeys"].append({
                "type": "timeseries",
                "name": kn,
                "label": kn,
                "color": "#64B856",
                "settings": {},
                "_hash": 0.12345
            })

for d in dashboards:
    d_title = d["title"]
    d_id = d["id"]["id"]
    if d_title == "EPM_GAORI":
        print(f"[SKIP] {d_title} (Industrial control benchmark preserved untouched)")
        continue

    req_d = urllib.request.Request(f"{BASE_URL}/api/dashboard/{d_id}", headers=headers)
    with urllib.request.urlopen(req_d) as resp:
        d_data = json.loads(resp.read().decode("utf-8"))

    # State name must match dashboard title
    states = d_data.get("configuration", {}).get("states", {})
    if "default" in states:
        states["default"]["name"] = d_title

    widgets = d_data.get("configuration", {}).get("widgets", {})
    modified = 0

    for wid, w in widgets.items():
        title = w.get("config", {}).get("title", "")
        fqn = w.get("typeFullFqn", "")
        datasources = w.get("config", {}).get("datasources", [])
        if not datasources:
            continue
        ds = datasources[0]

        if "sinoptico" in fqn or "Sinóptico" in title or "Sinoptico" in title:
            ensure_keys(ds, [
                "grid_power_kw", "grid_energy_kwh", "grid_available",
                "solar_charger_power_kw", "solar_inverter_power_kw", "solar_power_kw", "epv_hoy_kwh", "solar_energy_kwh",
                "solar_charger_voltage", "solar_charger_current",
                "rectifier_voltage", "rectifier_power_kw", "rectifier_current", "rectifier_energy_kwh",
                "generator_power_kw", "generator_energy_kwh", "generator_runtime_hours", 
                "battery_soc", "battery_voltage", "battery_current", "battery_power_kw", "estado_bess",
                "battery_temperature", "battery_net_energy_kwh",
                "load_dc_power_kw", "load_power_kw", "eload_hoy_kwh", "load_energy_kwh",
                "load_dc_voltage", "load_dc_current",
                "grid_voltage", "grid_frequency", "tension_fase_u", "frecuencia_red_hz",
                "estado_generador", "ambient_temperature", "temp_bateria_max",
                "solar_fraction_pct", "net_balance_kw"
            ])
            modified += 1
        elif "potencia_activa" in fqn or "Potencia Activa" in title:
            ensure_keys(ds, [
                "solar_power_kw", "solar_charger_power_kw", "grid_power_kw", 
                "generator_power_kw", "battery_power_kw", "load_power_kw",
                "load_dc_power_kw", "solar_fraction_pct", "rectifier_voltage", "battery_voltage"
            ])
            modified += 1
        elif "perfil_termico" in fqn or "Perfil Térmico" in title or "Perfil Termico" in title:
            ensure_keys(ds, [
                "battery_temperature", "ambient_temperature", "ambient_humidity", 
                "battery_soh", "temp_bateria_max", "battery_voltage"
            ])
            modified += 1
        elif "tendencia_voltaje" in fqn or "Tendencia Tensión" in title or "Tendencia Tension" in title:
            ensure_keys(ds, [
                "battery_voltage", "rectifier_voltage", "battery_current", "rectifier_current",
                "load_power_kw", "load_dc_power_kw", "load_dc_voltage", "load_dc_current"
            ])
            modified += 1
        elif "dispersion_termica" in fqn or "Dispersión Térmica" in title or "Dispersion Termica" in title:
            ensure_keys(ds, [
                "battery_temperature", "ambient_temperature"
            ])
            modified += 1
        elif "SOC BATTERY" in title:
            ensure_keys(ds, ["battery_soc", "battery_voltage", "rectifier_voltage"])
            modified += 1
        elif "Generación Solar" in title or "Generacion Solar" in title:
            ensure_keys(ds, [
                "solar_power_kw", "solar_charger_power_kw", "solar_inverter_power_kw", 
                "epv_hoy_kwh", "solar_energy_kwh", "solar_charger_voltage", "solar_charger_current"
            ])
            modified += 1
        elif "Demanda de Carga" in title:
            ensure_keys(ds, [
                "load_power_kw", "load_dc_power_kw", "eload_hoy_kwh", 
                "load_energy_kwh", "load_dc_voltage", "load_dc_current"
            ])
            modified += 1
        elif "Almacenamiento BESS" in title:
            ensure_keys(ds, [
                "battery_soc", "battery_power_kw", "battery_voltage", "rectifier_voltage", 
                "battery_current", "estado_bess", "battery_temperature", "battery_net_energy_kwh"
            ])
            modified += 1
        elif "Respaldo DG" in title:
            ensure_keys(ds, ["generator_power_kw", "generator_runtime_hours", "grid_power_kw", "grid_voltage", "estado_generador"])
            modified += 1
        elif "Balance de Planta" in title:
            ensure_keys(ds, ["solar_power_kw", "battery_power_kw", "load_power_kw", "grid_power_kw", "generator_power_kw"])
            modified += 1
        elif "Estabilidad Sincronismo" in title or "sincronismo" in fqn:
            ensure_keys(ds, ["frecuencia_red_hz", "tension_fase_u", "tension_fase_v", "tension_fase_w", "grid_voltage", "grid_frequency", "generator_power_kw"])
            modified += 1
        elif "Tableros DC" in title or "pbd_tableros" in fqn:
            ensure_keys(ds, ["pbd_bus_voltage", "battery_voltage", "rectifier_voltage", "solar_charger_voltage", "solar_charger_current", "string_1_corriente_a", "string_2_corriente_a"])
            modified += 1
        elif "SOC por Rack" in title or "soc_racks" in fqn:
            ensure_keys(ds, ["battery_soc", "soc_promedio", "battery_voltage", "rectifier_voltage"])
            modified += 1
        elif "Desbalance Voltaje" in title or "desbalance_celdas" in fqn:
            ensure_keys(ds, ["delta_v_celdas_mv", "battery_voltage", "rectifier_voltage"])
            modified += 1
        elif "Potencia Reactiva" in title or "potencia_reactiva" in fqn:
            ensure_keys(ds, ["q_total_kvar"])
            modified += 1

    d_data["configuration"]["widgets"] = widgets
    save_req = urllib.request.Request(
        f"{BASE_URL}/api/dashboard",
        data=json.dumps(d_data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_req) as resp:
        print(f"[*] Dashboard '{d_title:<32s}' updated ({modified} widgets synced with full real keys)!")

print("\n=== STEP 3: DEPLOYMENT AND SYNCHRONIZATION COMPLETE ===")
