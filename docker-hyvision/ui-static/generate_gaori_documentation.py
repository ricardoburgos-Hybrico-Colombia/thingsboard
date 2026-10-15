# -*- coding: utf-8 -*-
r"""
Generador Maestro de Documentacion Tecnica: Mapeo de Variables, Formulas, Telemetria y Matriz de Alarmas GAORI
Genera:
1. Archivo Excel (.xlsx) con tablas estructuradas, hojas por subsistema, filtros, formulas y Matriz de 33 Alarmas.
2. Archivo Word (.docx) con informe tecnico ejecutivo, topologia, formulas y matriz completa de protecciones y audio.
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
        "origen_api": "vpv, vpv2dc, vpv3, vpv4, vpv5",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "Tensión en circuito abierto/operación MPPT por string: max(0.0, round(float(vpv_i), 1))",
        "ejemplo_valor": "620.0 V a 750.0 V"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "TABLERO SOLAR PBD-01..12 (STRINGS DC)",
        "parametro_ui": "Estado Seccionador DC",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "pbd_disconnect_status / pbd_matrix_json[sel].status",
        "origen_api": "status",
        "endpoint_api": "/api/v1/pbd/data-last",
        "formula_logica": "status == 2 ? 'CERRADO' : 'ABIERTO'",
        "ejemplo_valor": "CERRADO (Conectado y Normal)"
    },

    # 2. GENERACIÓN SOLAR GLOBAL
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "GENERACIÓN SOLAR (PLANTA)",
        "parametro_ui": "Potencia Solar Instantánea",
        "unidad": "kW",
        "key_thingsboard": "generacion_solar_kw / potencia_solar",
        "origen_api": "epv_d / pvActivePower",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Potencia fotovoltaica global del parque: round(float(pvActivePower), 1)",
        "ejemplo_valor": "0.0 kW (Noche) / 1,842.0 kW (Mediodía)"
    },
    {
        "subsistema": "Solar Fotovoltaico DC",
        "widget_nombre": "GENERACIÓN SOLAR (PLANTA)",
        "parametro_ui": "Energía Solar Acumulada Hoy",
        "unidad": "kWh",
        "key_thingsboard": "epv_hoy_kwh / energia_solar_hoy",
        "origen_api": "epv_d",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Energía diaria inyectada por campo solar: round(float(epv_d), 1)",
        "ejemplo_valor": "3,612.0 kWh"
    },

    # 3. ALMACENAMIENTO BESS
    {
        "subsistema": "BESS (Almacenamiento por Baterías)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Estado de Carga (SOC Promedio)",
        "unidad": "%",
        "key_thingsboard": "bess_soc / soc_promedio / soc",
        "origen_api": "capacity / batCapTotal",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Promedio ponderado del SOC de los 3 racks BESS: round(Sum(PCS_i.capacity) / 3, 1)",
        "ejemplo_valor": "47.3% (o 47%)"
    },
    {
        "subsistema": "BESS (Almacenamiento por Baterías)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Potencia de Batería BESS",
        "unidad": "kW",
        "key_thingsboard": "potencia_bess / potencia_bess_kw",
        "origen_api": "batActivePower / pac",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Si pot < 0: BESS en descarga (aporta energía a la microrred). Si pot > 0: BESS en carga. Flecha indicadora ▲/▼.",
        "ejemplo_valor": "-291.1 kW (Descarga)"
    },
    {
        "subsistema": "BESS (Almacenamiento por Baterías)",
        "widget_nombre": "ALMACENAMIENTO BESS",
        "parametro_ui": "Modo Operativo BESS",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "estado_bess",
        "origen_api": "potencia_bess y delta_soc",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "pot < -0.1: 'DESCARGANDO' | pot > 0.1: 'CARGANDO' | |pot| <= 0.1: 'STANDBY'",
        "ejemplo_valor": "DESCARGANDO"
    },

    # 4. DEMANDA DE CARGA
    {
        "subsistema": "Carga Eléctrica (Consumo)",
        "widget_nombre": "DEMANDA DE CARGA",
        "parametro_ui": "Potencia Activa de Carga",
        "unidad": "kW",
        "key_thingsboard": "demanda_carga_kw / potencia_demanda",
        "origen_api": "loadActivePower",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Consumo de la demanda de GAORI: round(float(loadActivePower), 1)",
        "ejemplo_valor": "278.7 kW"
    },
    {
        "subsistema": "Carga Eléctrica (Consumo)",
        "widget_nombre": "DEMANDA DE CARGA",
        "parametro_ui": "Energía Consumida Hoy",
        "unidad": "kWh",
        "key_thingsboard": "eload_hoy_kwh / energia_carga_hoy",
        "origen_api": "eload_d",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Energía total suministrada a la carga hoy: round(float(eload_d), 1)",
        "ejemplo_valor": "3,481.0 kWh"
    },

    # 5. BALANCE DE PLANTA
    {
        "subsistema": "Balance Energético",
        "widget_nombre": "BALANCE DE PLANTA",
        "parametro_ui": "Balance Neto de Potencia",
        "unidad": "kW",
        "key_thingsboard": "Calculado en tiempo real en UI",
        "origen_api": "Solar, BESS, Carga, DG",
        "endpoint_api": "/api/v1/pcs/plant-running-info-last",
        "formula_logica": "Balance = (Solar + Gen_BESS + DG) - (Carga + Carga_BESS). En microrred autónoma equilibrada: ±0.0 kW (AUTÓNOMO).",
        "ejemplo_valor": "±0.0 kW (Autónomo en Equilibrio)"
    },
    {
        "subsistema": "Balance Energético",
        "widget_nombre": "BALANCE DE PLANTA",
        "parametro_ui": "Estado de Balance",
        "unidad": "Texto (Badge)",
        "key_thingsboard": "Calculado en tiempo real en UI",
        "origen_api": "netBalance",
        "endpoint_api": "UI Widget",
        "formula_logica": "|net| <= 20 kW: 'AUTÓNOMO' | net > 20 kW: 'SUPERÁVIT' | net < -20 kW: 'DÉFICIT'",
        "ejemplo_valor": "AUTÓNOMO"
    },

    # 6. POTENCIA ACTIVA PCS
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA PCS",
        "parametro_ui": "Potencia Total AC Inversores",
        "unidad": "kW",
        "key_thingsboard": "pac_total_kw",
        "origen_api": "pac_pcs1 + pac_pcs2 + pac_pcs3",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Suma vectorial de potencia activa de los 3 inversores centrales: round(P1 + P2 + P3, 1)",
        "ejemplo_valor": "284.6 kW"
    },
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA ACTIVA PCS",
        "parametro_ui": "Potencia por Inversor (PCS 1, 2, 3)",
        "unidad": "kW",
        "key_thingsboard": "carga_pcs1, carga_pcs2, carga_pcs3",
        "origen_api": "pac de cada PCS",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Potencia activa individual: round(abs(pac_i), 1). Barra: min(100%, (P / 250 kW) * 100)",
        "ejemplo_valor": "PCS1: 93.0 kW | PCS2: 88.3 kW | PCS3: 97.4 kW"
    },

    # 7. POTENCIA REACTIVA
    {
        "subsistema": "Inversores PCS250 (AC)",
        "widget_nombre": "POTENCIA REACTIVA (VAR)",
        "parametro_ui": "Potencia Reactiva Total",
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
        "parametro_ui": "Tensión de Línea / Fase",
        "unidad": "V",
        "key_thingsboard": "vacu, vacv, vacw / tension_red",
        "origen_api": "vacu, vacv, vacw",
        "endpoint_api": "/api/v1/pcs/data-last",
        "formula_logica": "Tensiones de fase medidas por inversor: round(float(vac_i), 1)",
        "ejemplo_valor": "220.4 V (Fase) / 380 V (Línea)"
    },

    # 14. REGISTRO DE EVENTOS Y FALLAS
    {
        "subsistema": "Supervisión SCADA y Alarmas",
        "widget_nombre": "REGISTRO DE EVENTOS Y FALLAS",
        "parametro_ui": "Alarmas Activas / Advertencias",
        "unidad": "Conteo Entero",
        "key_thingsboard": "alarmas_activas_total, faults_30d_total, warnings_30d_total",
        "origen_api": "Evaluación viva de 33 reglas SCADA + API de Alarmas",
        "endpoint_api": "/api/v1/warn/last-list & /api/v1/fault/last-list",
        "formula_logica": "Evaluación matricial en tiempo real con Web Audio API y consola interactiva desplegable",
        "ejemplo_valor": "0 Críticas | 0 Advertencias | 4 Historial (Sistema Saludable)"
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
# 2. MATRIZ INTEGRAL DE 33 ALARMAS SCADA: GAORI
# ==============================================================================

ALARMS_MATRIX_DATA = [
    # --- 1. BESS & BMS (11 Alarmas) ---
    {
        "id": "ALM-BMS-001",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Banco de Baterías",
        "variable": "bess_soc / soc_promedio",
        "umbral": "SOC < 25.0%",
        "retardo": "30 seg",
        "severidad": "Advertencia",
        "descripcion": "SOC bajo preventivo. El banco de baterías entra en reserva operativa.",
        "accion": "Notificación preventiva al operador. Preparación de fuente auxiliar o reducción de cargas no críticas.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-BMS-002",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Banco de Baterías",
        "variable": "bess_soc / soc_promedio",
        "umbral": "SOC < 15.0%",
        "retardo": "10 seg",
        "severidad": "Crítica",
        "descripcion": "SOC crítico por debajo de profundidad de descarga (DoD) máxima permitida.",
        "accion": "Inhibición forzada de descarga del BESS. Disparo automático de arranque de grupo electrógeno diésel.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-BMS-003",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Banco de Baterías",
        "variable": "bess_soc / soc_promedio",
        "umbral": "SOC > 98.0%",
        "retardo": "15 seg",
        "severidad": "Advertencia",
        "descripcion": "Banco de baterías cercano a saturación de carga completa.",
        "accion": "Reducción automática de potencia en convertidores solares PBD250 (Curtailment solar).",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-BMS-004",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Celdas LFP",
        "variable": "delta_v_celdas_mv",
        "umbral": "ΔV > 30.0 mV",
        "retardo": "60 seg",
        "severidad": "Advertencia",
        "descripcion": "Desbalance de tensión entre celdas LFP supera límite preventivo.",
        "accion": "BMS inicia algoritmo de ecualización pasiva por resistencias de sangrado en celdas altas.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-BMS-005",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Celdas LFP",
        "variable": "delta_v_celdas_mv",
        "umbral": "ΔV > 60.0 mV",
        "retardo": "15 seg",
        "severidad": "Crítica",
        "descripcion": "Desbalance severo entre celdas individuales (riesgo de degradación acelerada).",
        "accion": "Limitación de corriente de carga y descarga al 50%. Generación de orden de mantenimiento técnico.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-BMS-006",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Celdas LFP",
        "variable": "min_volt_celda_mv",
        "umbral": "V_celda < 2800 mV (2.80 V)",
        "retardo": "5 seg",
        "severidad": "Crítica",
        "descripcion": "Tensión mínima de celda en umbral de sub-tensión profunda.",
        "accion": "Corte de contactor DC principal del rack afectado para evitar daño químico irreversible.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-BMS-007",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Celdas LFP",
        "variable": "max_volt_celda_mv",
        "umbral": "V_celda > 3650 mV (3.65 V)",
        "retardo": "5 seg",
        "severidad": "Crítica",
        "descripcion": "Tensión de celda máxima supera el límite de sobrecarga electroquímica.",
        "accion": "Interrupción inmediata de corriente de carga solar/red en el rack afectado.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-BMS-008",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Climatización y Racks",
        "variable": "temp_bateria_max",
        "umbral": "T_bat > 38.0 °C",
        "retardo": "30 seg",
        "severidad": "Advertencia",
        "descripcion": "Temperatura de celdas por encima de temperatura óptima de operación (15-35°C).",
        "accion": "Arranque forzado al 100% de los sistemas de aire acondicionado HVAC del contenedor BESS.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-BMS-009",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Climatización y Racks",
        "variable": "temp_bateria_max",
        "umbral": "T_bat > 45.0 °C",
        "retardo": "10 seg",
        "severidad": "Crítica",
        "descripcion": "Sobretemperatura crítica en módulos de batería (riesgo de thermal runaway).",
        "accion": "Desconexión de potencia del BESS, parada de emergencia y activación de protocolo contra incendios.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-BMS-010",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Climatización y Racks",
        "variable": "temp_bateria_min",
        "umbral": "T_bat < 5.0 °C",
        "retardo": "60 seg",
        "severidad": "Advertencia",
        "descripcion": "Baja temperatura ambiental en celdas de batería.",
        "accion": "Inhibición de carga rápida a alta corriente para prevenir electrodeposición de litio metálico.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-BMS-011",
        "categoria": "1. BESS y Gestión de Baterías (BMS)",
        "subsistema": "BESS - Climatización y Racks",
        "variable": "delta_temp_bateria",
        "umbral": "ΔT > 10.0 °C",
        "retardo": "120 seg",
        "severidad": "Advertencia",
        "descripcion": "Dispersión térmica anormal entre módulos o racks de baterías.",
        "accion": "Alerta de gradiente térmico. Verificación de obstrucción de flujo de aire o fallo de dampers HVAC.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },

    # --- 2. INVERSORES PCS250 (9 Alarmas) ---
    {
        "id": "ALM-PCS-001",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "temp_igbt_pcs1..3",
        "umbral": "T_igbt > 65.0 °C",
        "retardo": "20 seg",
        "severidad": "Advertencia",
        "descripcion": "Temperatura elevada en puentes de potencia IGBT de inversores.",
        "accion": "Arranque a máxima velocidad de ventiladores de disipador. Derating térmico del 10%.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PCS-002",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "temp_igbt_pcs1..3",
        "umbral": "T_igbt > 75.0 °C",
        "retardo": "5 seg",
        "severidad": "Crítica",
        "descripcion": "Sobretemperatura crítica en módulos IGBT. Riesgo de destrucción de semiconductor.",
        "accion": "Disparo térmico instantáneo y desconexión segura del inversor afectado.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-PCS-003",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "temp_ind_pcs1..3",
        "umbral": "T_ind > 80.0 °C",
        "retardo": "30 seg",
        "severidad": "Advertencia",
        "descripcion": "Temperatura alta en reactancias/inductancias de filtrado sinusoidal AC.",
        "accion": "Inspección de ventilación en compartimento de filtrado magnético.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PCS-004",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "carga_pcs1, carga_pcs2, carga_pcs3",
        "umbral": "|PCS_i - Promedio| > 25.0 kW",
        "retardo": "15 seg",
        "severidad": "Advertencia",
        "descripcion": "Desbalance de reparto de carga activa entre inversores operando en paralelo.",
        "accion": "Calibración de lazo de droop control o verificación de impedancias de enlace.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PCS-005",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "carga_pcs1..3",
        "umbral": "P > 245.0 kW (98% nominal)",
        "retardo": "60 seg",
        "severidad": "Advertencia",
        "descripcion": "Inversor operando al límite de capacidad nominal continua de 250 kVA.",
        "accion": "Redistribución automática de potencia a inversores en paralelo o arranque de diésel.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PCS-006",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "pbd_bus_voltage / vbat",
        "umbral": "V_bus < 620 V o V_bus > 850 V",
        "retardo": "5 seg",
        "severidad": "Crítica",
        "descripcion": "Tensión en el bus DC colector fuera de rango de modulación PWM del inversor.",
        "accion": "Aislamiento inmediato del inversor para prevenir colapso de modulación o sobretensión.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-PCS-007",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "frecuencia_red_hz / vacu",
        "umbral": "Δf > 0.3 Hz o ΔV > 10%",
        "retardo": "3 seg",
        "severidad": "Crítica",
        "descripcion": "Fallo de sincronismo de ángulo de fase o frecuencia en barraje AC común.",
        "accion": "Apertura de contactor AC del inversor desincronizado para evitar corrientes de circulación.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-PCS-008",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "sn_pcs1..3 (Telemetría)",
        "umbral": "Sin reporte > 30 seg",
        "retardo": "30 seg",
        "severidad": "Crítica",
        "descripcion": "Pérdida de comunicación de telemetría y control con inversor PCS250.",
        "accion": "Conmutación de inversor a modo autónomo de seguridad y aviso prioritario a SCADA.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-PCS-009",
        "categoria": "2. Inversores ATESS PCS250 (Etapa AC/DC)",
        "subsistema": "Inversores PCS250 (AC)",
        "variable": "q_total_kvar / pf_pcs",
        "umbral": "FP < 0.85 con P > 50 kW",
        "retardo": "45 seg",
        "severidad": "Advertencia",
        "descripcion": "Factor de potencia bajo en microrred; consumo reactivo inductivo excesivo.",
        "accion": "Consigna automática a inversores PCS para inyección de VAR capacitivos de compensación.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },

    # --- 3. CAMPO SOLAR PBD250 (6 Alarmas) ---
    {
        "id": "ALM-PBD-001",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel].status",
        "umbral": "status != 'CERRADO'",
        "retardo": "10 seg",
        "severidad": "Advertencia",
        "descripcion": "Seccionador DC bajo carga del convertidor PBD250 en posición ABIERTO.",
        "accion": "Verificación si es maniobra de mantenimiento programado o disparo por fallo DC.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PBD-002",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel].currents[i]",
        "umbral": "I_str = 0.0 A con otros > 8.0 A",
        "retardo": "60 seg",
        "severidad": "Advertencia",
        "descripcion": "String solar individual sin paso de corriente en horario de alta radiación.",
        "accion": "Inspección técnica de fusibles gPV (1500V / 25A) o conectores MC4 desconectados.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PBD-003",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel].currents[i]",
        "umbral": "|I_str - Promedio| > 30%",
        "retardo": "120 seg",
        "severidad": "Advertencia",
        "descripcion": "Desbalance de generación entre strings paralelos del mismo convertidor.",
        "accion": "Inspección de acumulación de suciedad/polvo, sombreado puntual o módulo dañado.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PBD-004",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel].temp",
        "umbral": "T_pbd > 65.0 °C",
        "retardo": "30 seg",
        "severidad": "Advertencia",
        "descripcion": "Temperatura elevada en gabinete o disipadores del convertidor PBD250.",
        "accion": "Revisión y limpieza de rejillas de ventilación y funcionamiento de extractores.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PBD-005",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel].voltages[i]",
        "umbral": "V_str < 450 V con P_solar > 50 kW",
        "retardo": "60 seg",
        "severidad": "Advertencia",
        "descripcion": "Tensión DC de string fotovoltaico por debajo del rango MPPT normal.",
        "accion": "Comprobación de diodos de derivación (bypass) en módulos o cortocircuito parcial.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-PBD-006",
        "categoria": "3. Campo Solar Fotovoltaico PBD250 y Strings DC",
        "subsistema": "Campo Solar PBD250",
        "variable": "pbd_matrix_json[sel]",
        "umbral": "PBD no responde en payload API",
        "retardo": "45 seg",
        "severidad": "Advertencia",
        "descripcion": "Pérdida de comunicación Modbus RS485 con el tablero PBD seleccionado.",
        "accion": "Verificación de gateway serial-a-Ethernet o cable de comunicación en canaleta.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },

    # --- 4. MICRORRED, BALANCE Y DIÉSEL (5 Alarmas) ---
    {
        "id": "ALM-MIC-001",
        "categoria": "4. Microrred, Balance de Planta y Respaldo Diésel",
        "subsistema": "Microrred GAORI - Barra AC",
        "variable": "frecuencia_red_hz",
        "umbral": "f < 59.5 Hz o f > 60.5 Hz",
        "retardo": "5 seg",
        "severidad": "Advertencia",
        "descripcion": "Frecuencia de microrred fuera de banda nominal de alta calidad (60 ± 0.5 Hz).",
        "accion": "Ajuste dinámico de inyección de potencia activa por droop P/f en inversores.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-MIC-002",
        "categoria": "4. Microrred, Balance de Planta y Respaldo Diésel",
        "subsistema": "Microrred GAORI - Barra AC",
        "variable": "frecuencia_red_hz",
        "umbral": "f < 58.5 Hz o f > 61.5 Hz",
        "retardo": "1 seg",
        "severidad": "Crítica",
        "descripcion": "Frecuencia en límites de contingencia severa (riesgo de colapso de microrred).",
        "accion": "Deslastre automático de cargas secundarias y disparo de arranque de emergencia diésel.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-MIC-003",
        "categoria": "4. Microrred, Balance de Planta y Respaldo Diésel",
        "subsistema": "Balance de Planta Microrred",
        "variable": "balance_neto_kw / bess_soc",
        "umbral": "Balance < -10 kW con BESS SOC < 20%",
        "retardo": "15 seg",
        "severidad": "Crítica",
        "descripcion": "Déficit de generación no cubierto por almacenamiento BESS.",
        "accion": "Arranque y sincronización automática del generador diésel de respaldo.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-MIC-004",
        "categoria": "4. Microrred, Balance de Planta y Respaldo Diésel",
        "subsistema": "Respaldo Generador Diésel",
        "variable": "dg_kw / estado_generador",
        "umbral": "Orden ON pero DG_kW = 0 tras 30 s",
        "retardo": "30 seg",
        "severidad": "Crítica",
        "descripcion": "Fallo de arranque o transferencia de carga en grupo electrógeno diésel.",
        "accion": "Alarma de alta prioridad al operador, verificación de combustible/batería de arranque del diésel.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    },
    {
        "id": "ALM-MIC-005",
        "categoria": "4. Microrred, Balance de Planta y Respaldo Diésel",
        "subsistema": "Respaldo Generador Diésel",
        "variable": "dg_corriente_fase_u, v, w",
        "umbral": "Desbalance > 15% con I_avg > 50 A",
        "retardo": "20 seg",
        "severidad": "Advertencia",
        "descripcion": "Desbalance de corrientes de fase durante operación en diésel.",
        "accion": "Alerta operativa para redistribución de cargas monofásicas en tablero general.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },

    # --- 5. ENLACE & TELEMETRÍA (2 Alarmas) ---
    {
        "id": "ALM-SYS-001",
        "categoria": "5. Enlace de Telemetría e Ingesta de Datos",
        "subsistema": "Comunicaciones y Telemetría",
        "variable": "sync_enerclo_thingsboard_produc.py",
        "umbral": "Sin datos nuevos > 3 min",
        "retardo": "180 seg",
        "severidad": "Advertencia",
        "descripcion": "Retraso o timeout en la ingesta de datos desde API OpenAPI Enerclo.",
        "accion": "Reintento automático de consulta HTTP y registro en bitácora del servicio de ingesta.",
        "audio": "587 Hz / 880 Hz (Doble chime de advertencia)"
    },
    {
        "id": "ALM-SYS-002",
        "categoria": "5. Enlace de Telemetría e Ingesta de Datos",
        "subsistema": "Comunicaciones y Telemetría",
        "variable": "thingsboard_heartbeat",
        "umbral": "Sin actualización > 10 min",
        "retardo": "600 seg",
        "severidad": "Crítica",
        "descripcion": "Pérdida prolongada de telemetría de planta en plataforma ThingsBoard.",
        "accion": "Alerta crítica de pérdida de supervisión remota en centro de control.",
        "audio": "880 Hz / 660 Hz (Tono dual pulsante industrial)"
    }
]

# ==============================================================================
# 2.B. FALLAS NATIVAS DE HARDWARE: INVERSORES ATESS PCS250 (ENERCLO OPENAPI)
# ==============================================================================

ATESS_HARDWARE_FAULTS_DATA = [
    {
        "code": "7-D3",
        "raw_desc": "Parallel_Uneven_Flow_Warning",
        "desc_es": "Desbalance de Reparto de Corriente en Paralelo (Aviso)",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Desbalance o circulación de corriente reactiva/activa entre inversores acoplados en bus AC",
        "severidad": "Advertencia",
        "accion": "Verificar lazos de droop control en los PCS, impedancia de cables de enlace AC e inductancias de acople."
    },
    {
        "code": "7-D15",
        "raw_desc": "AC_UnderFreq_Rmt_Warning",
        "desc_es": "Subfrecuencia Remota en Barra AC (Aviso)",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Frecuencia medida en barra AC inferior al umbral de seguridad configurado en el firmware (< 59.5 Hz)",
        "severidad": "Advertencia",
        "accion": "Validar balance de potencia activa de la microrred y soporte droop P/f del BESS o generador diésel."
    },
    {
        "code": "7-D14",
        "raw_desc": "AC_OverFreq_Rmt_Warning",
        "desc_es": "Sobrefrecuencia Remota en Barra AC (Aviso)",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Frecuencia en barra AC superior al límite superior de operación (> 60.5 Hz)",
        "severidad": "Advertencia",
        "accion": "Reducción de inyección de potencia activa por sobrefrecuencia y verificar limitación de potencia solar fotovoltaica."
    },
    {
        "code": "8-D11",
        "raw_desc": "CANb_Communication_Fault (PCS)",
        "desc_es": "Falla de Comunicación en Bus CANb Interno",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Pérdida de tramas de comunicación en el bus serie CANb interno entre tarjetas de control del PCS",
        "severidad": "Crítica",
        "accion": "Inspeccionar cableado de bus CAN, terminadores resistivos de 120 ohms y conectores de placa de control."
    },
    {
        "code": "6-D13",
        "raw_desc": "Batt_UnderVolt_Fault",
        "desc_es": "Falla por Subtensión en Banco de Baterías",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Tensión del bus de continua de baterías cae por debajo del umbral mínimo de corte por hardware del inversor",
        "severidad": "Crítica",
        "accion": "Apertura de contactor DC, inhibir descarga de baterías e iniciar recarga inmediata mediante campo solar o generador."
    },
    {
        "code": "2-D3",
        "raw_desc": "BMS_Communication_Fault",
        "desc_es": "Pérdida de Comunicación con Sistema BMS",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Timeout o pérdida de enlace de datos RS485/CAN entre el inversor PCS y el controlador de baterías BMS",
        "severidad": "Crítica",
        "accion": "Verificar alimentación del gateway BMS, cable de par trenzado apantallado y parámetros de baudrate."
    },
    {
        "code": "2-D9",
        "raw_desc": "PBD_Communication_Fault (PCS)",
        "desc_es": "Falla de Comunicación con Tableros Solares PBD",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Pérdida de polling de datos Modbus con los tableros convertidores DC/DC solar PBD250",
        "severidad": "Advertencia",
        "accion": "Revisar bus serial RS485 colector de campo solar y estado de encendido de los 12 tableros PBD."
    },
    {
        "code": "3-D0",
        "raw_desc": "AC_NoUtility_Fault",
        "desc_es": "Falla de Tensión en Barra AC / Ausencia de Red",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Tensión nula o fuera de rango en la barra AC externa conectada al inversor",
        "severidad": "Crítica",
        "accion": "Verificar conmutación a modo isla (islanding/off-grid) o sincronización con motogenerador diésel."
    },
    {
        "code": "3-D1",
        "raw_desc": "AC_GridPhaseSeque_Fault",
        "desc_es": "Secuencia de Fase Incorrecta en Barra AC",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Rotación de fases trifásicas invertida (CBA en lugar de ABC) detectada en bornes AC del inversor",
        "severidad": "Crítica",
        "accion": "Verificar conexión de conductores de fases R-S-T en interruptor principal y corregir rotación física."
    },
    {
        "code": "5-D2",
        "raw_desc": "LcdEmergencyStop",
        "desc_es": "Parada de Emergencia Manual por Pantalla LCD",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Accionamiento manual del comando de parada de emergencia desde el botón táctil del panel LCD frontal",
        "severidad": "Crítica",
        "accion": "Confirmar causa de intervención del operador en sitio y realizar rearme seguro desde el menú del inversor."
    },
    {
        "code": "6-D12",
        "raw_desc": "Batt_OverVolt_Fault",
        "desc_es": "Falla por Sobretensión en Banco de Baterías",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Tensión DC del banco de baterías supera el límite máximo absoluto permitido por el inversor (> 850 V)",
        "severidad": "Crítica",
        "accion": "Cese inmediato de inyección de carga solar, verificar estado de reguladores MPPT y calibración de BMS."
    },
    {
        "code": "8-D14",
        "raw_desc": "Paraller_PLL_Signal_Fault",
        "desc_es": "Falla de Sincronismo PLL para Operación en Paralelo",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "Pérdida de bloqueo de fase en el lazo PLL (Phase-Locked Loop) que coordina los inversores en paralelo",
        "severidad": "Crítica",
        "accion": "Verificar calidad de onda de tensión en la barra de sincronismo e integridad del cableado de sincronismo inter-PCS."
    },
    {
        "code": "9-D8",
        "raw_desc": "Alarm of Fault No>Redundancy No",
        "desc_es": "Fallas Acumuladas Superan Redundancia N+1",
        "equipo": "Inversores Centrales ATESS PCS250",
        "origen": "DSP Inversor PCS / Enerclo OpenAPI (/api/v1/fault/list)",
        "condicion": "El número de inversores o módulos de potencia fuera de servicio excede la capacidad de redundancia disponible",
        "severidad": "Crítica",
        "accion": "Alerta prioritaria al centro de control; deslastre programado de carga para evitar sobrecarga del equipo remanente."
    }
]

# ==============================================================================
# 3. GENERACIÓN DEL LIBRO EXCEL (.XLSX)
# ==============================================================================

def generar_excel():
    wb = openpyxl.Workbook()
    default_sheet = wb.active

    # Estilos Corporativos HyVision
    header_fill = PatternFill(start_color="1B4D2E", end_color="1B4D2E", fill_type="solid") # Verde HyVision
    zebra_fill  = PatternFill(start_color="F4F8F5", end_color="F4F8F5", fill_type="solid")
    white_fill  = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    crit_fill   = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid") # Rojo suave
    warn_fill   = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid") # Amarillo suave

    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_bold   = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    font_body   = Font(name="Segoe UI", size=10, color="1E293B")
    font_code   = Font(name="Consolas", size=9.5, color="0369A1")
    font_form   = Font(name="Segoe UI", size=9.5, italic=True, color="1E3A8A")
    font_crit   = Font(name="Segoe UI", size=10, bold=True, color="991B1B")
    font_warn   = Font(name="Segoe UI", size=10, bold=True, color="92400E")

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
        "Variables Térmicas BMS",
        "Fórmula Reparto de Potencia"
    ]
    ws3.append(headers3)
    for col_idx in range(1, len(headers3) + 1):
        cell = ws3.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws3.row_dimensions[1].height = 30

    pcs_data = [
        ("Inversor PCS-01", "TQG0F12136", "250 kW / 250 kVA", "carga_pcs1, pac_pcs1, q_pcs1", "soc_pcs1, vbat, ibat", "temp_igbt_pcs1, temp_ind_pcs1", "maxBatTemp, minBatTemp", "P_total = P1 + P2 + P3"),
        ("Inversor PCS-02", "TQG0F12135", "250 kW / 250 kVA", "carga_pcs2, pac_pcs2, q_pcs2", "soc_pcs2, vbat, ibat", "temp_igbt_pcs2, temp_ind_pcs2", "maxBatTemp, minBatTemp", "Droop control autónomo"),
        ("Inversor PCS-03", "TQG0F12134", "250 kW / 250 kVA", "carga_pcs3, pac_pcs3, q_pcs3", "soc_pcs3, vbat, ibat", "temp_igbt_pcs3, temp_ind_pcs3", "maxBatTemp, minBatTemp", "Droop control autónomo")
    ]
    for r_idx, pcs in enumerate(pcs_data, start=2):
        ws3.append(pcs)
        c_fill = zebra_fill if (r_idx % 2 == 0) else white_fill
        for c_idx in range(1, len(pcs) + 1):
            c = ws3.cell(row=r_idx, column=c_idx)
            c.fill = c_fill
            c.border = thin_border
            if c_idx == 2:
                c.font = font_code
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.font = font_body
                c.alignment = Alignment(vertical="center", wrap_text=True)
        ws3.row_dimensions[r_idx].height = 28

    col_widths3 = [20, 24, 22, 32, 26, 28, 28, 30]
    for i, w in enumerate(col_widths3, start=1):
        ws3.column_dimensions[get_column_letter(i)].width = w
    ws3.freeze_panes = "A2"

    # --------------------------------------------------------------------------
    # HOJA 4: Matriz_Alarmas_SCADA (NUEVA: 33 ALARMAS COMPLETAS)
    # --------------------------------------------------------------------------
    ws4 = wb.create_sheet(title="Matriz_Alarmas_SCADA")
    headers4 = [
        "Código Alarma",
        "Categoría de Supervisión",
        "Subsistema / Equipo Afectado",
        "Variable Telemetría ThingsBoard",
        "Condición / Umbral de Disparo",
        "Retardo / Persistencia",
        "Severidad",
        "Descripción Operativa del Evento",
        "Protocolo de Acción Automática / Operador",
        "Tono Acústico SCADA (Web Audio API)"
    ]
    ws4.append(headers4)
    for col_idx in range(1, len(headers4) + 1):
        cell = ws4.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws4.row_dimensions[1].height = 32

    for r_idx, alm in enumerate(ALARMS_MATRIX_DATA, start=2):
        row_vals = [
            alm["id"],
            alm["categoria"],
            alm["subsistema"],
            alm["variable"],
            alm["umbral"],
            alm["retardo"],
            alm["severidad"],
            alm["descripcion"],
            alm["accion"],
            alm["audio"]
        ]
        ws4.append(row_vals)
        
        is_crit = alm["severidad"] == "Crítica"
        row_fill = crit_fill if is_crit else (warn_fill if alm["severidad"] == "Advertencia" else zebra_fill)
        
        for c_idx in range(1, len(row_vals) + 1):
            c = ws4.cell(row=r_idx, column=c_idx)
            c.fill = row_fill if (c_idx == 7) else (zebra_fill if (r_idx % 2 == 0) else white_fill)
            c.border = thin_border
            
            if c_idx == 1:
                c.font = font_bold
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx == 4:
                c.font = font_code
                c.alignment = Alignment(vertical="center", wrap_text=True)
            elif c_idx in [5, 6]:
                c.font = font_bold
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx == 7:
                c.font = font_crit if is_crit else font_warn
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.font = font_body
                c.alignment = Alignment(vertical="center", wrap_text=True)
        ws4.row_dimensions[r_idx].height = 36

    col_widths4 = [18, 34, 26, 32, 24, 18, 16, 45, 52, 34]
    for i, w in enumerate(col_widths4, start=1):
        ws4.column_dimensions[get_column_letter(i)].width = w
    ws4.freeze_panes = "A2"
    ws4.auto_filter.ref = f"A1:{get_column_letter(len(headers4))}{len(ALARMS_MATRIX_DATA) + 1}"

    # --------------------------------------------------------------------------
    # HOJA 5: Fallas_Hardware_ATESS_PCS (13 EVENTOS NATIVOS DE FABRICANTE)
    # --------------------------------------------------------------------------
    ws5 = wb.create_sheet(title="Fallas_Hardware_ATESS_PCS")
    headers5 = [
        "Código Evento (eventSn)",
        "Descripción Firmware ATESS (EN)",
        "Descripción / Traducción Técnica (ES)",
        "Subsistema / Equipo Afectado",
        "Origen / Canal de Datos",
        "Condición Física de Disparo en Inversor",
        "Severidad",
        "Protocolo de Acción Recomendado"
    ]
    ws5.append(headers5)
    for col_idx in range(1, len(headers5) + 1):
        cell = ws5.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws5.row_dimensions[1].height = 32

    for r_idx, flt in enumerate(ATESS_HARDWARE_FAULTS_DATA, start=2):
        row_vals = [
            flt["code"],
            flt["raw_desc"],
            flt["desc_es"],
            flt["equipo"],
            flt["origen"],
            flt["condicion"],
            flt["severidad"],
            flt["accion"]
        ]
        ws5.append(row_vals)
        is_crit = flt["severidad"] == "Crítica"
        r_fill = crit_fill if is_crit else warn_fill

        for c_idx in range(1, len(row_vals) + 1):
            c = ws5.cell(row=r_idx, column=c_idx)
            c.fill = r_fill if (c_idx == 7) else (zebra_fill if (r_idx % 2 == 0) else white_fill)
            c.border = thin_border
            if c_idx == 1:
                c.font = font_bold
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx == 2:
                c.font = font_code
                c.alignment = Alignment(vertical="center", wrap_text=True)
            elif c_idx == 3:
                c.font = font_bold
                c.alignment = Alignment(vertical="center", wrap_text=True)
            elif c_idx == 7:
                c.font = font_crit if is_crit else font_warn
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.font = font_body
                c.alignment = Alignment(vertical="center", wrap_text=True)
        ws5.row_dimensions[r_idx].height = 34

    col_widths5 = [20, 32, 38, 28, 35, 45, 18, 55]
    for i, w in enumerate(col_widths5, start=1):
        ws5.column_dimensions[get_column_letter(i)].width = w
    ws5.freeze_panes = "A2"
    ws5.auto_filter.ref = f"A1:{get_column_letter(len(headers5))}{len(ATESS_HARDWARE_FAULTS_DATA) + 1}"

    # Eliminar hoja default vacía
    if default_sheet in wb.worksheets:
        wb.remove(default_sheet)

    wb.save(EXCEL_PATH)
    print(f"Excel generado exitosamente con 5 hojas en: {EXCEL_PATH}")

# ==============================================================================
# 4. GENERACIÓN DEL DOCUMENTO WORD (.DOCX)
# ==============================================================================

def generar_word():
    doc = docx.Document()

    # Configuración de márgenes
    sections = doc.sections
    for section in sections:
        section.top_margin    = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin   = Inches(1.0)
        section.right_margin  = Inches(1.0)

    c_primary = RGBColor(27, 77, 46)   # Verde HyVision
    c_accent  = RGBColor(100, 184, 86) # Verde claro SCADA
    c_dark    = RGBColor(15, 23, 42)   # Slate 900
    c_code    = RGBColor(3, 105, 161)  # Azul código

    # TÍTULO PRINCIPAL
    title = doc.add_paragraph()
    r_title = title.add_run("Mapeo Técnico de Telemetría, Fórmulas de Cálculo y Matriz de Alarmas SCADA")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(20)
    r_title.font.bold = True
    r_title.font.color.rgb = c_primary
    title.paragraph_format.space_after = Pt(2)

    sub = doc.add_paragraph()
    r_sub = sub.add_run("Planta Solar & Sistema de Almacenamiento BESS • Sitio GAORI (EPM Colombia)")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(12)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(100, 116, 139)
    sub.paragraph_format.space_after = Pt(16)

    # 1. Resumen Ejecutivo
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Resumen Ejecutivo de Arquitectura de Telemetría")
    r_h1.font.name = "Segoe UI"
    r_h1.font.color.rgb = c_primary

    p1 = doc.add_paragraph()
    p1.add_run("El presente documento técnico establece el mapeo exhaustivo y definitivo entre las fuentes de datos de la ")
    p1.add_run("API OpenAPI Enerclo").bold = True
    p1.add_run(", el servicio de ingesta y normalización continua (")
    p1.add_run("sync_enerclo_thingsboard_produc.py").font.name = "Consolas"
    p1.add_run("), los atributos y series temporales almacenados en ")
    p1.add_run("ThingsBoard Professional / Community Edition").bold = True
    p1.add_run(", su expresión visual en los widgets SCADA del dashboard ")
    p1.add_run("EPM_GAORI").bold = True
    p1.add_run(", y la ")
    p1.add_run("Matriz de 33 Alarmas y Protecciones Operativas con alertas acústicas Web Audio API").bold = True
    p1.add_run(" incorporada en la consola interactiva de supervisión.")

    # 2. Topología Física
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Topología Física y Jerarquía de Equipos GAORI")
    r_h2.font.name = "Segoe UI"
    r_h2.font.color.rgb = c_primary

    p_hw = doc.add_paragraph()
    p_hw.add_run("• Campo Solar Fotovoltaico DC: ").bold = True
    p_hw.add_run("12 gabinetes ATESS PBD250 (250 kW DC c/u) con 5 strings por equipo = 60 strings solares totales.\n")
    p_hw.add_run("• Inversores Centrales BESS: ").bold = True
    p_hw.add_run("3 unidades ATESS PCS250 (250 kW / 250 kVA c/u) en paralelo en bus AC = 750 kW capacidad nominal.\n")
    p_hw.add_run("• Banco de Baterías: ").bold = True
    p_hw.add_run("3 racks de alta tensión (~750 V DC nominal) con BMS independiente comunicando por inversor.\n")
    p_hw.add_run("• Generación de Respaldo: ").bold = True
    p_hw.add_run("1 grupo electrógeno motogenerador diésel de emergencia (DG) sincronizado en barra AC.\n")
    p_hw.add_run("• Consola de Alarmas: ").bold = True
    p_hw.add_run("Widget interactivo con evaluación matricial de 33 reglas, bitácora histórica y sintetizador de sonido.")

    # 3. Mapeo Detallado de Widgets
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Fórmulas de Cálculo y Mapeo por Widget SCADA")
    r_h3.font.name = "Segoe UI"
    r_h3.font.color.rgb = c_primary

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

        doc.add_paragraph()

    # 4. MATRIZ DE ALARMAS SCADA Y PROTECCIONES OPERATIVAS
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Matriz Integral de 33 Alarmas SCADA y 13 Fallas Nativas de Hardware ATESS PCS250 (46 Protecciones Totales)")
    r_h4.font.name = "Segoe UI"
    r_h4.font.color.rgb = c_primary

    p_alm_intro = doc.add_paragraph()
    p_alm_intro.add_run("La matriz de supervisión y alarmas de GAORI implementa un esquema de doble capa basado en las normas ")
    p_alm_intro.add_run("IEEE 1547, IEC 62933 (Sistemas BESS) e IEC 60364").bold = True
    p_alm_intro.add_run(": (1) Una capa lógica de ")
    p_alm_intro.add_run("33 reglas de monitoreo en tiempo real").bold = True
    p_alm_intro.add_run(" evaluadas por ThingsBoard sobre la telemetría operativa de celdas, strings, bus AC y generadores; y (2) Una capa física de ")
    p_alm_intro.add_run("13 fallas y avisos nativos de hardware").bold = True
    p_alm_intro.add_run(" reportados directamente por las tarjetas DSP de los inversores centrales ATESS PCS250 mediante la API de Enerclo. Cada alarma define su código unívoco, umbral o condición física, severidad y protocolo de contingencia.")

    # Agrupar por categoría
    categorias = []
    for a in ALARMS_MATRIX_DATA:
        if a["categoria"] not in categorias:
            categorias.append(a["categoria"])

    for cat in categorias:
        h_cat = doc.add_heading(level=2)
        r_hcat = h_cat.add_run(cat)
        r_hcat.font.name = "Segoe UI"
        r_hcat.font.color.rgb = RGBColor(15, 23, 42)

        items_cat = [x for x in ALARMS_MATRIX_DATA if x["categoria"] == cat]

        t_cat = doc.add_table(rows=1, cols=6)
        t_cat.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_cat.autofit = False

        headers_cat = ["Código", "Equipo", "Variable & Umbral", "Retardo", "Severidad", "Descripción y Protocolo de Acción"]
        widths_cat = [Inches(1.1), Inches(1.1), Inches(1.5), Inches(0.8), Inches(1.0), Inches(2.2)]

        hdr_cells = t_cat.rows[0].cells
        for idx, title in enumerate(headers_cat):
            hdr_cells[idx].text = title
            hdr_cells[idx].width = widths_cat[idx]
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'), '1B4D2E')
            hdr_cells[idx]._tc.get_or_add_tcPr().append(shd)
            for p in hdr_cells[idx].paragraphs:
                p.runs[0].font.name = "Segoe UI"
                p.runs[0].font.size = Pt(8.5)
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = RGBColor(255, 255, 255)

        for a in items_cat:
            r_cells = t_cat.add_row().cells
            r_cells[0].text = a["id"]
            r_cells[1].text = a["subsistema"]
            r_cells[2].text = f"{a['variable']}\n[{a['umbral']}]"
            r_cells[3].text = a["retardo"]
            r_cells[4].text = a["severidad"]
            r_cells[5].text = f"{a['descripcion']}\nAcción: {a['accion']}"

            is_crit = a["severidad"] == "Crítica"

            for idx, c in enumerate(r_cells):
                c.width = widths_cat[idx]
                for p in c.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Segoe UI"
                        r.font.size = Pt(8)
                        if idx == 0:
                            r.font.bold = True
                            r.font.name = "Consolas"
                        elif idx == 4:
                            r.font.bold = True
                            r.font.color.rgb = RGBColor(185, 28, 28) if is_crit else RGBColor(180, 83, 9)

        doc.add_paragraph()

    # 4.6. Catálogo de Fallas y Eventos Nativos de Hardware ATESS PCS250 (Enerclo OpenAPI)
    h_nat = doc.add_heading(level=2)
    r_hnat = h_nat.add_run("Catálogo Complementario: Fallas y Eventos Nativos de Hardware Inversores ATESS PCS250 (Enerclo OpenAPI)")
    r_hnat.font.name = "Segoe UI"
    r_hnat.font.color.rgb = RGBColor(15, 23, 42)

    p_nat = doc.add_paragraph()
    p_nat.add_run("Además de las 33 reglas de monitoreo SCADA calculadas dinámicamente en ThingsBoard, la plataforma integra la bitácora nativa de hardware proveniente de las tarjetas DSP de control de los 3 inversores centrales ATESS PCS250 (")
    p_nat.add_run("PCS-01 TQG0F12136, PCS-02 TQG0F12135, PCS-03 TQG0F12134").font.name = "Consolas"
    p_nat.add_run(") a través del endpoint ")
    p_nat.add_run("/api/v1/fault/list").font.name = "Consolas"
    p_nat.add_run(" de Enerclo OpenAPI. Los eventos activos no despejados en el hardware físico se elevan automáticamente a la vista de alarmas críticas/activas de la consola SCADA:")

    t_nat = doc.add_table(rows=1, cols=6)
    t_nat.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_nat.autofit = False

    headers_nat = ["Código (eventSn)", "Firmware (EN)", "Traducción Técnica (ES)", "Condición Física en Hardware", "Severidad", "Acción de Contingencia"]
    widths_nat = [Inches(1.1), Inches(1.3), Inches(1.4), Inches(1.5), Inches(0.9), Inches(1.6)]

    hdr_cells = t_nat.rows[0].cells
    for idx, title in enumerate(headers_nat):
        hdr_cells[idx].text = title
        hdr_cells[idx].width = widths_nat[idx]
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '1B4D2E')
        hdr_cells[idx]._tc.get_or_add_tcPr().append(shd)
        for p in hdr_cells[idx].paragraphs:
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(8.5)
            p.runs[0].font.bold = True
            p.runs[0].font.color.rgb = RGBColor(255, 255, 255)

    for flt in ATESS_HARDWARE_FAULTS_DATA:
        r_cells = t_nat.add_row().cells
        r_cells[0].text = flt["code"]
        r_cells[1].text = flt["raw_desc"]
        r_cells[2].text = flt["desc_es"]
        r_cells[3].text = flt["condicion"]
        r_cells[4].text = flt["severidad"]
        r_cells[5].text = flt["accion"]

        is_crit = flt["severidad"] == "Crítica"

        for idx, c in enumerate(r_cells):
            c.width = widths_nat[idx]
            for p in c.paragraphs:
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.name = "Segoe UI"
                    r.font.size = Pt(8)
                    if idx == 0:
                        r.font.bold = True
                        r.font.name = "Consolas"
                    elif idx == 1:
                        r.font.name = "Consolas"
                        r.font.color.rgb = c_code
                    elif idx == 2:
                        r.font.bold = True
                    elif idx == 4:
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(185, 28, 28) if is_crit else RGBColor(180, 83, 9)

    doc.add_paragraph()

    # 5. Sistema de Sonido y Web Audio API
    h5 = doc.add_heading(level=1)
    r_h5 = h5.add_run("5. Sistema de Alertas Acústicas SCADA (Web Audio API)")
    r_h5.font.name = "Segoe UI"
    r_h5.font.color.rgb = c_primary

    p5 = doc.add_paragraph()
    p5.add_run("La consola SCADA incorpora un sintetizador acústico en tiempo real basado en la ")
    p5.add_run("Web Audio API nativa del navegador").bold = True
    p5.add_run(", lo que elimina la necesidad de archivos de audio externos (.mp3/.wav), garantizando disponibilidad al 100% incluso en entornos aislados o dentro de contenedores Docker.\n\n")
    p5.add_run("• Tono de Falla Crítica: ").bold = True
    p5.add_run("Onda tipo diente de sierra (sawtooth) modulada en dos frecuencias industriales alternadas (880 Hz / 659 Hz) con 3 ráfagas de pulso sonoro.\n")
    p5.add_run("• Tono de Advertencia Preventiva: ").bold = True
    p5.add_run("Doble chime sinusoidal melódico (587 Hz / 880 Hz, Re5-La5) con decaimiento exponencial suave.\n")
    p5.add_run("• Tono de Reconocimiento (ACK): ").bold = True
    p5.add_run("Tono confirmatorio suave en onda triangular (554 Hz / 659 Hz) que certifica la atención de la alarma por el operador.\n")
    p5.add_run("• Controles de Operador: ").bold = True
    p5.add_run("Botón de silenciar/activar (🔊/🔇) con memoria en LocalStorage, auto-silenciamiento preventivo cada 20 segundos y botón interactivo 'Probar Sonido' en consola.")

    doc.save(WORD_PATH)
    print(f"Word generado exitosamente en: {WORD_PATH}")

if __name__ == "__main__":
    generar_excel()
    generar_word()
