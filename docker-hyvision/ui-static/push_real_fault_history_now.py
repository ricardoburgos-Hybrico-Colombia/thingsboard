import requests
import json
from datetime import datetime, timedelta

print("[1/2] Consultando fallas reales de Enerclo API para GAORI...")
url = "https://www.enerclo-atesspower.com/api/v1/fault/list"
headers = {
    "Authorization": "MzA5Mzo3Y2M1MWFkYzU3ODU0ZDJjYWQ3ZDIwYThhMmJlNDRkNA==",
    "Accept-Language": "en",
    "User-Agent": "Mozilla/5.0"
}
today = datetime.now()
a_start = (today - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
a_end = today.strftime("%Y-%m-%d %H:%M:%S")

pcs_sns = ["TQG0F12136", "TQG0F12135", "TQG0F12134"]
raw_faults_list = []
n_faults = 0
n_warnings = 0
n_activas = 0

for sn in pcs_sns:
    try:
        resp = requests.get(url, headers=headers, params={"deviceSn": sn, "pageNo": 1, "pageSize": 100, "startDate": a_start, "endDate": a_end}, timeout=10)
        data = resp.json().get("data", {})
        rows = data.get("datas") or []
        for r in rows:
            ft = r.get("faultType")
            if ft == 1:
                n_faults += 1
            elif ft == 2:
                n_warnings += 1
            if not r.get("recoveryTime"):
                n_activas += 1
            raw_faults_list.append(r)
    except Exception as e:
        print(f"Error fetching for {sn}: {e}")

raw_faults_list.sort(key=lambda x: str(x.get("faultTime") or ""), reverse=True)
print(f"-> Total fallas reales recuperadas: {len(raw_faults_list)} (Activas: {n_activas}, Fallas: {n_faults}, Warns: {n_warnings})")

pcs_name_map = {
    "TQG0F12136": "Inversor PCS-01 (TQG0F12136)",
    "TQG0F12135": "Inversor PCS-02 (TQG0F12135)",
    "TQG0F12134": "Inversor PCS-03 (TQG0F12134)"
}
desc_trans_map = {
    "Parallel_Uneven_Flow_Warning": "Desbalance de Reparto de Corriente en Paralelo (Aviso)",
    "AC_UnderFreq_Rmt_Warning": "Subfrecuencia Remota en Barra AC (Aviso)",
    "AC_OverFreq_Rmt_Warning": "Sobrefrecuencia Remota en Barra AC (Aviso)",
    "CANb_Communication_Fault (PCS)": "Falla de Comunicación en Bus CANb Interno",
    "CANb_Communication_Fault（PCS）": "Falla de Comunicación en Bus CANb Interno",
    "Batt_UnderVolt_Fault": "Falla por Subtensión en Banco de Baterías",
    "Batt_OverVolt_Fault": "Falla por Sobretensión en Banco de Baterías",
    "BMS_Communication_Fault": "Pérdida de Comunicación con Sistema BMS",
    "PBD_Communication_Fault (PCS)": "Falla de Comunicación con Tableros Solares PBD",
    "PBD_Communication_Fault（PCS）": "Falla de Comunicación con Tableros Solares PBD",
    "AC_NoUtility_Fault": "Falla de Tensión en Barra AC / Ausencia de Red",
    "AC_GridPhaseSeque_Fault": "Secuencia de Fase Incorrecta en Barra AC",
    "LcdEmergencyStop": "Parada de Emergencia Manual por Pantalla LCD",
    "Paraller_PLL_Signal_Fault": "Falla de Sincronismo PLL para Operación en Paralelo",
    "Parallel_PLL_Signal_Fault": "Falla de Sincronismo PLL para Operación en Paralelo",
    "Alarm of Fault No>Redundancy No": "Fallas Acumuladas Superan Redundancia N+1",
    "OverTemperature_Fault": "Sobretemperatura en Inversor PCS",
    "GridVoltageOver_Fault": "Sobretensión en Barra AC",
    "GridVoltageUnder_Fault": "Subtensión en Barra AC",
    "GridFreqOver_Fault": "Sobrefrecuencia en Barra AC",
    "GridFreqUnder_Fault": "Subfrecuencia en Barra AC",
    "BatVoltageOver_Fault": "Sobretensión en Banco de Baterías",
    "BatVoltageUnder_Fault": "Subtensión en Banco de Baterías"
}

code_trans_map = {
    "7-D3": "Desbalance de Reparto de Corriente en Paralelo (Aviso)",
    "7-D15": "Subfrecuencia Remota en Barra AC (Aviso)",
    "7-D14": "Sobrefrecuencia Remota en Barra AC (Aviso)",
    "8-D11": "Falla de Comunicación en Bus CANb Interno",
    "6-D13": "Falla por Subtensión en Banco de Baterías",
    "2-D3": "Pérdida de Comunicación con Sistema BMS",
    "2-D9": "Falla de Comunicación con Tableros Solares PBD",
    "3-D0": "Falla de Tensión en Barra AC / Ausencia de Red",
    "3-D1": "Secuencia de Fase Incorrecta en Barra AC",
    "5-D2": "Parada de Emergencia Manual por Pantalla LCD",
    "6-D12": "Falla por Sobretensión en Banco de Baterías",
    "8-D14": "Falla de Sincronismo PLL para Operación en Paralelo",
    "9-D8": "Fallas Acumuladas Superan Redundancia N+1"
}

real_history_formatted = []
for idx, item in enumerate(raw_faults_list[:40]):
    dev_sn = item.get("deviceSn", "")
    dev_label = pcs_name_map.get(dev_sn, f"Inversor PCS ({dev_sn})")
    raw_desc = (item.get("faultDescription") or "Falla Operativa").strip()
    code = item.get("eventSn") or f"FLT-{idx+1:02d}"
    friendly_desc = desc_trans_map.get(raw_desc, code_trans_map.get(code, raw_desc))
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
    })

print("[2/2] Enviando telemetria real a ThingsBoard...")
tb_payload = {
    "alarmas_activas_total": n_activas,
    "faults_30d_total": n_faults,
    "warnings_30d_total": n_warnings,
    "fault_history_json": json.dumps(real_history_formatted)
}

tb_url = "http://localhost:8082/api/v1/HYBRICO_BESS_TOKEN/telemetry"
resp_tb = requests.post(tb_url, json=tb_payload, timeout=10)
print(f"-> ThingsBoard Telemetry Response: {resp_tb.status_code}")
if resp_tb.status_code == 200:
    print(">>> TELEMETRIA REAL DE ALARMAS HISTORICAS ENVIADA EXITOSAMENTE <<<")
else:
    print(f"Error enviando a TB: {resp_tb.text}")
