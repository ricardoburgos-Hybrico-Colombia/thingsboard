import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:8082'
login_data = json.dumps({'username': 'tenant@thingsboard.org', 'password': 'tenant'}).encode('utf-8')
req = urllib.request.Request(f'{BASE_URL}/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode('utf-8'))['token']
headers = {'X-Authorization': f'Bearer {token}'}

req_dev = urllib.request.Request(f'{BASE_URL}/api/tenant/devices?pageSize=50&page=0', headers=headers)
with urllib.request.urlopen(req_dev) as resp:
    devs = json.loads(resp.read().decode('utf-8'))['data']

print(f"{'#':<3} {'Sitio':<30} {'Solar(kW)':<10} {'Carga(kW)':<10} {'SoC':<8} {'Vbat(V)':<9} {'Grid(kW)':<9} {'Grid(V)':<9} {'Grid(kWh)':<10} {'DG(kW)':<8} {'DG(h)':<8} {'Topología Real'}")
print("-" * 145)

keys = 'solar_power_kw,solar_charger_power_kw,load_power_kw,battery_soc,battery_voltage,grid_power_kw,grid_voltage,grid_energy_kwh,generator_power_kw,generator_runtime_hours'

for idx, dev in enumerate(sorted(devs, key=lambda d: d['name']), 1):
    d_name = dev['name']
    if d_name.startswith('TEST_'):
        continue
    dev_id = dev['id']['id']
    req_t = urllib.request.Request(f'{BASE_URL}/api/plugins/telemetry/DEVICE/{dev_id}/values/timeseries?keys={keys}', headers=headers)
    try:
        with urllib.request.urlopen(req_t) as resp:
            t = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"{idx:<3} {d_name:<30} ERROR: {e}")
        continue

    def get_val(k, default=None):
        if k in t and t[k]:
            try:
                return float(t[k][0]['value'])
            except:
                return t[k][0]['value']
        return default

    sol = get_val('solar_power_kw', 0.0) or get_val('solar_charger_power_kw', 0.0) or 0.0
    load = get_val('load_power_kw', 0.0) or 0.0
    soc = get_val('battery_soc')
    vbat = get_val('battery_voltage', 0.0) or 0.0
    grid_kw = get_val('grid_power_kw', 0.0) or 0.0
    grid_v = get_val('grid_voltage', 0.0) or 0.0
    grid_kwh = get_val('grid_energy_kwh', 0.0) or 0.0
    dg_kw = get_val('generator_power_kw', 0.0) or 0.0
    dg_h = get_val('generator_runtime_hours', 0.0) or 0.0

    # Clasificación topológica estricta y científica
    has_grid = (grid_kw > 0.05) or (grid_v > 50.0) or (grid_kwh > 0.5)
    has_dg = (dg_h > 10.0) or (dg_kw > 0.05)
    is_industrial = vbat > 200.0

    if is_industrial:
        top_real = "INDUSTRIAL_BESS"
    elif has_grid and has_dg:
        top_real = "HIBRIDO_GRID_DG"
    elif has_grid and not has_dg:
        top_real = "ON_GRID_SOLAR_BESS"
    elif not has_grid and has_dg:
        top_real = "OFF_GRID_DG_SOLAR"
    else:
        top_real = "OFF_GRID_100_SOLAR"

    soc_str = f"{soc:.0f}%" if soc is not None else "FLOAT"
    print(f"{idx:<3} {d_name:<30} {sol:>7.2f} kW  {load:>7.2f} kW  {soc_str:<8} {vbat:>6.1f} V  {grid_kw:>6.2f} kW  {grid_v:>6.1f} V  {grid_kwh:>7.1f} kWh {dg_kw:>5.1f} kW {dg_h:>5.0f} h  -> {top_real}")
