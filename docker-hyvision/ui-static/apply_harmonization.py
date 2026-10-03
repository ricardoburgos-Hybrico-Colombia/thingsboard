import urllib.request
import json
import re

# 1. Login
login_url = "http://hyvision-app:8080/api/auth/login"
payload = json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8")
req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

headers = {
    "X-Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def update_widget(wid, modifier_fn):
    url = f"http://hyvision-app:8080/api/widgetType/{wid}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp:
        w_data = json.loads(resp.read().decode("utf-8"))
    
    descriptor = w_data.get("descriptor", {})
    html = descriptor.get("templateHtml", "")
    css = descriptor.get("templateCss", "")
    js = descriptor.get("controllerScript", "")
    
    new_html, new_css, new_js = modifier_fn(html, css, js)
    
    descriptor["templateHtml"] = new_html
    descriptor["templateCss"] = new_css
    descriptor["controllerScript"] = new_js
    w_data["descriptor"] = descriptor
    
    save_req = urllib.request.Request(
        "http://hyvision-app:8080/api/widgetType",
        data=json.dumps(w_data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_req) as resp:
        saved = json.loads(resp.read().decode("utf-8"))
        print(f"Updated {w_data.get('fqn')} successfully!")

# --- 1. SINOPTICO MICRORRED SCADA ---
def mod_sinoptico(html, css, js):
    # CSS modifications
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("border-top: 3.5px solid #06b6d4;", "border-top: 3.5px solid #64B856;")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace("fill: #1a2436;", "fill: #101c13;")
    css = css.replace("stroke: rgba(255, 255, 255, 0.08);", "stroke: rgba(100, 184, 86, 0.18);")
    css = css.replace(".flow-bess-charging {\n  stroke: #10b981;", ".flow-bess-charging {\n  stroke: #64B856;")
    css = css.replace(".flow-solar {\n  stroke: #f59e0b;", ".flow-solar {\n  stroke: #f7d048;")
    css = css.replace(".flow-load {\n  stroke: #00a8ff;", ".flow-load {\n  stroke: #62c3f5;")
    css = css.replace(".flow-badge-bg {\n  fill: #0c1322;", ".flow-badge-bg {\n  fill: #070e08;")
    css = css.replace("ac-busbar {\n  stroke: #06b6d4;", "ac-busbar {\n  stroke: #38bdf8;")
    css = css.replace("drop-shadow(0 0 8px rgba(6, 182, 212, 0.7));", "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6));")
    
    # HTML modifications
    html = html.replace('fill="#151d2a"', 'fill="#0b140d"')
    html = html.replace('stroke="rgba(255, 255, 255, 0.02)"', 'stroke="rgba(100, 184, 86, 0.04)"')
    html = html.replace('stroke="#f59e0b"', 'stroke="#f7d048"')
    html = html.replace('fill="#f59e0b"', 'fill="#f7d048"')
    html = html.replace('stroke="#10b981"', 'stroke="#64B856"')
    html = html.replace('fill="#10b981"', 'fill="#64B856"')
    html = html.replace('fill="#22c55e"', 'fill="#64B856"')
    html = html.replace('stroke="#00a8ff"', 'stroke="#62c3f5"')
    html = html.replace('fill="#00a8ff"', 'fill="#62c3f5"')
    html = html.replace('fill="#06b6d4"', 'fill="#38bdf8"')
    html = html.replace('fill="#1c2738"', 'fill="#101c13"')
    html = html.replace('stroke="rgba(255,255,255,0.15)"', 'stroke="rgba(100, 184, 86, 0.22)"')
    
    # JS modifications
    js = js.replace("isCharging ? '#10b981' : '#f59e0b'", "isCharging ? '#64B856' : '#f7d048'")
    js = js.replace("elBal.style.color = '#06b6d4'", "elBal.style.color = '#64B856'")
    js = js.replace("elBal.style.color = '#22c55e'", "elBal.style.color = '#64B856'")
    
    return html, css, js

# --- 2. TENDENCIA TENSION Y CORRIENTE BESS ---
def mod_tendencia_vc(html, css, js):
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("border-top: 3.5px solid #38bdf8;", "border-top: 3.5px solid #38bdf8;")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace("background: rgba(255, 255, 255, 0.02);", "background: rgba(255, 255, 255, 0.03);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.05);", "border: 1px solid rgba(100, 184, 86, 0.12);")
    css = css.replace(".kpi-num.i-color { color: #10b981; }", ".kpi-num.i-color { color: #64B856; }")
    css = css.replace(".trend-badge.charging {\n  color: #10b981;\n  border: 1.5px solid #10b981;\n  background: rgba(16, 185, 129, 0.1);\n}",
                      ".trend-badge.charging {\n  color: #64B856;\n  border: 1.5px solid #64B856;\n  background: rgba(100, 184, 86, 0.12);\n}")
    css = css.replace(".trend-badge.discharging {\n  color: #f59e0b;\n  border: 1.5px solid #f59e0b;\n  background: rgba(245, 158, 11, 0.1);\n}",
                      ".trend-badge.discharging {\n  color: #f7d048;\n  border: 1.5px solid #f7d048;\n  background: rgba(247, 208, 72, 0.12);\n}")

    html = html.replace('style="color:#10b981;"', 'style="color:#64B856;"')
    
    js = js.replace("ctx.fillStyle = '#10b981';", "ctx.fillStyle = '#64B856';")
    js = js.replace("grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');", "grad.addColorStop(0, 'rgba(100, 184, 86, 0.30)');")
    js = js.replace("grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');", "grad.addColorStop(1, 'rgba(100, 184, 86, 0.0)');")
    js = js.replace("ctx.strokeStyle = '#10b981';", "ctx.strokeStyle = '#64B856';")
    js = js.replace("ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';", "ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';")
    
    return html, css, js

# --- 3. POTENCIA ACTIVA INVERSORES ---
def mod_potencia_pcs(html, css, js):
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace("background: rgba(56, 189, 248, 0.1);", "background: rgba(56, 189, 248, 0.12);")
    css = css.replace("border-radius: 4px;\n  transition: width 0.4s ease;", "border-radius: 4px;\n  background: linear-gradient(90deg, #38bdf8, #64B856);\n  transition: width 0.4s ease;")
    
    html = html.replace('style="color:#22c55e;"', 'style="color:#64B856;"')
    html = html.replace('style="width: 60%; background: #38bdf8;"', 'style="width: 60%; background: linear-gradient(90deg, #38bdf8, #64B856);"')
    html = html.replace('style="width: 59.6%; background: #38bdf8;"', 'style="width: 59.6%; background: linear-gradient(90deg, #38bdf8, #64B856);"')
    
    return html, css, js

# --- 4. TENDENCIA DISPERSION TERMICA BESS ---
def mod_tendencia_termica(html, css, js):
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace("background: rgba(255, 255, 255, 0.02);", "background: rgba(255, 255, 255, 0.03);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.05);", "border: 1px solid rgba(100, 184, 86, 0.12);")
    css = css.replace("border-top-color: #10b981;", "border-top-color: #64B856;")
    css = css.replace(".trend-badge.ok {\n  color: #10b981;\n  border: 1.5px solid #10b981;\n  background: rgba(16, 185, 129, 0.1);\n}",
                      ".trend-badge.ok {\n  color: #64B856;\n  border: 1.5px solid #64B856;\n  background: rgba(100, 184, 86, 0.12);\n}")
    
    js = js.replace("'#10b981'", "'#64B856'")
    js = js.replace("ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';", "ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';")
    
    return html, css, js

# --- 5. PERFIL TERMICO INVERSORES ---
def mod_perfil_termico(html, css, js):
    css = css.replace("background-color: #151d2a;", "background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(100, 184, 86, 0.22);")
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);")
    css = css.replace(".pcs-card-container.thermal {\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  background-color: #151d2a;\n  border-radius: 14px;\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  border-top: 3.5px solid #f97316;",
                      ".pcs-card-container.thermal {\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  background: linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%);\n  border-radius: 14px;\n  border: 1px solid rgba(100, 184, 86, 0.22);\n  border-top: 3.5px solid #64B856;")
    css = css.replace(".pcs-badge.thermal.safe { color: #22c55e; border: 1.5px solid #22c55e; background: rgba(34, 197, 94, 0.1); }",
                      ".pcs-badge.thermal.safe { color: #64B856; border: 1.5px solid #64B856; background: rgba(100, 184, 86, 0.12); }")
    css = css.replace(".t-value.safe { color: #22c55e; font-weight: 700; }", ".t-value.safe { color: #64B856; font-weight: 700; }")
    css = css.replace("background: rgba(255, 255, 255, 0.03);", "background: rgba(255, 255, 255, 0.03);")
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.06);", "border: 1px solid rgba(100, 184, 86, 0.15);")
    css = css.replace("border-bottom: 1px solid rgba(255, 255, 255, 0.06);", "border-bottom: 1px solid rgba(100, 184, 86, 0.15);")

    html = html.replace('style="color:#22c55e;"', 'style="color:#64B856;"')
    
    return html, css, js

# Execute updates for top 5 widgets
print("Executing update of top 5 widgets...")
update_widget("5fbbe930-be69-11f1-a395-4fe608e17de1", mod_sinoptico)
update_widget("f95b62d0-be6b-11f1-a395-4fe608e17de1", mod_tendencia_vc)
update_widget("f94087d0-be6b-11f1-a395-4fe608e17de1", mod_potencia_pcs)
update_widget("f9580770-be6b-11f1-a395-4fe608e17de1", mod_tendencia_termica)
update_widget("f9390dc0-be6b-11f1-a395-4fe608e17de1", mod_perfil_termico)
print("Top 5 widgets updated successfully!")
