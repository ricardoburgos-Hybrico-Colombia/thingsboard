#!/usr/bin/env python3
"""
Push SCADA widget types from dump_widgets/ and apply Fleet Hub card styling
to all tenant dashboards (canvas + per-widget config).

Usage (from host):
  python3 apply_fleet_scada_theme.py
  HYVISION_TB_URL=http://localhost:8082 python3 apply_fleet_scada_theme.py

Inside docker network:
  HYVISION_TB_URL=http://hyvision-app:8080 python3 apply_fleet_scada_theme.py
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get("HYVISION_TB_URL", "http://localhost:8082").rstrip("/")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DUMP_DIR = os.path.join(SCRIPT_DIR, "dump_widgets")
SINOPTICO_WIDGET_ID = "5fbbe930-be69-11f1-a395-4fe608e17de1"
SINOPTICO_ADAPTIVE = (
    os.path.join(SCRIPT_DIR, "sinoptico_adaptive.html"),
    os.path.join(SCRIPT_DIR, "sinoptico_adaptive.js"),
    os.path.join(SCRIPT_DIR, "sinoptico_adaptive.css"),
)
LOGIN_USER = os.environ.get("HYVISION_TB_USER", "tenant@thingsboard.org")
LOGIN_PASS = os.environ.get("HYVISION_TB_PASS", "tenant")

FLEET_CANVAS_COLOR = "#070d07"
FLEET_CARD_BG = (
    "linear-gradient(165deg, rgba(32, 54, 28, 0.5) 0%, rgba(14, 25, 14, 0.85) 100%)"
)
FLEET_CARD_BORDER = "1px solid rgba(130, 195, 120, 0.22)"
OLD_PANEL_BG = "linear-gradient(160deg, rgba(14, 25, 16, 0.95) 0%, rgba(8, 15, 9, 0.98) 100%)"

WIDGET_TABLE_CSS = """
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
.tb-widget-title, .tb-widget-title-text {
  color: #f1f5f9 !important;
  font-weight: 700 !important;
}
"""


def api_request(path: str, method: str = "GET", body=None, token: str | None = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Authorization"] = f"Bearer {token}"
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def login() -> str:
    out = api_request(
        "/api/auth/login",
        method="POST",
        body={"username": LOGIN_USER, "password": LOGIN_PASS},
    )
    return out["token"]


def is_custom_html_widget(fqn: str) -> bool:
    """Widgets HTML propios: la franja de color va en la tarjeta interna, no en el shell TB."""
    return fqn.lower().startswith("tenant.")


def fleet_widget_style_native(accent_top: str) -> dict:
    """Gráficas/tablas nativas sin tarjeta HTML interna."""
    return {
        "background": FLEET_CARD_BG,
        "border": FLEET_CARD_BORDER,
        "borderTop": accent_top,
        "borderRadius": "14px",
        "boxShadow": "0 10px 28px rgba(0, 0, 0, 0.45)",
    }


CUSTOM_WIDGET_OUTER_STYLE = {
    "background": "transparent",
    "border": "none",
    "borderRadius": "14px",
    "boxShadow": "none",
}


def resolve_widget_accent(fqn: str, title: str) -> str:
    """Borde superior de categoría (como SOC Baterías / tarjetas SCADA)."""
    t = f"{fqn} {title}".lower()
    if any(k in t for k in ("solar", "generaci", "pbd", "mppt", "fotovolta")):
        return "3.5px solid #f7d048"
    if any(k in t for k in ("carga", "demanda", "load", "telecom", "bts")):
        return "3.5px solid #ffffff"
    if any(k in t for k in ("dg", "respaldo", "generador", "diesel", "electr")):
        return "3.5px solid #64748b"
    if any(k in t for k in ("termic", "térm", "dispers", "thermal")):
        return "3.5px solid #f97316"
    if any(k in t for k in ("tension", "tensión", "voltaje", "corriente", "vc", "elec")):
        return "3.5px solid #8ce47e"
    if any(k in t for k in ("reactiva", "reactive", "kvar")):
        return "3.5px solid #c4b5fd"
    if any(k in t for k in ("pcs", "inversor", "potencia_activa", "activa")):
        return "3.5px solid #8ce47e"
    if any(k in t for k in ("sinopt", "sinópt")):
        return "3.5px solid #64B856"
    if any(k in t for k in ("bess", "almacen", "soc", "battery", "rack", "celda")):
        return "3.5px solid #64B856"
    if any(k in t for k in ("evento", "falla", "alarm", "registro", "estado", "balance", "modo", "operaci")):
        return "3.5px solid #64B856"
    if any(k in t for k in ("timeseries", "chart", "range", "table", "gráf", "graf")):
        return "3.5px solid #64B856"
    return "3.5px solid #64B856"


def harmonize_descriptor_text(html: str, css: str, js: str, fqn: str, name: str) -> tuple[str, str, str]:
    wname = (fqn or name or "").lower()

    css = css.replace("background-color: #151d2a;", f"background: {FLEET_CARD_BG};")
    css = css.replace(OLD_PANEL_BG, FLEET_CARD_BG)
    css = css.replace("border: 1px solid rgba(255, 255, 255, 0.08);", FLEET_CARD_BORDER)
    css = re.sub(
        r"border:\s*1px solid rgba\(100,\s*184,\s*86,\s*0\.22\);",
        FLEET_CARD_BORDER,
        css,
    )
    css = css.replace("box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);", "box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);")
    css = css.replace("box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);", "box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);")
    css = css.replace("#22c55e", "#64B856")
    css = css.replace("#10b981", "#64B856")
    css = css.replace("rgba(34, 197, 94,", "rgba(100, 184, 86,")
    css = css.replace("rgba(16, 185, 129,", "rgba(100, 184, 86,")
    html = html.replace("#22c55e", "#64B856").replace("#10b981", "#64B856")
    js = js.replace("#22c55e", "#64B856").replace("#10b981", "#64B856")

    if "solar" in wname:
        css = css.replace("#f59e0b", "#f7d048")
        html = html.replace("#f59e0b", "#f7d048")
        js = js.replace("#f59e0b", "#f7d048")
    if "carga" in wname or "load" in wname:
        css = css.replace("#00a8ff", "#62c3f5")
        html = html.replace("#00a8ff", "#62c3f5")
        js = js.replace("#00a8ff", "#62c3f5")

    # Match .hyv-site-card container if missing fleet gradient
    if FLEET_CARD_BG.split("(")[0] not in css and "linear-gradient(165deg" not in css:
        css = re.sub(
            r"(\.[a-z0-9_-]+-container\s*\{[^}]*?)background:[^;]+;",
            rf"\1background: {FLEET_CARD_BG};",
            css,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        )

    return html, css, js


def push_widget_types(token: str) -> int:
    paths = sorted(glob.glob(os.path.join(DUMP_DIR, "*.json")))
    if not paths:
        print(f"No widget dumps in {DUMP_DIR}")
        return 0

    count = 0
    for path in paths:
        with open(path, "r", encoding="utf-8") as f:
            dump = json.load(f)
        wid = dump.get("id", {}).get("id") or dump.get("id")
        if not wid:
            continue
        fqn = dump.get("fqn", "")
        name = dump.get("name", os.path.basename(path))

        try:
            live = api_request(f"/api/widgetType/{wid}", token=token)
        except urllib.error.HTTPError as e:
            print(f"  [SKIP widget] {name}: not found HTTP {e.code}", file=sys.stderr)
            continue

        if wid == SINOPTICO_WIDGET_ID:
            html_path, js_path, css_path = SINOPTICO_ADAPTIVE
            with open(html_path, "r", encoding="utf-8") as f:
                html = f.read()
            with open(js_path, "r", encoding="utf-8") as f:
                js = f.read()
            with open(css_path, "r", encoding="utf-8") as f:
                css = f.read()
        else:
            dump_desc = dump.get("descriptor") or {}
            use_desc = dump_desc if dump_desc.get("templateHtml") else (live.get("descriptor") or {})
            html = use_desc.get("templateHtml", "")
            css = use_desc.get("templateCss", "")
            js = use_desc.get("controllerScript", "")
        html, css, js = harmonize_descriptor_text(html, css, js, fqn, name)

        live_desc = live.get("descriptor") or {}
        live_desc["templateHtml"] = html
        live_desc["templateCss"] = css
        live_desc["controllerScript"] = js
        if not live_desc.get("resources"):
            live_desc["resources"] = []
        live["descriptor"] = live_desc
        if not live.get("resources"):
            live["resources"] = []

        try:
            api_request("/api/widgetType", method="POST", body=live, token=token)
            print(f"  [widget] {name} ({wid}) v{live.get('version')}")
            count += 1
        except urllib.error.HTTPError as e:
            print(f"  [FAIL widget] {name}: HTTP {e.code} {e.read().decode()[:200]}", file=sys.stderr)
    return count


def harmonize_chart_settings(settings: dict) -> None:
    if not isinstance(settings, dict):
        return
    bg = settings.get("background")
    if isinstance(bg, dict):
        bg["type"] = "color"
        bg["color"] = "transparent"
        overlay = bg.get("overlay")
        if isinstance(overlay, dict):
            overlay["enabled"] = False
    for rc in settings.get("rangeColors") or []:
        if rc.get("color") in ("#4CAF50", "#22c55e", "#10b981"):
            rc["color"] = "#64B856"
        elif rc.get("color") == "#E89623":
            rc["color"] = "#f7d048"
    for axis_key in ("yAxis", "xAxis"):
        axis = settings.get(axis_key)
        if not isinstance(axis, dict):
            continue
        axis["labelColor"] = "#94a3b8"
        axis["tickLabelColor"] = "#94a3b8"
        if axis_key == "yAxis":
            axis["splitLinesColor"] = "rgba(100, 184, 86, 0.08)"
        else:
            axis["lineColor"] = "rgba(100, 184, 86, 0.2)"
            axis["ticksColor"] = "rgba(100, 184, 86, 0.2)"
    if "legendLabelColor" in settings:
        settings["legendLabelColor"] = "#94a3b8"


def apply_widget_instance_theme(w: dict) -> bool:
    """Apply Fleet Hub shell to a dashboard widget instance."""
    cfg = w.get("config")
    if not isinstance(cfg, dict):
        return False

    fqn = (w.get("typeFullFqn") or "").lower()
    title = (cfg.get("title") or "").lower()
    changed = False

    cfg["backgroundColor"] = "transparent"
    cfg["color"] = cfg.get("color") or "rgba(255, 255, 255, 0.87)"
    if cfg["color"] in ("#000", "#000000", "black"):
        cfg["color"] = "#cbd5e1"
    cfg["titleColor"] = "#f1f5f9"
    cfg["borderRadius"] = "14px"
    cfg["dropShadow"] = True
    cfg["padding"] = cfg.get("padding") or "0px"

    accent = resolve_widget_accent(fqn, title)
    if is_custom_html_widget(fqn):
        cfg["widgetStyle"] = dict(CUSTOM_WIDGET_OUTER_STYLE)
        cfg["dropShadow"] = False
    else:
        cfg["widgetStyle"] = fleet_widget_style_native(accent)
    changed = True

    settings = cfg.get("settings")
    if isinstance(settings, dict):
        harmonize_chart_settings(settings)
        cfg["settings"] = settings
        changed = True

    if "timeseries" in fqn and "table" in fqn:
        cfg["widgetCss"] = WIDGET_TABLE_CSS
        changed = True

    w["config"] = cfg
    return changed


def apply_dashboard_theme(dash: dict) -> bool:
    cfg = dash.get("configuration") or {}
    states = cfg.get("states") or {}
    default = states.get("default") or {}
    layouts = default.get("layouts") or {}
    modified = False

    for layout_id, layout in layouts.items():
        if not isinstance(layout, dict):
            continue
        grid = layout.get("gridSettings") or {}
        grid["backgroundImageUrl"] = None
        grid["backgroundColor"] = FLEET_CANVAS_COLOR
        grid["margin"] = grid.get("margin", 10)
        grid["outerMargin"] = True
        layout["gridSettings"] = grid
        modified = True

    widgets = cfg.get("widgets") or {}
    for w in widgets.values():
        if apply_widget_instance_theme(w):
            modified = True

    dash["configuration"] = cfg
    return modified


def push_all_dashboards(token: str) -> int:
    listing = api_request("/api/tenant/dashboards?pageSize=100&page=0", token=token)
    dashboards = listing.get("data") or []
    saved = 0
    for item in dashboards:
        did = item["id"]["id"]
        title = item.get("title", did)
        dash = api_request(f"/api/dashboard/{did}", token=token)
        if not apply_dashboard_theme(dash):
            continue
        api_request("/api/dashboard", method="POST", body=dash, token=token)
        print(f"  [dashboard] {title}")
        saved += 1
    return saved


def main() -> int:
    print(f"HyVision Fleet SCADA theme → {BASE_URL}")
    try:
        token = login()
    except Exception as e:
        print(f"Login failed: {e}", file=sys.stderr)
        return 1

    print("\n1/2 Widget types (dump_widgets/)…")
    n_w = push_widget_types(token)
    print(f"    Updated {n_w} widget type(s).\n")

    print("2/2 Dashboard instances…")
    n_d = push_all_dashboards(token)
    print(f"    Updated {n_d} dashboard(s).\n")

    print("Done. Hard-refresh SCADA (Ctrl+Shift+R).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
