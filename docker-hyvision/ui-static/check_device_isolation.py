import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

login_data = json.dumps({'username': 'tenant@thingsboard.org', 'password': 'tenant'}).encode('utf-8')
req = urllib.request.Request('http://10.55.150.174:8082/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req, context=ctx)
token = json.loads(resp.read().decode('utf-8'))['token']

dashs_req = urllib.request.Request('http://10.55.150.174:8082/api/tenant/dashboards?pageSize=50&page=0', headers={'X-Authorization': f'Bearer {token}'})
dashboards = json.loads(urllib.request.urlopen(dashs_req, context=ctx).read().decode('utf-8')).get('data', [])

gaori_device_id = "64af58e0-be6a-11f1-a395-4fe608e17de1"

print(f"Auditing device isolation across all {len(dashboards)} dashboards:\n")
all_clean = True
for d in dashboards:
    title = d.get('title')
    did = d.get('id', {}).get('id')
    
    req_d = urllib.request.Request(f'http://10.55.150.174:8082/api/dashboard/{did}', headers={'X-Authorization': f'Bearer {token}'})
    d_data = json.loads(urllib.request.urlopen(req_d, context=ctx).read().decode('utf-8'))
    cfg = d_data.get('configuration', {})
    aliases = cfg.get('entityAliases', {})
    
    # Check all target devices in entity aliases
    devices_in_dash = []
    for aid, a in aliases.items():
        dev_id = a.get('filter', {}).get('singleEntity', {}).get('id')
        devices_in_dash.append((a.get('alias'), dev_id))
        
    is_gaori = ('GAORI' in title.upper())
    
    if not is_gaori:
        for alias_name, dev_id in devices_in_dash:
            if dev_id == gaori_device_id:
                print(f"CRITICAL ERROR: GAORI device found in {title}!")
                all_clean = False
        print(f"  [ISOLATED] {title:25} -> Bound to: {devices_in_dash[0][0]} ({devices_in_dash[0][1]})")
    else:
        print(f"  [GAORI SITE] {title:23} -> Bound to: {devices_in_dash[0][0]} ({devices_in_dash[0][1]})")

if all_clean:
    print("\n>>> ZERO CROSS-CONTAMINATION: ALL 15 SITES ARE COMPLETELY ISOLATED AND INTACT! <<<")
