import urllib.request
import json
import os

# 1. Login
login_url = "http://hyvision-app:8080/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})

with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {"X-Authorization": f"Bearer {token}"}

# 2. Get widget types (tenant/custom)
try:
    req_wt = urllib.request.Request("http://hyvision-app:8080/api/widgetTypesInfos?widgetsBundleId=&isSystem=false&pageSize=100&page=0", headers=headers)
    with urllib.request.urlopen(req_wt) as resp:
        wt_list = json.loads(resp.read().decode("utf-8"))
        print(f"WidgetTypesInfos found: {len(wt_list.get('data', []))}")
        for wt in wt_list.get('data', []):
            print(f"- FQN: {wt.get('fqn')} | Name: {wt.get('name')} | ID: {wt.get('id', {}).get('id')}")
except Exception as e:
    print("Error widgetTypesInfos:", e)

# Also let's check /api/widgetsBundles
try:
    req_wb = urllib.request.Request("http://hyvision-app:8080/api/widgetsBundles?pageSize=50&page=0", headers=headers)
    with urllib.request.urlopen(req_wb) as resp:
        wb_list = json.loads(resp.read().decode("utf-8"))
        print(f"\nWidgetsBundles found: {len(wb_list.get('data', []))}")
        for wb in wb_list.get('data', []):
            print(f"- Bundle: {wb.get('title')} | Alias: {wb.get('alias')} | ID: {wb.get('id', {}).get('id')}")
except Exception as e:
    print("Error widgetsBundles:", e)
