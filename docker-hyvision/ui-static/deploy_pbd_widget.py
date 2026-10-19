import urllib.request
import json
import os

login_url = "http://localhost:8082/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

wid = "f9360080-be6b-11f1-a395-4fe608e17de1"
url = f"http://localhost:8082/api/widgetType/{wid}"
with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
    w_data = json.loads(resp.read().decode("utf-8"))

base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "pbd_tableros_adaptive.html"), "r", encoding="utf-8") as f:
    new_html = f.read()

with open(os.path.join(base_dir, "pbd_tableros_adaptive.css"), "r", encoding="utf-8") as f:
    new_css = f.read()

with open(os.path.join(base_dir, "pbd_tableros_adaptive.js"), "r", encoding="utf-8") as f:
    new_js = f.read()

descriptor = w_data.get("descriptor", {})
descriptor["templateHtml"] = new_html
descriptor["templateCss"] = new_css
descriptor["controllerScript"] = new_js
w_data["descriptor"] = descriptor

save_req = urllib.request.Request(
    "http://localhost:8082/api/widgetType",
    data=json.dumps(w_data).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req) as resp:
    saved = json.loads(resp.read().decode("utf-8"))
    print(f"Widget {w_data.get('name')} ({w_data.get('fqn')}) updated successfully in ThingsBoard!")
