import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:8082'
login_payload = json.dumps({'username': 'tenant@thingsboard.org', 'password': 'tenant'}).encode('utf-8')
req = urllib.request.Request(f'{BASE_URL}/api/auth/login', data=login_payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode('utf-8'))['token']
headers = {'X-Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

req_dash = urllib.request.Request(f'{BASE_URL}/api/tenant/dashboards?pageSize=50&page=0', headers=headers)
with urllib.request.urlopen(req_dash) as resp:
    dashboards = json.loads(resp.read().decode('utf-8')).get('data', [])

print("=== FIXING DASHBOARD STATE NAMES ACROSS ALL SITES ===")

for d in dashboards:
    d_title = d['title']
    d_id = d['id']['id']
    if d_title == 'EPM_GAORI':
        print(f"[SKIP] {d_title} (Benchmark original preservado)")
        continue
        
    req_d = urllib.request.Request(f'{BASE_URL}/api/dashboard/{d_id}', headers=headers)
    with urllib.request.urlopen(req_d) as resp:
        d_data = json.loads(resp.read().decode('utf-8'))
        
    cfg = d_data.get('configuration', {})
    states = cfg.get('states', {})
    
    # Update default state name
    if 'default' in states:
        old_name = states['default'].get('name')
        states['default']['name'] = d_title
        print(f"[*] {d_title:<32s} -> state name: '{old_name}' => '{d_title}'")
        
    # Check widgets for hardcoded GAORI references in title or settings
    widgets = cfg.get('widgets', {})
    for wid, w in widgets.items():
        w_cfg = w.get('config', {})
        w_title = w_cfg.get('title', '')
        if 'EPM_GAORI' in w_title or 'GAORI' in w_title:
            new_title = w_title.replace('EPM_GAORI', d_title).replace('GAORI', d_title)
            w_cfg['title'] = new_title
            print(f"    Fixed widget title: '{w_title}' -> '{new_title}'")
            
    # Save dashboard
    save_req = urllib.request.Request(
        f'{BASE_URL}/api/dashboard',
        data=json.dumps(d_data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    with urllib.request.urlopen(save_req) as resp:
        pass

print("\n=== STATE NAMES UPDATED SUCCESSFULLY ===")
