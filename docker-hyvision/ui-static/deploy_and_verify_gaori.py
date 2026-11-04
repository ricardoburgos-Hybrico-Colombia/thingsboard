import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Login
login_data = json.dumps({'username': 'tenant@thingsboard.org', 'password': 'tenant'}).encode('utf-8')
req = urllib.request.Request('http://10.55.150.174:8082/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req, context=ctx)
token = json.loads(resp.read().decode('utf-8'))['token']

# 2. Load updated JSON
with open('docker-hyvision/ui-static/dashboard_gaori_updated_20261103.json', 'r', encoding='utf-8') as f:
    dash = json.load(f)

# 3. POST to /api/dashboard
post_data = json.dumps(dash).encode('utf-8')
post_req = urllib.request.Request(
    'http://10.55.150.174:8082/api/dashboard',
    data=post_data,
    headers={
        'Content-Type': 'application/json',
        'X-Authorization': f'Bearer {token}'
    }
)

resp = urllib.request.urlopen(post_req, context=ctx)
saved_dash = json.loads(resp.read().decode('utf-8'))
saved_id = saved_dash.get('id', {}).get('id')
print(f"Successfully saved dashboard! ID: {saved_id}")

# 4. Immediate Read-Back and Redundancy Validation
read_req = urllib.request.Request(
    f'http://10.55.150.174:8082/api/dashboard/{saved_id}',
    headers={'X-Authorization': f'Bearer {token}'}
)
live_dash = json.loads(urllib.request.urlopen(read_req, context=ctx).read().decode('utf-8'))
widgets = live_dash.get('configuration', {}).get('widgets', {})

print(f"\nVerifying live widgets in production ({len(widgets)} total):")
errors = []
for wid, w in widgets.items():
    title = w.get('config', {}).get('title', 'Sin título')
    wtype = w.get('type')
    udtw = w.get('config', {}).get('useDashboardTimewindow')
    dss = w.get('config', {}).get('datasources', [])
    for ds in dss:
        if ds.get('type') != 'entity':
            errors.append(f"Widget '{title}' ds type is '{ds.get('type')}' (expected 'entity')")
        if ds.get('entityAliasId') != '68411acd-78fd-4271-bed2-9f5df57811e5':
            errors.append(f"Widget '{title}' entityAliasId is '{ds.get('entityAliasId')}'")
        if 'deviceId' in ds:
            errors.append(f"Widget '{title}' still contains deviceId '{ds.get('deviceId')}'")
    if wtype == 'timeseries' and udtw is not True:
        errors.append(f"Widget '{title}' (timeseries) has useDashboardTimewindow={udtw}")
    print(f"  [PROD VERIFIED] {title:55} | type={wtype:10} | useDTW={str(udtw):5} | ds=entity")

if errors:
    print(f"\nCRITICAL: {len(errors)} validation errors found:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\n>>> ALL PRODUCTION GAORI WIDGETS 100% VALIDATED IN REAL-TIME API! <<<")
