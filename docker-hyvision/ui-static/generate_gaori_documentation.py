# -*- coding: utf-8 -*-
r"""
Generador Maestro de Documentacion Tecnica: Mapeo de Variables, Formulas y Telemetria GAORI
Genera:
1. Archivo Excel (.xlsx) con tablas estructuradas, hojas por subsistema, filtros y formulas.
2. Archivo Word (.docx) con informe tecnico ejecutivo.
Ubicacion: C:\Users\PC\Documents\AI_Engineer\20.LEER_DATA_API_ENERCLO\
"""

import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUTPUT_DIR = r"C:\Users\PC\Documents\AI_Engineer\20.LEER_DATA_API_ENERCLO"
EXCEL_PATH = os.path.join(OUTPUT_DIR, "Mapeo_Telemetria_Variables_y_Formulas_GAORI.xlsx")
WORD_PATH  = os.path.join(OUTPUT_DIR, "Mapeo_Telemetria_Variables_y_Formulas_GAORI.docx")

# ==============================================================================
# 1. DATOS COMPLETOS DE MAPEO: EPM_GAORI
# ==============================================================================

WIDGETS_DATA = [
    # 1. TABLERO SOLAR PBD
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Selector Desplegable PBD",
        "unidad": "PBD-01 a PBD-12",
        "key_thingsboard": "pbd_matrix_json",
        "origen_api": "PBD_SNS (12 equipos)",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Empaquetado JSON dinámico con outPower, bvbus, status, pvTemp, 5 corrientes (ipv..ipv5) y 5 tensiones (vpv..vpv5) de los 12 convertidores.",
        "ejemplo_valor": "PBD-01 a PBD-12 (YTG0F1511F a YTG0F1512E)"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Tensión Bus DC",
        "unidad": "V",
        "key_thingsboard": "pbd_bus_voltage / pbd_matrix_json[sel].vbus",
        "origen_api": "bvbus",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Tensión medida en el bus colector DC del convertidor PBD250 seleccionado: round(float(bvbus), 1)",
        "ejemplo_valor": "760.0 V"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Corriente Solar PBD",
        "unidad": "A",
        "key_thingsboard": "Calculado en UI desde pbd_matrix_json[sel].currents",
        "origen_api": "ipv, ipv2dc, ipv3, ipv4, ipv5",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Suma de las 5 corrientes de entrada del convertidor: Sum(max(0.0, round(ipv_i, 1)))",
        "ejemplo_valor": "0.0 A (Noche) / 45.2 A (Día)"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Potencia Activa PBD",
        "unidad": "kW",
        "key_thingsboard": "pbd_potencia_dc_kw / pbd_matrix_json[sel].kw",
        "origen_api": "outPower",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Potencia DC entregada al bus: max(0.0, round(float(outPower), 1))",
        "ejemplo_valor": "0.0 kW (Noche) / 42.5 kW (Día)"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Temperatura Interna PBD",
        "unidad": "°C",
        "key_thingsboard": "pbd_matrix_json[sel].temp",
        "origen_api": "pvTemp (o temp)",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Temperatura interna del disipador/gabinete PBD250: round(float(pvTemp), 1)",
        "ejemplo_valor": "34.0 °C a 45.0 °C"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Strings 1 a 5 (Corrientes)",
        "unidad": "A",
        "key_thingsboard": "string_1..5_corriente_a / pbd_matrix_json[sel].currents",
        "origen_api": "ipv, ipv2dc, ipv3, ipv4, ipv5",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Corriente por string individual con filtro de ruido en vacío: max(0.0, round(float(ipv_i), 1)). Barra dinámica: min(100%, (I / 25A) * 100)",
        "ejemplo_valor": "Str 1: 11.5 A | Str 2: 12.0 A"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Strings 1 a 5 (Tensiones)",
        "unidad": "V",
        "key_thingsboard": "string_1..5_tension_v / pbd_matrix_json[sel].voltages",
        "origen_api": "vpv, vpv2, vpv3, vpv4, vpv5",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Tensión de circuito abierto o MPPT por canal individual: round(float(vpv_i), 1)",
        "ejemplo_valor": "Str 1: 552 V | Str 2: 530 V"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Estado Seccionador DC",
        "unidad": "Estado Texto",
        "key_thingsboard": "pbd_disconnect_status / pbd_status",
        "origen_api": "status",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "status == 2 ? 'CERRADO (Normal)' : (status == 1 ? 'STANDBY' : 'ABIERTO')",
        "ejemplo_valor": "SECCIONADOR CERRADO"
    },

    # 2. BALANCE DE PLANTA
    {
        "subsistema": "Gestión Energética Microrred",
        "widget_nombre": "BALANCE DE PLANTA",
        "parametro_ui": "Balance Neto Instantáneo",
        "unidad": "kW NETO",
        "key_thingsboard": "Calculado en UI desde: generacion_solar_kw, demanda_carga_kw, potencia_bess, generador_kw",
        "origen_api": "API OpenAPI Enerclo (PBDs + PCSs + PlantInfo)",
        "endpoint_api": "/api/v1/pbd/data-last & /api/v1/pcs/data-last",
        "formula_logica": "GenPrimaria = Solar + Red + DG. Si GenPrimaria >= Carga: Net = GenPrimaria - Carga (SUPERÁVIT). Si GenPrimaria < Carga y BESS_Descarga >= Déficit: Net = (GenPrimaria + BESS_Descarga) - Carga -> ±0.0 kW (EQUILIBRIO). Si BESS no alcanza: DÉFICIT.",
        "ejemplo_valor": "±0.0 kW NETO (Equilibrio BESS)"
    },
    {
        "subsistema": "Gestión Energética Microrred",
        "widget_nombre": "BALANCE DE PLANTA",
        "parametro_ui": "Badge de Estado de Balance",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "Calculado en UI",
        "origen_api": "Variables de potencia combinadas",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "EQUILIBRIO (si Net == 0 o BESS cubre carga), SUPERÁVIT (si Solar/Primaria excede carga), DÉFICIT (si falta potencia en la microrred)",
        "ejemplo_valor": "EQUILIBRIO (verde)"
    },

    # 3. GENERACIÓN SOLAR TOTAL
    {
        "subsistema": "Generación Solar Global",
        "widget_nombre": "GENERACIÓN SOLAR",
        "parametro_ui": "Potencia Solar Total",
        "unidad": "kW",
        "key_thingsboard": "generacion_solar_kw / potencia_solar",
        "origen_api": "outPower de los 12 PBD250",
        "endpoint_api": "/api/v1/pbd/data-last (x12)",
        "formula_logica": "Si hora >= 18.25 o <= 5.75: pv_est = 0.0 (evita ruido crepuscular). Si día: pv_est = max(0.0, round(Sum(PBD_i.outPower), 1))",
        "ejemplo_valor": "0.0 kW (Noche) / 850.5 kW (Pico día)"
    },
    {
        "subsistema": "Generación Solar Global",
        "widget_nombre": "GENERACIÓN SOLAR",
        "parametro_ui": "Energía Solar Acumulada Hoy",
        "unidad": "kWh",
        "key_thingsboard": "epv_hoy_kwh / energia_solar_hoy",
        "origen_api": "epvToday",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Integración de energía solar diaria medida directamente por el controlador de planta: round(float(epvToday), 1)",
        "ejemplo_valor": "3612.0 kWh"
    },

    # 4. DEMANDA DE CARGA
    {
        "subsistema": "Demanda Eléctrica Microrred",
        "widget_nombre": "DEMANDA DE CARGA",
        "parametro_ui": "Demanda Activa de la Microrred",
        "unidad": "kW",
        "key_thingsboard": "demanda_carga_kw / demanda_carga",
        "origen_api": "dgActivePower, pac (PCS 1..3), pv_est",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last & /api/v1/pcs/data-last",
        "formula_logica": "Si DG > 1kW: Carga = DG + pac_total. Si BESS cargando (pac_total < -2kW): Carga = max(0, pv_est - |pac_total|). Si BESS descargando (pac_total > 2kW): Carga = pv_est + pac_total. En flotación: Carga = pv_est.",
        "ejemplo_valor": "282.9 kW"
    },
    {
        "subsistema": "Demanda Eléctrica Microrred",
        "widget_nombre": "DEMANDA DE CARGA",
        "parametro_ui": "Energía Consumida Hoy",
        "unidad": "kWh",
        "key_thingsboard": "eload_hoy_kwh",
        "origen_api": "eloadToday",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Consumo de energía acumulado diario del pueblo/sitio: round(float(eloadToday), 1)",
        "ejemplo_valor": "2970.0 kWh"
    },

    # 5. ALMACENAMIENTO BESS
    {
        "subsistema": "Sistema BESS (Almacenamiento)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Estado Operativo BESS",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "estado_bess",
        "origen_api": "pac (PCS 1..3), pcsDcPower, pv_est, load_tot",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Si pac_total < -3.0 kW o (pv_est > load + 5 y bess_p_dc > 2): 'CARGANDO'. Si pac_total > 3.0 kW o (es_noche y bess_p_dc > 2) o (load > pv_est + 5): 'DESCARGANDO'. Si no: 'FLOTACION'",
        "ejemplo_valor": "DESCARGANDO"
    },
    {
        "subsistema": "Sistema BESS (Almacenamiento)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Potencia Activa BESS",
        "unidad": "kW",
        "key_thingsboard": "potencia_bess_kw / potencia_bess",
        "origen_api": "pcsDcPower (o vbat * ibat / 1000) de los 3 PCS",
        "endpoint_api": "/api/v1/pcs/data-last (x3)",
        "formula_logica": "bess_p_dc = Sum(PCS_i.pcsDcPower). Si DESCARGANDO: potencia = -|bess_p_dc|; Si CARGANDO: potencia = +|bess_p_dc|; Si FLOTACION: 0.0",
        "ejemplo_valor": "-295.3 kW"
    },
    {
        "subsistema": "Sistema BESS (Almacenamiento)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "SOC Promedio del Banco",
        "unidad": "%",
        "key_thingsboard": "soc_promedio / soc / bess_soc",
        "origen_api": "capacity de los 3 PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Promedio ponderado de los 3 bancos de baterías: round((PCS1.capacity + PCS2.capacity + PCS3.capacity) / 3, 1)",
        "ejemplo_valor": "59.3 %"
    },
    {
        "subsistema": "Sistema BESS (Almacenamiento)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Tensión Bus Batería Promedio",
        "unidad": "V",
        "key_thingsboard": "vbat_promedio / vbat",
        "origen_api": "vbat de los 3 PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Tensión DC media en los terminales de batería: round((PCS1.vbat + PCS2.vbat + PCS3.vbat) / 3, 1)",
        "ejemplo_valor": "758.5 V"
    },
    {
        "subsistema": "Sistema BESS (Almacenamiento)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Corriente Total Banco Batería",
        "unidad": "A",
        "key_thingsboard": "ibat_total",
        "origen_api": "ibat de los 3 PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Corriente DC consolidada de los 3 racks: round(PCS1.ibat + PCS2.ibat + PCS3.ibat, 1)",
        "ejemplo_valor": "389.2 A"
    },

    # 6. POTENCIA ACTIVA INVERSORES
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA INVERSORES",
        "parametro_ui": "Potencia Activa Total Inversores",
        "unidad": "kW",
        "key_thingsboard": "pac_total_kw",
        "origen_api": "pac de los 3 PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Suma de potencia AC de los 3 inversores: round(PCS1.pac + PCS2.pac + PCS3.pac, 1)",
        "ejemplo_valor": "282.9 kW"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA INVERSORES",
        "parametro_ui": "Potencia PCS-1 (SN: TQG0F12136)",
        "unidad": "kW",
        "key_thingsboard": "pac_pcs1",
        "origen_api": "pac (PCS 1)",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Potencia AC del inversor PCS 1: float(pac)",
        "ejemplo_valor": "94.3 kW"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA INVERSORES",
        "parametro_ui": "Potencia PCS-2 (SN: TQG0F12135)",
        "unidad": "kW",
        "key_thingsboard": "pac_pcs2",
        "origen_api": "pac (PCS 2)",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Potencia AC del inversor PCS 2: float(pac)",
        "ejemplo_valor": "94.1 kW"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA INVERSORES",
        "parametro_ui": "Potencia PCS-3 (SN: TQG0F12134)",
        "unidad": "kW",
        "key_thingsboard": "pac_pcs3",
        "origen_api": "pac (PCS 3)",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Potencia AC del inversor PCS 3: float(pac)",
        "ejemplo_valor": "94.5 kW"
    },

    # 7. POTENCIA REACTIVA
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA REACTIVA (VAR)",
        "parametro_ui": "Potencia Reactiva Total (Q)",
        "unidad": "kVAR",
        "key_thingsboard": "q_total_kvar",
        "origen_api": "outReactivePower / loadReactivePower",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Compensación reactiva de la microrred: round(outReactivePower if > 0.1 else loadReactivePower, 2)",
        "ejemplo_valor": "18.7 kVAR"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA REACTIVA (VAR)",
        "parametro_ui": "Reactiva por Inversor (PCS 1, 2, 3)",
        "unidad": "kVAR",
        "key_thingsboard": "q_pcs1, q_pcs2, q_pcs3",
        "origen_api": "outReactivePower de cada PCS",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Potencia reactiva individual generada por cada inversor PCS250",
        "ejemplo_valor": "PCS1: 5.8 | PCS2: 5.9 | PCS3: 7.0 kVAR"
    },

    # 8. PERFIL TÉRMICO INVERSORES
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "PERFIL TÉRMICO INVERSORES",
        "parametro_ui": "Temperatura Módulos IGBT",
        "unidad": "°C",
        "key_thingsboard": "temp_igbt_pcs1, temp_igbt_pcs2, temp_igbt_pcs3",
        "origen_api": "temp1 de cada PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Temperatura en los semiconductores de potencia IGBT del inversor: float(temp1)",
        "ejemplo_valor": "42.0 °C, 43.5 °C, 41.8 °C"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "PERFIL TÉRMICO INVERSORES",
        "parametro_ui": "Temperatura Ambiente / Gabinete",
        "unidad": "°C",
        "key_thingsboard": "temp_amb_pcs1, temp_amb_pcs2, temp_amb_pcs3",
        "origen_api": "temp de cada PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Sensor de temperatura interna de la caseta/gabinete PCS: float(temp)",
        "ejemplo_valor": "31.0 °C, 32.0 °C, 30.5 °C"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "PERFIL TÉRMICO INVERSORES",
        "parametro_ui": "Temperatura Inductancias (Choke)",
        "unidad": "°C",
        "key_thingsboard": "temp_ind_pcs1, temp_ind_pcs2, temp_ind_pcs3",
        "origen_api": "temp4 de cada PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Temperatura en los transformadores/reactancias de filtrado AC: float(temp4)",
        "ejemplo_valor": "48.0 °C, 49.2 °C, 47.5 °C"
    },

    # 9. TENDENCIA DISPERSIÓN TÉRMICA BESS
    {
        "subsistema": "Baterías (Monitoreo BMS)",
        "widget_nombre": "TENDENCIA DISPERSIÓN TÉRMICA BESS",
        "parametro_ui": "Temperatura Máx / Mín Batería",
        "unidad": "°C",
        "key_thingsboard": "temp_bateria_max, temp_bateria_min",
        "origen_api": "maxBatTemp, minBatTemp",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "T_max = max(PCS_i.maxBatTemp), T_min = min(PCS_i.minBatTemp) reportadas por BMS",
        "ejemplo_valor": "Máx: 29.0 °C | Mín: 26.5 °C"
    },
    {
        "subsistema": "Baterías (Monitoreo BMS)",
        "widget_nombre": "TENDENCIA DISPERSIÓN TÉRMICA BESS",
        "parametro_ui": "Dispersión Térmica (Delta T)",
        "unidad": "°C",
        "key_thingsboard": "delta_temp_bateria",
        "origen_api": "maxBatTemp - minBatTemp",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Delta T = temp_max_bat - temp_min_bat. Criterio BMS: Seguro si <= 5°C",
        "ejemplo_valor": "2.5 °C (Seguro)"
    },

    # 10. DESBALANCE DE CELDAS BESS
    {
        "subsistema": "Baterías (Monitoreo BMS)",
        "widget_nombre": "DESBALANCE VOLTAJE CELDAS",
        "parametro_ui": "Tensión Celda Máxima y Mínima",
        "unidad": "mV",
        "key_thingsboard": "max_volt_celda_mv, min_volt_celda_mv",
        "origen_api": "maxCellVol, minCellVol (en Volts)",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Conversión de V a mV: round(maxCellVol * 1000, 1) y round(minCellVol * 1000, 1)",
        "ejemplo_valor": "Máx: 3293 mV | Mín: 3272 mV"
    },
    {
        "subsistema": "Baterías (Monitoreo BMS)",
        "widget_nombre": "DESBALANCE VOLTAJE CELDAS",
        "parametro_ui": "Desbalance de Celdas (Delta V)",
        "unidad": "mV",
        "key_thingsboard": "delta_v_celdas_mv",
        "origen_api": "maxCellVol - minCellVol",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Delta V = round((maxCellVol - minCellVol) * 1000, 1). Estado: 'Celdas Ecualizadas' si <= 30mV",
        "ejemplo_valor": "21.0 mV ΔV (Ecualizadas)"
    },

    # 11. SOC POR RACK DE BATERÍAS
    {
        "subsistema": "Baterías (Monitoreo BMS)",
        "widget_nombre": "SOC POR RACK DE BATERÍAS",
        "parametro_ui": "SOC por Rack 1, 2 y 3",
        "unidad": "%",
        "key_thingsboard": "soc_pcs1, soc_pcs2, soc_pcs3",
        "origen_api": "capacity de cada PCS250",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Estado de carga independiente de cada uno de los 3 racks de almacenamiento: float(capacity)",
        "ejemplo_valor": "Rack 1: 52% | Rack 2: 52% | Rack 3: 53%"
    },

    # 12. RESPALDO GENERADOR DIÉSEL
    {
        "subsistema": "Generación Térmica de Respaldo",
        "widget_nombre": "RESPALDO DG",
        "parametro_ui": "Potencia Activa Generador Diésel",
        "unidad": "kW",
        "key_thingsboard": "generador_kw / dg_kw",
        "origen_api": "dgActivePower",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Potencia suministrada por el motogenerador: round(float(dgActivePower), 2)",
        "ejemplo_valor": "0.0 kW (Standby)"
    },
    {
        "subsistema": "Generación Térmica de Respaldo",
        "widget_nombre": "RESPALDO DG",
        "parametro_ui": "Estado del Generador",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "estado_generador",
        "origen_api": "dgActivePower",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "dgActivePower > 1.0 kW ? 'OPERANDO' : 'STANDBY'",
        "ejemplo_valor": "STANDBY"
    },

    # 13. ESTABILIDAD SINCRONISMO Y RED AC
    {
        "subsistema": "Parámetros Eléctricos Red AC",
        "widget_nombre": "ESTABILIDAD SINCRONISMO DG",
        "parametro_ui": "Frecuencia de Microrred",
        "unidad": "Hz",
        "key_thingsboard": "frecuencia_red_hz",
        "origen_api": "fac",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Frecuencia eléctrica en barra AC: round(float(fac), 2). Nominal: 60.00 Hz",
        "ejemplo_valor": "60.00 Hz"
    },
    {
        "subsistema": "Parámetros Eléctricos Red AC",
        "widget_nombre": "ESTABILIDAD SINCRONISMO DG",
        "parametro_ui": "Tensiones de Fase (U, V, W)",
        "unidad": "V",
        "key_thingsboard": "tension_fase_u, tension_fase_v, tension_fase_w",
        "origen_api": "vacu, vacv, vacw",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Tensiones fase-neutro en barra colectora AC: round(float(vac_i), 1)",
        "ejemplo_valor": "U: 144.6 V | V: 153.3 V | W: 145.0 V"
    },

    # 14. REGISTRO DE EVENTOS Y FALLAS
    {
        "subsistema": "Supervisión y Alarmas",
        "widget_nombre": "REGISTRO DE EVENTOS Y FALLAS",
        "parametro_ui": "Alarmas Activas y Fallas 30d",
        "unidad": "Cantidad (Num)",
        "key_thingsboard": "alarmas_activas_total, warnings_30d_total, faults_30d_total",
        "origen_api": "warn/last-list y fault/last-list",
        "endpoint_api": "/api/v1/warn/last-list & /api/v1/fault/last-list",
        "formula_logica": "Conteo total de listas de eventos activos y acumulados en últimos 30 días",
        "ejemplo_valor": "0 Activas | 0 Fallas (Sistema Saludable)"
    }
]

