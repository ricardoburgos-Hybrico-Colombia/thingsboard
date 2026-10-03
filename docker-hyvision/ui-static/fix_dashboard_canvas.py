import urllib.request
import json

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

# Fetch Dashboard EPM_GAORI
dash_id = "8b81f730-be69-11f1-a395-4fe608e17de1"
dash_url = f"http://hyvision-app:8080/api/dashboard/{dash_id}"
with urllib.request.urlopen(urllib.request.Request(dash_url, headers=headers)) as resp:
    dash = json.loads(resp.read().decode("utf-8"))

cfg = dash.get("configuration", {})
main_layout = cfg.get("states", {}).get("default", {}).get("layouts", {}).get("main", {})

# 1. FIX CANVAS BACKGROUND & REMOVE MISMATCHED WHITE BACKGROUND IMAGE
grid_settings = main_layout.get("gridSettings", {})
grid_settings["backgroundImageUrl"] = None
grid_settings["backgroundColor"] = "#070d07"
grid_settings["margin"] = 10
grid_settings["outerMargin"] = True
main_layout["gridSettings"] = grid_settings
print("1. Dashboard canvas background set to #070d07 and white background image removed.")

# 2. FIX NATIVE WIDGET: SOC BATTERY (Range Chart)
w_soc_id = "db97d99e-8e24-6ed2-c516-077ea5ee7ff5"
if w_soc_id in cfg.get("widgets", {}):
    w_soc = cfg["widgets"][w_soc_id]
    w_cfg = w_soc.get("config", {})
    w_cfg["backgroundColor"] = "transparent"
    w_cfg["color"] = "#cbd5e1"
    w_cfg["titleColor"] = "#f1f5f9"
    w_cfg["borderRadius"] = "10px"
    w_cfg["dropShadow"] = True
    w_cfg["widgetStyle"] = {
        "background": "linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%)",
        "border": "1px solid rgba(100, 184, 86, 0.22)",
        "borderTop": "3.5px solid #64B856",
        "borderRadius": "10px",
        "boxShadow": "0 10px 30px rgba(0, 0, 0, 0.45)"
    }
    
    settings = w_cfg.get("settings", {})
    if "background" in settings:
        settings["background"]["type"] = "color"
        settings["background"]["color"] = "transparent"
        if "overlay" in settings["background"]:
            settings["background"]["overlay"]["enabled"] = False
    
    # Range colors: replace generic green with Hybrico green #64B856
    if "rangeColors" in settings:
        for rc in settings["rangeColors"]:
            if rc.get("color") in ["#4CAF50", "#22c55e", "#10b981"]:
                rc["color"] = "#64B856"
            elif rc.get("color") == "#E89623":
                rc["color"] = "#f7d048"
    
    # Axes colors
    if "yAxis" in settings:
        settings["yAxis"]["labelColor"] = "#94a3b8"
        settings["yAxis"]["tickLabelColor"] = "#94a3b8"
        settings["yAxis"]["splitLinesColor"] = "rgba(100, 184, 86, 0.08)"
    if "xAxis" in settings:
        settings["xAxis"]["labelColor"] = "#94a3b8"
        settings["xAxis"]["tickLabelColor"] = "#94a3b8"
        settings["xAxis"]["lineColor"] = "rgba(100, 184, 86, 0.2)"
        settings["xAxis"]["ticksColor"] = "rgba(100, 184, 86, 0.2)"
    if "legendLabelColor" in settings:
        settings["legendLabelColor"] = "#94a3b8"
    
    w_cfg["settings"] = settings
    w_soc["config"] = w_cfg
    cfg["widgets"][w_soc_id] = w_soc
    print("2. Native widget SOC BATTERY updated with Obsidian Emerald theme.")

# 3. FIX NATIVE WIDGET: Tabla de datos históricos (Timeseries Table)
w_table_id = "db18c56e-f0d6-f699-c3ae-e93cae4bb739"
if w_table_id in cfg.get("widgets", {}):
    w_table = cfg["widgets"][w_table_id]
    w_cfg = w_table.get("config", {})
    w_cfg["backgroundColor"] = "transparent"
    w_cfg["color"] = "#cbd5e1"
    w_cfg["titleColor"] = "#f1f5f9"
    w_cfg["borderRadius"] = "10px"
    w_cfg["dropShadow"] = True
    w_cfg["widgetStyle"] = {
        "background": "linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%)",
        "border": "1px solid rgba(100, 184, 86, 0.22)",
        "borderTop": "3.5px solid #64B856",
        "borderRadius": "10px",
        "boxShadow": "0 10px 30px rgba(0, 0, 0, 0.45)"
    }
    
    # Custom CSS for the native table internal elements
    w_cfg["widgetCss"] = """
.mat-mdc-table, table.mat-table {
  background: transparent !important;
}
.mat-mdc-header-row, tr.mat-header-row {
  background: rgba(18, 34, 20, 0.85) !important;
  border-bottom: 1px solid rgba(100, 184, 86, 0.25) !important;
}
.mat-mdc-header-cell, th.mat-header-cell {
  color: #a4c4a1 !important;
  font-weight: 700 !important;
  font-size: 11.5px !important;
  letter-spacing: 0.6px !important;
}
.mat-mdc-cell, td.mat-cell {
  color: #cbd5e1 !important;
  font-size: 12.5px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
}
.mat-mdc-row:hover, tr.mat-row:hover {
  background: rgba(100, 184, 86, 0.08) !important;
}
.mat-mdc-paginator, .mat-paginator {
  background: transparent !important;
  color: #94a3b8 !important;
  border-top: 1px solid rgba(100, 184, 86, 0.15) !important;
}
.mat-mdc-paginator .mat-mdc-select-value, .mat-paginator .mat-select-value {
  color: #cbd5e1 !important;
}
.tb-widget-title, .tb-widget-title-text {
  color: #f1f5f9 !important;
  font-weight: 700 !important;
}
"""
    w_table["config"] = w_cfg
    cfg["widgets"][w_table_id] = w_table
    
    # Expand Table to full width symmetrically (col: 0, sizeX: 24)
    if w_table_id in main_layout.get("widgets", {}):
        pos = main_layout["widgets"][w_table_id]
        pos["col"] = 0
        pos["sizeX"] = 24
        main_layout["widgets"][w_table_id] = pos
    print("3. Native widget Tabla de datos históricos styled and expanded to full 24-col width.")

# Save Dashboard back to ThingsBoard
save_req = urllib.request.Request(
    "http://hyvision-app:8080/api/dashboard",
    data=json.dumps(dash).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req) as resp:
    saved = json.loads(resp.read().decode("utf-8"))
    print("Dashboard saved successfully with ID:", saved.get("id", {}).get("id"))
