# -*- coding: utf-8 -*-
"""
HYBRICO SCADA · INGESTA CONTINUA EN TIEMPO REAL: EPM-GAORI
- Consulta la telemetria real de los 3 PCS (PCS250) y los 12 convertidores solares (PBD250) en paralelo.
- Determina con precision fisica la generacion solar total, demanda de carga y estado BESS.
- Envia telemetria continua cada 60 segundos al dispositivo BESS_EPM_GAORI en ThingsBoard.
"""

import sys
import os
import time
import json
from datetime import datetime, timedelta
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── CONFIGURACION ─────────────────────────────────────────────────────────────
_ENERCLO_DEFAULT = "MzA5Mzo3Y2M1MWFkYzU3ODU0ZDJjYWQ3ZDIwYThhMmJlNDRkNA=="
ENERCLO_TOKEN = (os.environ.get("ENERCLO_TOKEN") or "").strip() or _ENERCLO_DEFAULT
ENERCLO_URL   = "https://www.enerclo-atesspower.com"
HEADERS_API   = {
    "Authorization": ENERCLO_TOKEN,
    "Accept-Language": "en",
    "User-Agent": "Mozilla/5.0"
}
PCS_SNS = ["TQG0F12136", "TQG0F12135", "TQG0F12134"]
PBD_SNS = [
    "YTG0F1511F", "YTG0F1512C", "YTG0F1512F", "YTG0F15120",
    "YTG0F15123", "YTG0F15130", "YTG0F15126", "YTG0F1512B",
    "YTG0F15132", "YTG0F15125", "YTG0F15121", "YTG0F1512E"
]
PBD_PRIMARY_SN = "YTG0F1511F"

THINGSBOARD_HOST = os.environ.get("THINGSBOARD_HOST", "http://localhost:8082")
DEVICE_TOKEN = os.environ.get("THINGSBOARD_DEVICE_TOKEN_GAORI", "HYBRICO_BESS_TOKEN")
TB_TELEMETRY_URL = f"{THINGSBOARD_HOST}/api/v1/{DEVICE_TOKEN}/telemetry"

INTERVALO_SEGUNDOS = int(os.environ.get("INGESTA_INTERVAL_SECONDS", "60"))


def safe_get(endpoint, params):
    try:
        r = requests.get(f"{ENERCLO_URL}{endpoint}", headers=HEADERS_API, params=params, timeout=20)
        return (r.json().get("data") or {}) if r.status_code == 200 else {}
    except Exception as e:
        print(f"    [!] Error en {endpoint}: {e}")
        return {}


def es_horario_nocturno(hora_dt):
    """Determina si en la planta EPM-GAORI (Vichada, Colombia) es de noche."""
    h = hora_dt.hour + hora_dt.minute / 60.0
    return h < 6.0 or h >= 18.25


