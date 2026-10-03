import urllib.request
import json
import re

# Login
login_url = "http://hyvision-app:8080/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

remaining_widgets = [
    ("f932cc30-be6b-11f1-a395-4fe608e17de1", "generacion_solar_card"),
    ("f9199ee0-be6b-11f1-a395-4fe608e17de1", "almacenamiento_bess_card_dyn"),
    ("f9233bd0-be6b-11f1-a395-4fe608e17de1", "demanda_carga_card"),
    ("f94ac100-be6b-11f1-a395-4fe608e17de1", "respaldo_dg_card"),
    ("f91cfa40-be6b-11f1-a395-4fe608e17de1", "balance_planta_card"),
    ("f92efba0-be6b-11f1-a395-4fe608e17de1", "estado_general_card"),
    ("f9465430-be6b-11f1-a395-4fe608e17de1", "registro_eventos_fallas_scada"),
    ("f9200780-be6b-11f1-a395-4fe608e17de1", "bess_desbalance_celdas_scada"),
    ("f92c1570-be6b-11f1-a395-4fe608e17de1", "dg_sincronismo_scada"),
    ("f9436e00-be6b-11f1-a395-4fe608e17de1", "potencia_reactiva_pcs_scada"),
    ("f9292f40-be6b-11f1-a395-4fe608e17de1", "dg_potencia_ac_scada"),
    ("f9360080-be6b-11f1-a395-4fe608e17de1", "pbd_tableros_dc_scada"),
    ("f954ac10-be6b-11f1-a395-4fe608e17de1", "soc_racks_linear_scada"),
    ("f9262200-be6b-11f1-a395-4fe608e17de1", "dg_corrientes_fase_scada")
]

for wid, wname in remaining_widgets:
    url = f"http://hyvision-app:8080/api/widgetType/{wid}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
        w_data = json.loads(resp.read().decode("utf-8"))
    
    desc = w_data.get("descriptor", {})
    html = desc.get("templateHtml", "")
    css = desc.get("templateCss", "")
    js = desc.get("controllerScript", "")
    
    # Universal CSS Harmonization
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.05);", "border: 1px solid rgba(100, 184, 86, 0.12);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.06);", "border: 1px solid rgba(100, 184, 86, 0.15);")
    css = css.replace("background: rgba(255, 255, 255, 0.02);", "background: rgba(255, 255, 255, 0.03);")
    
    # Universal Greens -> Hybrico Emerald #64B856
    css = css.replace("#22c55e", "#64B856")
    css = css.replace("#10b981", "#64B856")
    css = css.replace("rgba(34, 197, 94,", "rgba(100, 184, 86,")
    css = css.replace("rgba(16, 185, 129,", "rgba(100, 184, 86,")
    html = html.replace("#22c55e", "#64B856")
    html = html.replace("#10b981", "#64B856")
    js = js.replace("#22c55e", "#64B856")
    js = js.replace("#10b981", "#64B856")
    
    # Solar specific
    if "solar" in wname:
        css = css.replace("#f59e0b", "#f7d048")
        html = html.replace("#f59e0b", "#f7d048")
        js = js.replace("#f59e0b", "#f7d048")
    
    # Load specific
    if "carga" in wname or "load" in wname:
        css = css.replace("#00a8ff", "#62c3f5")
        html = html.replace("#00a8ff", "#62c3f5")
        js = js.replace("#00a8ff", "#62c3f5")

    # BESS specific
    if "bess" in wname:
        css = css.replace("discharging {\n  border-top-color: #f59e0b;", "discharging {\n  border-top-color: #f7d048;")
        css = css.replace("discharging {\n  color: #f59e0b;", "discharging {\n  color: #f7d048;")
        css = css.replace("rgba(245, 158, 11,", "rgba(247, 208, 72,")

    # Balance specific
    if "balance" in wname:
        css = css.replace("border-top: 3.5px solid #06b6d4;", "border-top: 3.5px solid #64B856;")
        html = html.replace("#06b6d4", "#64B856")
        js = js.replace("#06b6d4", "#64B856")

    # General state card
    if "estado_general" in wname:
        css = css.replace("border-top: 3.5px solid #6366f1;", "border-top: 3.5px solid #64B856;")

    desc["templateHtml"] = html
    desc["templateCss"] = css
    desc["controllerScript"] = js
    w_data["descriptor"] = desc
    
    save_req = urllib.request.Request(
        "http://hyvision-app:8080/api/widgetType",
        data=json.dumps(w_data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_req) as resp:
        saved = json.loads(resp.read().decode("utf-8"))
        print(f"Updated {wname} successfully!")

print("All remaining widgets harmonized!")
