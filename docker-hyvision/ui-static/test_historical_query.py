import urllib.request
import json
import ssl
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

login_data = json.dumps({'username': 'tenant@thingsboard.org', 'password': 'tenant'}).encode('utf-8')
req = urllib.request.Request('http://10.55.150.174:8082/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req, context=ctx)
token = json.loads(resp.read().decode('utf-8'))['token']

now_ms = int(time.time() * 1000)

test_windows = [
    ("Tiempo Real (Últimas 10 horas)", now_ms - 10 * 3600 * 1000, now_ms),
    ("Historial (Ayer día completo)", now_ms - 48 * 3600 * 1000, now_ms - 24 * 3600 * 1000),
    ("Historial (Últimos 3 días)", now_ms - 72 * 3600 * 1000, now_ms)
]

# Keys used in GAORI charts
keys_to_test = [
    'soc_promedio',
    'generacion_solar_kw',
    'demanda_carga_kw',
    'potencia_bess_kw',
    'vbat_promedio',
    'ibat_total',
    'pac_pcs1',
    'pac_pcs2',
    'pac_pcs3',
    'pbd_01_kw',
    'pbd_02_kw',
    'delta_temp_bateria',
    'temp_bateria_max',
    'temp_bateria_min'
]

keys_str = ','.join(keys_to_test)
device_id = '64af58e0-be6a-11f1-a395-4fe608e17de1'

print("=== PRUEBA DE REDUNDANCIA: CONSULTAS HISTÓRICAS Y TIEMPO REAL ===")
for name, start_ts, end_ts in test_windows:
    start_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(start_ts / 1000))
    end_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(end_ts / 1000))
    url = f"http://10.55.150.174:8082/api/plugins/telemetry/DEVICE/{device_id}/values/timeseries?keys={keys_str}&startTs={start_ts}&endTs={end_ts}&limit=1000"
    
    req = urllib.request.Request(url, headers={'X-Authorization': f'Bearer {token}'})
    data = json.loads(urllib.request.urlopen(req, context=ctx).read().decode('utf-8'))
    
    print(f"\nVentana: {name} [{start_str} -> {end_str}]")
    points_summary = []
    for k in keys_to_test:
        pts = len(data.get(k, []))
        points_summary.append(f"{k}: {pts}")
    print("  Puntos recibidos: " + ", ".join(points_summary[:5]))
    print("                    " + ", ".join(points_summary[5:10]))
    print("                    " + ", ".join(points_summary[10:]))
    assert any(len(data.get(k, [])) > 0 for k in keys_to_test), f"Sin datos en ventana {name}"

print("\n>>> TODAS LAS VENTANAS TEMPORALES DEVUELVEN TELEMETRÍA CORRECTAMENTE! <<<")

