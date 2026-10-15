import os
import json
import requests
from datetime import datetime, timedelta

def update_file(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
        
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    old_block = '''    n_faults = 0
    n_warnings = 0
    n_activas = 0
    for sn in PCS_SNS:
        d_alm = safe_get("/api/v1/fault/list", {"deviceSn": sn, "pageNo": 1, "pageSize": 200, "startDate": a_start, "endDate": a_end})
        rows = d_alm.get("datas") or []
        for r in rows:
            ft = r.get("faultType")
            if ft == 1:
                n_faults += 1
            elif ft == 2:
                n_warnings += 1
            if not r.get("recoveryTime"):
                n_activas += 1'''

    new_block = '''    n_faults = 0
    n_warnings = 0
    n_activas = 0
    raw_faults_list = []
    for sn in PCS_SNS:
        d_alm = safe_get("/api/v1/fault/list", {"deviceSn": sn, "pageNo": 1, "pageSize": 100, "startDate": a_start, "endDate": a_end})
        rows = d_alm.get("datas") or []
        for r in rows:
            ft = r.get("faultType")
            if ft == 1:
                n_faults += 1
            elif ft == 2:
                n_warnings += 1
            if not r.get("recoveryTime"):
                n_activas += 1
            raw_faults_list.append(r)

    # Ordenar por fecha descendente (eventos mas recientes primero)
    raw_faults_list.sort(key=lambda x: str(x.get("faultTime") or ""), reverse=True)
    pcs_name_map = {
        "TQG0F12136": "Inversor PCS-01 (TQG0F12136)",
        "TQG0F12135": "Inversor PCS-02 (TQG0F12135)",
        "TQG0F12134": "Inversor PCS-03 (TQG0F12134)"
    }
    desc_trans_map = {
        "LcdEmergencyStop": "Parada de Emergencia Manual por LCD",
        "AC_NoUtility_Fault": "Falla de Tension de Red AC / Ausencia de Red",
        "OverTemperature_Fault": "Sobretemperatura en Inversor PCS",
        "GridVoltageOver_Fault": "Sobretension en Barra AC",
        "GridVoltageUnder_Fault": "Subtension en Barra AC",
        "GridFreqOver_Fault": "Sobrefrecuencia en Barra AC",
        "GridFreqUnder_Fault": "Subfrecuencia en Barra AC",
        "BatVoltageOver_Fault": "Sobretension en Banco de Baterias",
        "BatVoltageUnder_Fault": "Subtension en Banco de Baterias"
    }
    real_history_formatted = []
    for idx, item in enumerate(raw_faults_list[:40]):
        dev_sn = item.get("deviceSn", "")
        dev_label = pcs_name_map.get(dev_sn, f"Inversor PCS ({dev_sn})")
        raw_desc = item.get("faultDescription") or "Falla Operativa"
        friendly_desc = desc_trans_map.get(raw_desc, raw_desc)
        code = item.get("eventSn") or f"FLT-{idx+1:02d}"
        f_time = str(item.get("faultTime") or "")
        r_time = str(item.get("recoveryTime") or "")
        f_type = item.get("faultType", 1)
        is_active = not bool(r_time)

        real_history_formatted.append({
            "id": f"GAORI-{dev_sn}-{code}-{idx+1}",
            "time": f_time,
            "subsystem": dev_label,
            "tag": "Inversor Central AC/DC",
            "code": code,
            "desc": friendly_desc,
            "metrics": f"Despejada: {r_time}" if r_time else "Alarma activa en curso",
            "severity": "CRITICAL" if is_active else "OK",
            "status": "ACTIVA" if is_active else "RESUELTA"
        })'''

    old_payload_line = '"warnings_30d_total": n_warnings,'
    new_payload_line = '"warnings_30d_total": n_warnings,\n        "fault_history_json": json.dumps(real_history_formatted),'

    if old_block in content:
        content = content.replace(old_block, new_block)
        if old_payload_line in content:
            content = content.replace(old_payload_line, new_payload_line, 1)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated: {file_path}")
        return True
    else:
        print(f"Target block not found in: {file_path}")
        return False

# Actualizar ambos archivos
f1 = r"c:\Users\PC\Documents\AI_Engineer\20.LEER_DATA_API_ENERCLO\sync_enerclo_thingsboard_produc.py"
f2 = r"Z:\Documents\ricardo_burgos\ingesta_datos_thingsboard\sync_enerclo_thingsboard_produc.py"
update_file(f1)
update_file(f2)