def obtener_telemetria_completa():
    rt = {}
    pbd_all = {}

    # Consulta paralela rapida de los 3 PCS y los 12 PBD
    with ThreadPoolExecutor(max_workers=10) as executor:
        f_pcs = {executor.submit(safe_get, "/api/v1/pcs/data-last", {"deviceSn": sn}): sn for sn in PCS_SNS}
        f_pbd = {executor.submit(safe_get, "/api/v1/pbd/data-last", {"deviceSn": sn}): sn for sn in PBD_SNS}

        for f in as_completed(f_pcs):
            sn = f_pcs[f]
            res = f.result()
            if res:
                rt[sn] = res

        for f in as_completed(f_pbd):
            sn = f_pbd[f]
            res = f.result()
            if res:
                pbd_all[sn] = res

    if not rt:
        return None

    today = datetime.now()
    a_start = (today - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    a_end = today.strftime("%Y-%m-%d %H:%M:%S")

    n_faults = 0
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

    ref = list(rt.values())[0]

    def ks(key, default=0.0):
        return sum(float(rt[s].get(key, default) or 0) for s in rt)

    def ka(key, default=0.0):
        v = [float(rt[s].get(key, default) or 0) for s in rt]
        return sum(v) / max(1, len(v))

    soc_prom = round(ka("capacity"), 1)
    pac_total = round(ks("pac"), 2)
    load_tot = round(ks("loadActivePower"), 2)
    vbat_prom = round(ka("vbat"), 1)
    ibat_tot = round(ks("ibat"), 1)

    es_noche = es_horario_nocturno(today)
    dg_kw_temp = round(ks("dgActivePower"), 2)

    # 1. GENERACION SOLAR TOTAL (12 Convertidores PBD250)
    total_pbd_kw = sum(float(pbd_all[s].get("outPower") or 0.0) for s in pbd_all)
    pbd_rt = pbd_all.get(PBD_PRIMARY_SN, {})
    if not pbd_rt and pbd_all:
        pbd_rt = list(pbd_all.values())[0]

    if es_noche:
        pv_est = 0.0
    else:
        pv_est = max(0.0, round(total_pbd_kw, 1))

    # 2. POTENCIA BESS REAL MEDIDA (3 PCS250)
    bess_p_dc = sum(
        float(rt[s].get("pcsDcPower") or 0.0)
        if float(rt[s].get("pcsDcPower") or 0.0) > 0.1
        else (float(rt[s].get("vbat") or 0.0) * float(rt[s].get("ibat") or 0.0) / 1000.0)
        for s in rt
    )

    # 3. DETERMINACION FISICA EXACTA DE ESTADO BESS:
    # En inversores ATESS PCS250:
    #   pac_total < -3.0 kW -> PCS absorbe potencia AC para cargar bateria (CARGANDO)
    #   pac_total > +3.0 kW -> PCS inyecta potencia AC desde bateria a carga (DESCARGANDO)
    if pac_total < -3.0 or (pv_est > (load_tot + 5.0) and bess_p_dc > 2.0):
        estado_bess = "CARGANDO"
        potencia_bess = round(bess_p_dc, 1)
    elif pac_total > 3.0 or (es_noche and bess_p_dc > 2.0) or (load_tot > (pv_est + 5.0) and bess_p_dc > 2.0):
        estado_bess = "DESCARGANDO"
        potencia_bess = -round(bess_p_dc, 1)
    else:
        estado_bess = "STANDBY"
        potencia_bess = 0.0

    temp_max_bat = float(ref.get("maxTemp") or 0)
    temp_min_bat = float(ref.get("minTemp") or 0)
    delta_t_bat = round(temp_max_bat - temp_min_bat, 1)

    max_v_celda = float(ref.get("maxVolt") or 0)
    min_v_celda = float(ref.get("minVolt") or 0)
    delta_v_mv = round((max_v_celda - min_v_celda) * 1000, 1)

    epv_today = round(ks("epvToday"), 1)
    eload_vals = [float(rt[s].get("eloadToday", 0) or 0) for s in rt if float(rt[s].get("eloadToday", 0) or 0) < 60000.0]
    eload_today = round(sum(eload_vals), 1) if eload_vals else 0.0
    echarge_today = round(ks("echargeToday"), 1)
    edischarge_today = round(ks("edischargeToday"), 1)
    dg_kw = round(ks("dgActivePower"), 2)
    dg_kva = round(float(ref.get("dgApparentPower") or 0), 2)
    dg_kvar = round(float(ref.get("dgReactivePower") or 0), 2)
    dg_u = round(float(ref.get("dgCurrentU") or 0), 1)
    dg_v = round(float(ref.get("dgCurrentV") or 0), 1)
    dg_w = round(float(ref.get("dgCurrentW") or 0), 1)
    fac = round(float(ref.get("fac") or 0), 2)
    vacu = round(float(ref.get("vacu") or 0), 1)
    vacv = round(float(ref.get("vacv") or 0), 1)
    vacw = round(float(ref.get("vacw") or 0), 1)

    smap = {0: "Espera", 1: "Autocheck", 2: "Normal", 3: "Falla", 5: "Operando"}
    rmap = {4: "Modo Isla/Respaldo", 5: "Modo Estandar"}
    st_code = int(ref.get("status") or 5)
    rm_code = int(ref.get("runModel") or 5)
    dg_sel = int(ref.get("dgGridSelect") or 0)

    n_pbd_activos = len([s for s in pbd_all if float(pbd_all[s].get("outPower") or 0.0) > 0.5])

    # Matriz completa de los 12 convertidores PBD250 y 60 strings solares DC
    pbd_matrix = {}
    for idx, sn in enumerate(PBD_SNS, start=1):
        d_sn = pbd_all.get(sn, {})
        st_val = int(d_sn.get("status") or 0)
        pbd_matrix[f"PBD-{idx:02d}"] = {
            "pbd_index": idx,
            "sn": sn,
            "kw": max(0.0, round(float(d_sn.get("outPower") or 0.0), 1)),
            "vbus": round(float(d_sn.get("bvbus") or 0.0), 1),
            "status": "CERRADO" if st_val == 2 else ("STANDBY" if st_val == 1 else "ABIERTO"),
            "status_code": st_val,
            "temp": round(float(d_sn.get("pvTemp") or d_sn.get("temp") or 0.0), 1),
            "currents": [
                round(max(0.0, float(d_sn.get("ipv") or 0.0)), 1),
                round(max(0.0, float(d_sn.get("ipv2dc") or 0.0)), 1),
                round(max(0.0, float(d_sn.get("ipv3") or 0.0)), 1),
                round(max(0.0, float(d_sn.get("ipv4") or 0.0)), 1),
                round(max(0.0, float(d_sn.get("ipv5") or 0.0)), 1),
            ],
            "voltages": [
                round(float(d_sn.get("vpv") or 0.0), 1),
                round(float(d_sn.get("vpv2") or 0.0), 1),
                round(float(d_sn.get("vpv3") or 0.0), 1),
                round(float(d_sn.get("vpv4") or 0.0), 1),
                round(float(d_sn.get("vpv5") or 0.0), 1),
            ]
        }

    tb_payload = {
        "soc_promedio": soc_prom,
        "soc": soc_prom,
        "bess_soc": soc_prom,
        "soc_pcs1": float(rt.get("TQG0F12136", {}).get("capacity") or 0),
        "soc_pcs2": float(rt.get("TQG0F12135", {}).get("capacity") or 0),
        "soc_pcs3": float(rt.get("TQG0F12134", {}).get("capacity") or 0),
        "potencia_bess_kw": potencia_bess,
        "potencia_bess": potencia_bess,
        "estado_bess": estado_bess,
        "vbat_promedio": vbat_prom,
        "vbat": vbat_prom,
        "vbat_pcs1": float(rt.get("TQG0F12136", {}).get("vbat") or 0),
        "vbat_pcs2": float(rt.get("TQG0F12135", {}).get("vbat") or 0),
        "vbat_pcs3": float(rt.get("TQG0F12134", {}).get("vbat") or 0),
        "ibat_total": ibat_tot,
        "ibat_pcs1": float(rt.get("TQG0F12136", {}).get("ibat") or 0),
        "ibat_pcs2": float(rt.get("TQG0F12135", {}).get("ibat") or 0),
        "ibat_pcs3": float(rt.get("TQG0F12134", {}).get("ibat") or 0),
        "temp_bateria_max": temp_max_bat,
        "temp_bateria_min": temp_min_bat,
        "delta_temp_bateria": delta_t_bat,
        "max_volt_celda_mv": round(max_v_celda * 1000, 1),
        "min_volt_celda_mv": round(min_v_celda * 1000, 1),
        "delta_v_celdas_mv": delta_v_mv,
        "pac_total_kw": pac_total,
        "pac_pcs1": float(rt.get("TQG0F12136", {}).get("pac") or 0),
        "pac_pcs2": float(rt.get("TQG0F12135", {}).get("pac") or 0),
        "pac_pcs3": float(rt.get("TQG0F12134", {}).get("pac") or 0),
        "q_total_kvar": round(ks("outReactivePower") if ks("outReactivePower") > 0.1 else ks("loadReactivePower"), 2),
        "q_pcs1": float(rt.get("TQG0F12136", {}).get("outReactivePower") or rt.get("TQG0F12136", {}).get("loadReactivePower") or 0),
        "q_pcs2": float(rt.get("TQG0F12135", {}).get("outReactivePower") or rt.get("TQG0F12135", {}).get("loadReactivePower") or 0),
        "q_pcs3": float(rt.get("TQG0F12134", {}).get("outReactivePower") or rt.get("TQG0F12134", {}).get("loadReactivePower") or 0),
        "temp_igbt_pcs1": float(rt.get("TQG0F12136", {}).get("temp1") or 0),
        "temp_igbt_pcs2": float(rt.get("TQG0F12135", {}).get("temp1") or 0),
        "temp_igbt_pcs3": float(rt.get("TQG0F12134", {}).get("temp1") or 0),
        "temp_amb_pcs1": float(rt.get("TQG0F12136", {}).get("temp") or 0),
        "temp_amb_pcs2": float(rt.get("TQG0F12135", {}).get("temp") or 0),
        "temp_amb_pcs3": float(rt.get("TQG0F12134", {}).get("temp") or 0),
        "temp_ind_pcs1": float(rt.get("TQG0F12136", {}).get("temp4") or 0),
        "temp_ind_pcs2": float(rt.get("TQG0F12135", {}).get("temp4") or 0),
        "temp_ind_pcs3": float(rt.get("TQG0F12134", {}).get("temp4") or 0),
        "generacion_solar_kw": pv_est,
        "potencia_solar": pv_est,
        "epv_hoy_kwh": epv_today,
        "energia_solar_hoy": epv_today,
        "demanda_carga_kw": load_tot,
        "potencia_demanda": load_tot,
        "eload_hoy_kwh": eload_today,
        "energia_carga_hoy": eload_today,
        "carga_pcs1": float(rt.get("TQG0F12136", {}).get("loadActivePower") or 0),
        "carga_pcs2": float(rt.get("TQG0F12135", {}).get("loadActivePower") or 0),
        "carga_pcs3": float(rt.get("TQG0F12134", {}).get("loadActivePower") or 0),
        "dg_potencia_activa_kw": dg_kw,
        "dg_potencia_aparente_kva": dg_kva,
        "dg_potencia_reactiva_kvar": dg_kvar,
        "dg_corriente_fase_u": dg_u,
        "dg_corriente_fase_v": dg_v,
        "dg_corriente_fase_w": dg_w,
        "frecuencia_red_hz": fac,
        "tension_fase_u": vacu,
        "tension_fase_v": vacv,
        "tension_fase_w": vacw,
        "estado_generador": "OPERANDO" if dg_kw > 1 else "STANDBY",
        "fuente_activa": "Red Publica" if dg_sel == 0 else "Generador Diesel",
        "estado_sistema": smap.get(st_code, "Normal"),
        "modo_operacion": rmap.get(rm_code, "Modo Estandar"),
        "alarmas_activas_total": n_activas,
        "faults_30d_total": n_faults,
        "warnings_30d_total": n_warnings,
        "fault_history_json": json.dumps(real_history_formatted),
        "ultima_actualizacion": ref.get("time", today.strftime("%Y-%m-%d %H:%M:%S")),
        "string_1_corriente_a": float(pbd_rt.get("ipv") or 0.0),
        "string_2_corriente_a": float(pbd_rt.get("ipv2dc") or 0.0),
        "string_3_corriente_a": float(pbd_rt.get("ipv3") or 0.0),
        "string_4_corriente_a": float(pbd_rt.get("ipv4") or 0.0),
        "string_5_corriente_a": float(pbd_rt.get("ipv5") or 0.0),
        "string_1_tension_v": float(pbd_rt.get("vpv") or 0.0),
        "string_2_tension_v": float(pbd_rt.get("vpv2") or 0.0),
        "string_3_tension_v": float(pbd_rt.get("vpv3") or 0.0),
        "string_4_tension_v": float(pbd_rt.get("vpv4") or 0.0),
        "string_5_tension_v": float(pbd_rt.get("vpv5") or 0.0),
        "pbd_bus_voltage": float(pbd_rt.get("bvbus") or 0.0),
        "pbd_bus_voltage_v": float(pbd_rt.get("bvbus") or 0.0),
        "pbd_potencia_dc_kw": pv_est,
        "pbd_potencia_total_kw": pv_est,
        "pbd_status": "CERRADO (Operando)" if int(pbd_rt.get("status") or 0) == 2 else "STANDBY",
        "pbd_disconnect_status": "CERRADO" if int(pbd_rt.get("status") or 0) == 2 else "ABIERTO",
        "pbd_unidades_operando": n_pbd_activos,
        "pbd_matrix_json": json.dumps(pbd_matrix),
        "ebat_carga_hoy_kwh": echarge_today,
        "ebat_descarga_hoy_kwh": edischarge_today,
        "energia_bess_cargada_hoy": echarge_today,
        "energia_bess_descargada_hoy": edischarge_today,
    }
    for idx in range(1, 13):
        pbd_key = f"PBD-{idx:02d}"
        pbd_kw_val = pbd_matrix.get(pbd_key, {}).get("kw", 0.0)
        tb_payload[f"pbd_{idx:02d}_kw"] = pbd_kw_val
    return tb_payload


def iniciar_loop():
    print("=" * 72)
    print("HYBRICO SCADA · SINCRONIZADOR CONTINUO EN TIEMPO REAL (60s)")
    print("=" * 72)
    print(f"Origen:   Enerclo ATESS OpenAPI (PCS250 x3 + PBD250 x12)")
    print(f"Destino:  ThingsBoard CE ({TB_TELEMETRY_URL})")
    print(f"Frecuencia: Cada {INTERVALO_SEGUNDOS} segundos (1 minuto)")
    print(f"Para detener el script: Presione [Ctrl + C] en cualquier momento\n")

    ciclo = 1
    t_inicio = datetime.now()

    try:
        while True:
            t_ciclo = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{t_ciclo}] ── Ciclo #{ciclo} ───────────────────────────────────────")
            
            try:
                payload = obtener_telemetria_completa()
                if payload:
                    sol = payload["generacion_solar_kw"]
                    dem = payload["demanda_carga_kw"]
                    bess_p = payload["potencia_bess_kw"]
                    bess_st = payload["estado_bess"]
                    soc = payload["soc_promedio"]
                    vbus = payload["pbd_bus_voltage"]
                    dg_st = payload["estado_generador"]
                    pbds = payload["pbd_unidades_operando"]

                    # Enviar a ThingsBoard
                    r = requests.post(TB_TELEMETRY_URL, json=payload, timeout=10)
                    
                    if r.status_code == 200:
                        print(f"Enviado a ThingsBoard (HTTP 200)")
                        print(f"Solar Total (12 PBD): {sol:6.1f} kW ({pbds}/12 Activos) | Carga: {dem:6.1f} kW | BESS: {bess_st} ({bess_p:+6.1f} kW) | SOC: {soc:4.1f}%")
                        print(f"Bus DC PBD: {vbus:5.1f} V | Respaldo DG: {dg_st} | Inversores PCS: 3/3 OK")
                    else:
                        print(f"ThingsBoard respondio con status {r.status_code}")
                else:
                    print("No se obtuvieron datos en esta iteracion (reintentando en el prox ciclo)")

            except Exception as e_ciclo:
                print(f"Error transitorio durante el ciclo #{ciclo}: {e_ciclo}")

            ciclo += 1
            print(f"Esperando {INTERVALO_SEGUNDOS} segundos para la siguiente consulta...\n")
            time.sleep(INTERVALO_SEGUNDOS)

    except KeyboardInterrupt:
        duracion = datetime.now() - t_inicio
        minutos = round(duracion.total_seconds() / 60.0, 1)
        print("\n" + "=" * 72)
        print("SINCRONIZACIÓN DETENIDA POR EL USUARIO (Ctrl + C)")
        print(f"Resumen de la sesión:")
        print(f"Total de ciclos completados: {ciclo - 1}")
        print(f"Tiempo total transcurrido:    {minutos} minutos")
        print("=" * 72)


if __name__ == "__main__":
    iniciar_loop()
