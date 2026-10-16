import urllib.request
import json
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

# 2. Get devices
req = urllib.request.Request(f"{BASE_URL}/api/tenant/devices?pageSize=100&page=0", headers=headers)
with urllib.request.urlopen(req) as resp:
    devices = json.loads(resp.read().decode("utf-8")).get("data", [])

print(f"Total Devices in ThingsBoard: {len(devices)}")
print("=" * 80)

audit_results = []

for dev in sorted(devices, key=lambda x: x["name"]):
    dev_id = dev["id"]["id"]
    dev_name = dev["name"]
    dev_type = dev.get("type", "")
    
    # Get latest telemetry
    url_tel = f"{BASE_URL}/api/plugins/telemetry/DEVICE/{dev_id}/values/timeseries"
    try:
        with urllib.request.urlopen(urllib.request.Request(url_tel, headers=headers)) as r_tel:
            telemetry = json.loads(r_tel.read().decode("utf-8"))
    except Exception as e:
        telemetry = {}

    def get_val(key):
        items = telemetry.get(key, [])
        if items:
            return items[0].get("value")
        return None

    load_kw = get_val("load_power_kw") or get_val("demanda_carga_kw")
    load_dc = get_val("load_dc_power_kw") or get_val("dc_load_power_kw")
    load_ac = get_val("load_ac_power_kw") or get_val("ac_load_power_kw")
    vbat = get_val("battery_voltage") or get_val("vbat_promedio")
    ibat = get_val("battery_current") or get_val("ibat_total")
    pbat = get_val("battery_power_kw") or get_val("potencia_bess_kw")
    psolar = get_val("solar_power_kw") or get_val("generacion_solar_kw")
    prect = get_val("rectifier_power_kw")
    irect = get_val("rectifier_current")
    pgrid = get_val("grid_power_kw")
    pgen = get_val("generator_power_kw") or get_val("dg_potencia_activa_kw")
    soc = get_val("battery_soc") or get_val("soc_promedio")
    
    print(f"DISPOSITIVO: {dev_name} ({dev_type})")
    print(f"  - Demanda/Carga: load_power_kw={load_kw}, dc_load={load_dc}, ac_load={load_ac}")
    print(f"  - Batería: V={vbat}V, I={ibat}A, P={pbat}kW, SoC={soc}%")
    print(f"  - Solar: P={psolar}kW | Rectificador: P={prect}kW, I={irect}A")
    print(f"  - Red: P={pgrid}kW | Generador: P={pgen}kW")
    
    # Check for negative load or strange values
    neg_flags = []
    try:
        if load_kw is not None and float(load_kw) < 0:
            neg_flags.append(f"NEG_LOAD({load_kw})")
        if load_dc is not None and float(load_dc) < 0:
            neg_flags.append(f"NEG_DC_LOAD({load_dc})")
        if psolar is not None and float(psolar) < 0:
            neg_flags.append(f"NEG_SOLAR({psolar})")
    except Exception:
        pass
    
    if neg_flags:
        print(f"  [!] ALERTA ANOMALÍA: {', '.join(neg_flags)}")
    print("-" * 80)
