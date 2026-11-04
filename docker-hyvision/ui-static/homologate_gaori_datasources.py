import urllib.request
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read current backup
with open('docker-hyvision/ui-static/dashboard_gaori_backup_pre_timewindow_20261103.json', 'r', encoding='utf-8') as f:
    dash = json.load(f)

widgets = dash.get('configuration', {}).get('widgets', {})
gaori_alias_id = "68411acd-78fd-4271-bed2-9f5df57811e5"
target_device_id = "64af58e0-be6a-11f1-a395-4fe608e17de1"

transformed_count = 0
dtw_updated_count = 0

print("=== DRY RUN: HOMOLOGATION OF GAORI DATASOURCES ===")

for wid, w in widgets.items():
    cfg = w.get('config', {})
    title = cfg.get('title', 'Sin título')
    wtype = w.get('type')
    datasources = cfg.get('datasources', [])
    
    modified_ds = False
    for ds in datasources:
        if ds.get('type') == 'device' and ds.get('deviceId') == target_device_id:
            modified_ds = True
            ds['type'] = 'entity'
            ds['entityAliasId'] = gaori_alias_id
            if 'deviceId' in ds:
                del ds['deviceId']
            if 'name' in ds:
                del ds['name']
            if 'latestDataKeys' not in ds:
                ds['latestDataKeys'] = []
            transformed_count += 1
            
    # For timeseries widgets, ensure useDashboardTimewindow is True
    if wtype == 'timeseries':
        if cfg.get('useDashboardTimewindow') != True:
            cfg['useDashboardTimewindow'] = True
            dtw_updated_count += 1
            print(f"  [DTW Enabled] Widget '{title}' -> useDashboardTimewindow: True")
            
    if modified_ds:
        print(f"  [DS Homologated] Widget '{title}' ({wtype}) -> entityAliasId={gaori_alias_id}")

print(f"\nTotal datasources transformed: {transformed_count}")
print(f"Total useDashboardTimewindow updated: {dtw_updated_count}")

# Save updated dashboard file locally
output_file = 'docker-hyvision/ui-static/dashboard_gaori_updated_20261103.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(dash, f, indent=2, ensure_ascii=False)

print(f"Saved local updated file: {output_file}")