PBD_LIST_DATA = [
    ("PBD-01", "YTG0F1511F", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-02", "YTG0F1512C", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-03", "YTG0F1512F", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-04", "YTG0F15120", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-05", "YTG0F15123", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-06", "YTG0F15130", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-07", "YTG0F15126", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-08", "YTG0F1512B", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-09", "YTG0F15132", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-10", "YTG0F15125", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-11", "YTG0F15121", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status"),
    ("PBD-12", "YTG0F1512E", 250, 5, "bvbus", "ipv..ipv5", "vpv..vpv5", "outPower", "pvTemp", "status")
]

# ==============================================================================
# 2. GENERACIÓN DEL LIBRO EXCEL (.XLSX)
# ==============================================================================

def generar_excel():
    wb = openpyxl.Workbook()
    # Eliminar hoja default
    default_sheet = wb.active

    # Estilos Corporativos HyVision
    header_fill = PatternFill(start_color="1B4D2E", end_color="1B4D2E", fill_type="solid") # Verde HyVision
    zebra_fill  = PatternFill(start_color="F4F8F5", end_color="F4F8F5", fill_type="solid") # Gris/verde muy suave
    white_fill  = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    accent_fill = PatternFill(start_color="E2EFE7", end_color="E2EFE7", fill_type="solid")

    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_bold   = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    font_body   = Font(name="Segoe UI", size=10, color="1E293B")
    font_code   = Font(name="Consolas", size=9.5, color="0369A1")
    font_form   = Font(name="Segoe UI", size=9.5, italic=True, color="1E3A8A")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # --------------------------------------------------------------------------
    # HOJA 1: Mapeo_Widgets_y_Formulas
    # --------------------------------------------------------------------------
    ws1 = wb.create_sheet(title="Mapeo_Widgets_y_Formulas")
    
    headers1 = [
        "Subsistema",
        "Widget Dashboard (ThingsBoard)",
        "Parámetro Visualizado en Pantalla",
        "Unidad",
        "Clave Telemetría ThingsBoard",
        "Variable(s) Origen API Enerclo",
        "Endpoint OpenAPI Enerclo",
        "Fórmula Matemática / Lógica de Cálculo Aplicada",
        "Ejemplo / Valor Típico en Vivo"
    ]
    ws1.append(headers1)
    
    for col_idx in range(1, len(headers1) + 1):
        cell = ws1.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws1.row_dimensions[1].height = 32

    for r_idx, item in enumerate(WIDGETS_DATA, start=2):
        row_vals = [
            item["subsistema"],
            item["widget_nombre"],
            item["parametro_ui"],
            item["unidad"],
            item["key_thingsboard"],
            item["origen_api"],
            item["endpoint_api"],
            item["formula_logica"],
            item["ejemplo_valor"]
        ]
        ws1.append(row_vals)
        current_fill = zebra_fill if (r_idx % 2 == 0) else white_fill
        
        for c_idx in range(1, len(row_vals) + 1):
            c = ws1.cell(row=r_idx, column=c_idx)
            c.fill = current_fill
            c.border = thin_border
            if c_idx in [5, 6]:
                c.font = font_code
                c.alignment = Alignment(vertical="center", wrap_text=True)
            elif c_idx == 8:
                c.font = font_form
                c.alignment = Alignment(vertical="center", wrap_text=True)
            elif c_idx == 4:
                c.font = font_bold
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.font = font_body
                c.alignment = Alignment(vertical="center", wrap_text=True)
        ws1.row_dimensions[r_idx].height = 42

    # Auto-ancho de columnas Hoja 1
    col_widths1 = [24, 34, 30, 14, 32, 28, 30, 55, 30]
    for i, w in enumerate(col_widths1, start=1):
        ws1.column_dimensions[get_column_letter(i)].width = w

    ws1.freeze_panes = "A2"
    ws1.auto_filter.ref = f"A1:{get_column_letter(len(headers1))}{len(WIDGETS_DATA) + 1}"

    # --------------------------------------------------------------------------
    # HOJA 2: Matriz_12_PBD_60_Strings
    # --------------------------------------------------------------------------
    ws2 = wb.create_sheet(title="Matriz_12_PBD_60_Strings")
    headers2 = [
        "Identificador PBD",
        "Número de Serie Físico (SN)",
        "Capacidad (kW)",
        "Nº Canales MPPT",
        "Variable Bus DC",
        "Variables Corrientes Strings (5)",
        "Variables Tensiones Strings (5)",
        "Variable Potencia DC",
        "Variable Temperatura",
        "Variable Estado",
        "Fórmula Corriente Total",
        "Fórmula Potencia PBD"
    ]
    ws2.append(headers2)
    for col_idx in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws2.row_dimensions[1].height = 30

    for r_idx, pbd in enumerate(PBD_LIST_DATA, start=2):
        row_vals = [
            pbd[0], pbd[1], pbd[2], pbd[3], pbd[4], pbd[5], pbd[6], pbd[7], pbd[8], pbd[9],
            "Sum(max(0.0, round(ipv_i, 1))) para i=1..5",
            "max(0.0, round(outPower, 1))"
        ]
        ws2.append(row_vals)
        c_fill = zebra_fill if (r_idx % 2 == 0) else white_fill
        for c_idx in range(1, len(row_vals) + 1):
            c = ws2.cell(row=r_idx, column=c_idx)
            c.fill = c_fill
            c.border = thin_border
            if c_idx == 2:
                c.font = font_code
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx in [11, 12]:
                c.font = font_form
                c.alignment = Alignment(vertical="center", wrap_text=True)
            else:
                c.font = font_body
                c.alignment = Alignment(horizontal="center", vertical="center")
        ws2.row_dimensions[r_idx].height = 24

    col_widths2 = [18, 28, 16, 18, 18, 28, 28, 20, 22, 16, 36, 30]
    for i, w in enumerate(col_widths2, start=1):
        ws2.column_dimensions[get_column_letter(i)].width = w
    ws2.freeze_panes = "A2"

    # --------------------------------------------------------------------------
    # HOJA 3: Inversores_PCS_y_BESS
    # --------------------------------------------------------------------------
    ws3 = wb.create_sheet(title="Inversores_PCS_y_BESS")
    headers3 = [
        "Inversor / Rack",
        "Número de Serie (SN)",
        "Potencia Nominal",
        "Variables AC Principales",
        "Variables DC / Batería",
        "Variables Térmicas IGBT",
        "Variables BMS (Celdas)",
        "Fórmulas Consolidadas"
    ]
    ws3.append(headers3)
    for col_idx in range(1, len(headers3) + 1):
        cell = ws3.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws3.row_dimensions[1].height = 30

    pcs_data = [
        ("PCS-01 (Inversor 1 / Rack 1)", "TQG0F12136", "250 kVA / 250 kW", "pac, outReactivePower, fac, vacu, vacv, vacw", "vbat, ibat, pcsDcPower, capacity (SOC)", "temp1 (IGBT), temp (Ambiente), temp4 (Choke)", "maxBatTemp, minBatTemp, maxCellVol, minCellVol", "pac_total = Sum(pac); soc_prom = Avg(capacity)"),
        ("PCS-02 (Inversor 2 / Rack 2)", "TQG0F12135", "250 kVA / 250 kW", "pac, outReactivePower, fac, vacu, vacv, vacw", "vbat, ibat, pcsDcPower, capacity (SOC)", "temp1 (IGBT), temp (Ambiente), temp4 (Choke)", "maxBatTemp, minBatTemp, maxCellVol, minCellVol", "bess_p_dc = Sum(pcsDcPower); vbat_prom = Avg(vbat)"),
        ("PCS-03 (Inversor 3 / Rack 3)", "TQG0F12134", "250 kVA / 250 kW", "pac, outReactivePower, fac, vacu, vacv, vacw", "vbat, ibat, pcsDcPower, capacity (SOC)", "temp1 (IGBT), temp (Ambiente), temp4 (Choke)", "maxBatTemp, minBatTemp, maxCellVol, minCellVol", "delta_t = Max(maxBatTemp) - Min(minBatTemp)"),
        ("Planta General (Controlador)", "TQG0F12136 (Master)", "750 kW / 1 MWh BESS", "dgActivePower, dgFrequency, dgPowerFactor", "epvToday, eloadToday, status, runModel", "Diagnóstico integral del sistema", "Delta V celdas = (MaxCell - MinCell) * 1000 mV", "load_tot = dg_kw + pac_total (o pv_est +/- pac)")
    ]

    for r_idx, row in enumerate(pcs_data, start=2):
        ws3.append(list(row))
        c_fill = zebra_fill if (r_idx % 2 == 0) else white_fill
        for c_idx in range(1, len(row) + 1):
            c = ws3.cell(row=r_idx, column=c_idx)
            c.fill = c_fill
            c.border = thin_border
            c.font = font_body
            if c_idx == 2: c.font = font_code
            if c_idx == 8: c.font = font_form
            c.alignment = Alignment(vertical="center", wrap_text=True)
        ws3.row_dimensions[r_idx].height = 36

    col_widths3 = [28, 24, 20, 36, 36, 36, 38, 42]
    for i, w in enumerate(col_widths3, start=1):
        ws3.column_dimensions[get_column_letter(i)].width = w
    ws3.freeze_panes = "A2"

    wb.remove(default_sheet)
    wb.save(EXCEL_PATH)
    print(f"Excel generado exitosamente en: {EXCEL_PATH}")

# ==============================================================================
# 3. GENERACIÓN DEL INFORME WORD (.DOCX)
# ==============================================================================

def generar_word():
    doc = docx.Document()

    # Configurar márgenes estándar 2.54 cm
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    # Colores
    c_primary = RGBColor(27, 77, 46)     # Verde HyVision
    c_dark    = RGBColor(15, 23, 42)     # Slate 900
    c_code    = RGBColor(3, 105, 161)    # Cyan/Blue 700

    # Título Principal
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_title = p_title.add_run("MEMORIA TÉCNICA Y DICCIONARIO DE DATOS")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = c_primary

    p_sub = doc.add_paragraph()
    r_sub = p_sub.add_run("Mapeo de Variables, Fórmulas Físicas y Widgets SCADA — Planta Solar & BESS EPM-GAORI")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph() # Espacio

    # Resumen Ejecutivo
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Arquitectura General de Ingesta y Datos")
    r_h1.font.name = "Segoe UI"
    r_h1.font.color.rgb = c_primary

    p_desc = doc.add_paragraph(
        "El sistema de monitoreo SCADA en tiempo real para el sitio industrial EPM_GAORI opera mediante un pipeline continuo de sincronización "
        "(sync_enerclo_thingsboard_produc.py) ejecutado cada 60 segundos. Consulta en paralelo los 3 inversores bidireccionales ATESS PCS250 "
        "(750 kW / 1 MWh BESS) y los 12 convertidores solares DC-DC ATESS PBD250 (3 MW fotovoltaicos), consolidando la telemetría "
        "en ThingsBoard CE (puerto 8082) bajo el dispositivo BESS_EPM_GAORI."
    )
    p_desc.style.font.name = "Segoe UI"
    p_desc.style.font.size = Pt(10.5)

    # 2. Resumen de Hardware
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Topología Física del Sitio GAORI")
    r_h2.font.name = "Segoe UI"
    r_h2.font.color.rgb = c_primary

    p_hw = doc.add_paragraph()
    p_hw.add_run("• Convertidores Solares: ").bold = True
    p_hw.add_run("12 gabinetes ATESS PBD250 (250 kW DC c/u) con 5 strings por equipo = 60 strings solares totales.\n")
    p_hw.add_run("• Inversores Centrales BESS: ").bold = True
    p_hw.add_run("3 unidades ATESS PCS250 (250 kW / 250 kVA c/u) en paralelo en bus AC = 750 kW capacidad nominal.\n")
    p_hw.add_run("• Banco de Baterías: ").bold = True
    p_hw.add_run("3 racks de alta tensión (~750 V DC nominal) con BMS independiente comunicando por inversor.\n")
    p_hw.add_run("• Generación de Respaldo: ").bold = True
    p_hw.add_run("1 grupo electrógeno motogenerador diésel de emergencia (DG) sincronizado en barra AC.")

    # 3. Mapeo Detallado de Widgets
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Fórmulas de Cálculo y Mapeo por Widget SCADA")
    r_h3.font.name = "Segoe UI"
    r_h3.font.color.rgb = c_primary

    # Agrupar por widget
    widgets_unicos = []
    for w in WIDGETS_DATA:
        if w["widget_nombre"] not in widgets_unicos:
            widgets_unicos.append(w["widget_nombre"])

    for w_name in widgets_unicos:
        h_w = doc.add_heading(level=2)
        r_hw = h_w.add_run(f"Widget: {w_name}")
        r_hw.font.name = "Segoe UI"
        r_hw.font.color.rgb = RGBColor(15, 23, 42)

        items_w = [x for x in WIDGETS_DATA if x["widget_nombre"] == w_name]
        
        # Tabla en Word
        table = doc.add_table(rows=1, cols=5)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        headers_t = ["Parámetro", "Unidad", "Clave ThingsBoard", "Origen API", "Fórmula / Lógica"]
        col_widths = [Inches(1.3), Inches(0.8), Inches(1.4), Inches(1.2), Inches(2.3)]

        hdr_cells = table.rows[0].cells
        for idx, title in enumerate(headers_t):
            hdr_cells[idx].text = title
            hdr_cells[idx].width = col_widths[idx]
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'), '1B4D2E')
            hdr_cells[idx]._tc.get_or_add_tcPr().append(shd)
            for p in hdr_cells[idx].paragraphs:
                p.runs[0].font.name = "Segoe UI"
                p.runs[0].font.size = Pt(9)
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = RGBColor(255, 255, 255)

        for it in items_w:
            row_cells = table.add_row().cells
            row_cells[0].text = it["parametro_ui"]
            row_cells[1].text = it["unidad"]
            row_cells[2].text = it["key_thingsboard"]
            row_cells[3].text = it["origen_api"]
            row_cells[4].text = it["formula_logica"]

            for idx, c in enumerate(row_cells):
                c.width = col_widths[idx]
                for p in c.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Segoe UI"
                        r.font.size = Pt(8.5)
                        if idx == 2:
                            r.font.name = "Consolas"
                            r.font.color.rgb = c_code

        doc.add_paragraph() # Espacio entre tablas

    doc.save(WORD_PATH)
    print(f"Word generado exitosamente en: {WORD_PATH}")

if __name__ == "__main__":
    generar_excel()
    generar_word()
