import os

def update_file(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
        
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    old_block_part = '''    desc_trans_map = {
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
        code = item.get("eventSn") or f"FLT-{idx+1:02d}"'''

    new_block_part = '''    desc_trans_map = {
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
        friendly_desc = desc_trans_map.get(raw_desc, code_trans_map.get(code, raw_desc))'''

    if old_block_part in content:
        content = content.replace(old_block_part, new_block_part)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated translation map in: {file_path}")
        return True
    elif "code_trans_map" in content:
        print(f"File already contains code_trans_map: {file_path}")
        return True
    else:
        print(f"Old translation block not found in: {file_path}")
        return False

# Actualizar ambos archivos
f1 = r"c:\Users\PC\Documents\AI_Engineer\20.LEER_DATA_API_ENERCLO\sync_enerclo_thingsboard_produc.py"
f2 = r"Z:\Documents\ricardo_burgos\ingesta_datos_thingsboard\sync_enerclo_thingsboard_produc.py"
update_file(f1)
update_file(f2)
