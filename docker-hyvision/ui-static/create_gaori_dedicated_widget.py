import urllib.request
import json
import os

print("[1/3] Autenticando con ThingsBoard...")
login_url = "http://localhost:8082/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 1. Leer plantillas GAORI
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "eventos_fallas_adaptive.html"), "r", encoding="utf-8") as f:
    gaori_html = f.read()

with open(os.path.join(base_dir, "eventos_fallas_adaptive.css"), "r", encoding="utf-8") as f:
    gaori_css = f.read()

with open(os.path.join(base_dir, "eventos_fallas_adaptive.js"), "r", encoding="utf-8") as f:
    gaori_js = f.read()

# 2. Verificar si ya existe el widget type registro_eventos_fallas_gaori o crearlo
print("[2/3] Creando o actualizando Widget Type exclusivo: registro_eventos_fallas_gaori...")
w_url = "http://localhost:8082/api/widgetTypes?pageSize=100&page=0"
with urllib.request.urlopen(urllib.request.Request(w_url, headers=headers)) as resp:
    all_widgets = json.loads(resp.read().decode("utf-8")).get("data", [])

existing_gaori_widget = None
for w in all_widgets:
    if w.get("fqn") == "registro_eventos_fallas_gaori" or w.get("name") == "SCADA GAORI - Registro de Eventos y Fallas":
        existing_gaori_widget = w
        break

if existing_gaori_widget:
    target_gaori_id = existing_gaori_widget["id"]["id"]
    print(f"-> Widget Type GAORI ya existe ({target_gaori_id}), actualizando...")
    target_widget_obj = existing_gaori_widget
else:
    print("-> Creando nuevo Widget Type exclusivo para GAORI...")
    target_widget_obj = {
        "name": "SCADA GAORI - Registro de Eventos y Fallas",
        "fqn": "registro_eventos_fallas_gaori",
        "deprecated": False,
        "scada": False,
        "descriptor": {
            "type": "latest",
            "sizeX": 12,
            "sizeY": 4.5,
            "resources": [],
            "settingsSchema": "{}",
            "dataKeySettingsSchema": "{}",
            "defaultConfig": "{}"
        }
    }

descriptor = target_widget_obj.get("descriptor", {})
descriptor["templateHtml"] = gaori_html
descriptor["templateCss"] = gaori_css
descriptor["controllerScript"] = gaori_js
descriptor["resources"] = []
target_widget_obj["descriptor"] = descriptor
target_widget_obj["resources"] = []

save_w_req = urllib.request.Request(
    "http://localhost:8082/api/widgetType",
    data=json.dumps(target_widget_obj).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_w_req) as resp:
    saved_gaori_w = json.loads(resp.read().decode("utf-8"))
    gaori_w_id = saved_gaori_w["id"]["id"]
    print(f"-> Widget Type GAORI guardado con éxito. ID: {gaori_w_id}, FQN: {saved_gaori_w.get('fqn')}")

# 3. Asignar este widget exclusivamente al dashboard de GAORI
print("[3/3] Apuntando Dashboard EPM_GAORI al widget exclusivo...")
dash_id = "8b81f730-be69-11f1-a395-4fe608e17de1"
dash_url = f"http://localhost:8082/api/dashboard/{dash_id}"
with urllib.request.urlopen(urllib.request.Request(dash_url, headers=headers)) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

widget_instance_id = "052de3af-13b9-f603-76bb-59e4a5e4805d"
if widget_instance_id in dash.get("configuration", {}).get("widgets", {}):
    w_conf = dash["configuration"]["widgets"][widget_instance_id]
    w_conf["typeId"] = {"entityType": "WIDGET_TYPE", "id": gaori_w_id}
    w_conf["typeFullFqn"] = f"tenant.{saved_gaori_w.get('fqn')}"
    w_conf["config"]["title"] = "SCADA GAORI - Registro de Eventos y Fallas"
    
    save_dash_req = urllib.request.Request(
        "http://localhost:8082/api/dashboard",
        data=json.dumps(dash).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_dash_req) as resp:
        print("-> Dashboard EPM_GAORI actualizado para usar el widget exclusivo de GAORI.")

print(">>> ASIGNACIÓN EXCLUSIVA DE GAORI COMPLETADA <<<")
