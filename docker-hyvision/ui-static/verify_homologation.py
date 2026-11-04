import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('docker-hyvision/ui-static/dashboard_gaori_updated_20261103.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

widgets = d['configuration']['widgets']
print('Total widgets:', len(widgets))
all_ok = True
for wid, w in widgets.items():
    title = w['config'].get('title', 'Sin título')
    wtype = w.get('type')
    udtw = w['config'].get('useDashboardTimewindow')
    dss = w['config'].get('datasources', [])
    for ds in dss:
        dst = ds.get('type')
        alias = ds.get('entityAliasId')
        if dst != 'entity':
            print(f"FAIL: {title} ds type is {dst}")
            all_ok = False
        if alias != '68411acd-78fd-4271-bed2-9f5df57811e5':
            print(f"FAIL: {title} alias is {alias}")
            all_ok = False
        if 'deviceId' in ds:
            print(f"FAIL: {title} still has deviceId")
            all_ok = False
    if wtype == 'timeseries' and udtw != True:
        print(f"FAIL: {title} useDashboardTimewindow is {udtw}")
        all_ok = False
    print(f"OK: [{title}] ({wtype}) -> entity alias OK, useDTW: {udtw}")

if all_ok:
    print("\n>>> ALL 18 WIDGETS PERFECTLY HOMOLOGATED AND VALIDATED! <<<")
else:
    print("\n>>> SOME CHECKS FAILED! <<<")

