# -*- coding: utf-8 -*-
"""
setup_modular_device_profiles.py
================================================================================
Implementación y Aprovisionamiento de Perfiles de Dispositivos por Topología en ThingsBoard.
Crea los 4 perfiles modulares industriales y reasigna los 15 sitios según su hardware real:
1. HYBRICO_TELCO_HIBRIDO (4 fuentes: Solar + Red + DG + BESS)
2. HYBRICO_TELCO_OFFGRID (100% Solar + BESS)
3. HYBRICO_TELCO_ONGRID  (Red + Solar + BESS)
4. HYBRICO_TELCO_BACKUP_DG (Red + DG sin Solar)
================================================================================
"""

import urllib.request
import json
import uuid
import sys

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

TB_HOST = "http://localhost:8082"
TB_USER = "tenant@thingsboard.org"
TB_PASS = "tenant"

print("[1/4] Autenticando con ThingsBoard...")
login_url = f"{TB_HOST}/api/auth/login"
req = urllib.request.Request(
    login_url,
    data=json.dumps({"username": TB_USER, "password": TB_PASS}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]
headers = {"X-Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ── FUNCIONES AUXILIARES PARA DEFINICIÓN DE ALARMAS NATIVAS ──────────────────
def make_numeric_condition(key, op, val):
    return {
        "condition": [
            {
                "key": {"type": "TIME_SERIES", "key": key},
                "valueType": "NUMERIC",
                "predicate": {
                    "type": "NUMERIC",
                    "operation": op,
                    "value": {"defaultValue": val, "userValue": None, "dynamicValue": None}
                }
            }
        ],
        "spec": {"type": "SIMPLE"}
    }

def make_alarm(alarm_type, crit_key, crit_op, crit_val, clear_op=None, clear_val=None, warn_val=None, warn_op=None, details=None):
    create_rules = {}
    if crit_val is not None:
        create_rules["CRITICAL"] = {
            "condition": make_numeric_condition(crit_key, crit_op, crit_val),
            "schedule": None,
            "additionalInfo": None,
            "alarmDetails": details or f"{alarm_type} detectada (${{{crit_key}}})"
        }
    if warn_val is not None:
        create_rules["WARNING"] = {
            "condition": make_numeric_condition(crit_key, warn_op or crit_op, warn_val),
            "schedule": None,
            "additionalInfo": None,
            "alarmDetails": details or f"{alarm_type} preventiva (${{{crit_key}}})"
        }
        
    clear_rule = None
    if clear_op is not None and clear_val is not None:
        clear_rule = {
            "condition": make_numeric_condition(crit_key, clear_op, clear_val),
            "schedule": None,
            "additionalInfo": None,
            "alarmDetails": f"{alarm_type} despejada"
        }
        
    return {
        "id": str(uuid.uuid4()),
        "alarmType": alarm_type,
        "createRules": create_rules,
        "clearRule": clear_rule,
        "propagate": False,
        "propagateToOwner": False,
        "propagateToTenant": False,
        "propagateRelationTypes": []
    }

# ── DEFINICIÓN DE BLOQUES DE ALARMAS SEGÚN HARDWARE ─────────────────────────
# A) Bloque Común Telecom (Baterías 48V, Gateway y Carga BTS)
COMMON_TELECOM_ALARMS = [
    make_alarm("ALM-HNT-001 Controlador Edge Offline", "edge_offline_alarm", "EQUAL", 1.0, clear_op="EQUAL", clear_val=0.0, details="Pérdida de enlace con gateway Edge"),
    make_alarm("ALM-HNT-003 BMS / LVD Local Batería Baja", "battery_low_alarm", "EQUAL", 1.0, clear_op="EQUAL", clear_val=0.0, details="Señal física de pre-desconexión LVD"),
    make_alarm("ALM-BAT-001 SOC Crítico Telecom", "battery_soc", "LESS", 15.0, clear_op="GREATER_OR_EQUAL", clear_val=20.0, warn_val=25.0, warn_op="LESS", details="SOC bajo en batería telecom (${battery_soc}%)"),
    make_alarm("ALM-BAT-003 Subtensión Bus DC 48V", "battery_voltage", "LESS", 47.0, clear_op="GREATER_OR_EQUAL", clear_val=48.5, warn_val=48.5, warn_op="LESS", details="Subtensión en bus DC (${battery_voltage}V)"),
    make_alarm("ALM-BAT-005 Sobretensión Bus DC 48V", "battery_voltage", "GREATER", 57.6, clear_op="LESS_OR_EQUAL", clear_val=56.0, details="Sobretensión en bus DC (${battery_voltage}V)"),
    make_alarm("ALM-BAT-006 Sobretemperatura Batería Telecom", "temp_bateria_max", "GREATER", 45.0, clear_op="LESS_OR_EQUAL", clear_val=40.0, warn_val=38.0, warn_op="GREATER", details="Temperatura elevada en batería (${temp_bateria_max}°C)"),
    make_alarm("ALM-LOD-001 Caída Carga Telecom / Apagado BTS", "load_power_kw", "LESS", 0.05, clear_op="GREATER_OR_EQUAL", clear_val=0.1, details="Carga de radiobase anormalmente baja (${load_power_kw} kW)")
]

ALM_GRID = make_alarm("ALM-GRD-001 Corte de Suministro Red Comercial", "grid_available", "EQUAL", 0.0, clear_op="EQUAL", clear_val=1.0, details="Ausencia de suministro de red comercial")
ALM_GEN_FUEL = make_alarm("ALM-GEN-001 Nivel Crítico Combustible Diésel", "generator_fuel_level", "LESS", 15.0, clear_op="GREATER_OR_EQUAL", clear_val=25.0, warn_val=25.0, warn_op="LESS", details="Nivel de combustible diésel bajo (${generator_fuel_level}%)")

# Ensamblado de matrices por arquetipo:
PROFILES_DEFINITION = {
    "HYBRICO_TELCO_HIBRIDO": {
        "description": "Perfil SCADA Telecom - Microrred Híbrida Multifuente (Solar + Red + Diésel + Batería 48V)",
        "alarms": COMMON_TELECOM_ALARMS + [ALM_GRID, ALM_GEN_FUEL]
    },
    "HYBRICO_TELCO_OFFGRID": {
        "description": "Perfil SCADA Telecom - Microrred Aislada 100% Solar Fotovoltaica + Banco Baterías 48V",
        "alarms": COMMON_TELECOM_ALARMS # Excluye Red y Diésel
    },
    "HYBRICO_TELCO_ONGRID": {
        "description": "Perfil SCADA Telecom - Conexión a Red Comercial con Soporte Solar y Banco Baterías 48V",
        "alarms": COMMON_TELECOM_ALARMS + [ALM_GRID] # Excluye Diésel
    },
    "HYBRICO_TELCO_BACKUP_DG": {
        "description": "Perfil SCADA Telecom - Respaldo Dual Red Comercial y Motogenerador Diésel (Sin Solar)",
        "alarms": COMMON_TELECOM_ALARMS + [ALM_GRID, ALM_GEN_FUEL] # Excluye Solar
    }
}

# ── MAPEO DE LOS 15 SITIOS A SUS RESPECTIVOS ARQUETIPOS ──────────────────────
SITES_TOPOLOGY_MAP = {
    # 1. Híbridos Multifuente (Grid + DG + Solar + BESS)
    "ARENAL - HN794": "HYBRICO_TELCO_HIBRIDO",
    "AGUA CALIENTE - HN801": "HYBRICO_TELCO_HIBRIDO",
    "CAMPO LIMONES LOS ENCUENTROS - HN493": "HYBRICO_TELCO_HIBRIDO",
    "CAMALOTE - HN2013": "HYBRICO_TELCO_HIBRIDO",
    
    # 2. Aislados 100% Solar (Solar + BESS)
    "PALACIOS": "HYBRICO_TELCO_OFFGRID",
    "CUN7016": "HYBRICO_TELCO_OFFGRID",
    "ANT7086": "HYBRICO_TELCO_OFFGRID",
    "CHO7151": "HYBRICO_TELCO_OFFGRID",
    "BOY7014": "HYBRICO_TELCO_OFFGRID",
    
    # 3. Conectados a Red con Solar (Grid + Solar + BESS)
    "WEST_END_II": "HYBRICO_TELCO_ONGRID",
    "DIXON_HILL": "HYBRICO_TELCO_ONGRID",
    "WEST_BAY": "HYBRICO_TELCO_ONGRID",
    "FRENCH_HARBOR_ESTE": "HYBRICO_TELCO_ONGRID",
    "BUENOS AIRES II SPS - HN682": "HYBRICO_TELCO_ONGRID",
    "COR9007": "HYBRICO_TELCO_ONGRID"
}

print("[2/4] Consultando perfiles existentes y obteniendo plantilla base...")
req_get_profiles = urllib.request.Request(f"{TB_HOST}/api/deviceProfiles?pageSize=50&page=0", headers=headers)
with urllib.request.urlopen(req_get_profiles) as resp:
    existing_profiles = {p["name"]: p for p in json.loads(resp.read().decode("utf-8")).get("data", [])}

# Tomar perfil base de referencia (para ruleChainId, dashboardId, configuraciones de transporte)
base_ref = existing_profiles.get("HYBRICO_MICROGRID") or existing_profiles.get("default")
rule_chain_id = base_ref.get("defaultRuleChainId")
dashboard_id = base_ref.get("defaultDashboardId")

created_profiles = {}

print("[3/4] Creando / actualizando los 4 Device Profiles modulares...")
for prof_name, conf in PROFILES_DEFINITION.items():
    existing_p = existing_profiles.get(prof_name)
    
    profile_payload = {
        "name": prof_name,
        "type": "DEFAULT",
        "transportType": "DEFAULT",
        "provisionType": "DISABLED",
        "description": conf["description"],
        "defaultRuleChainId": rule_chain_id,
        "defaultDashboardId": dashboard_id,
        "profileData": {
            "configuration": {"type": "DEFAULT"},
            "transportConfiguration": {"type": "DEFAULT"},
            "provisionConfiguration": {"type": "DISABLED"},
            "alarms": conf["alarms"]
        }
    }
    
    if existing_p:
        profile_payload["id"] = existing_p["id"]
        profile_payload["createdTime"] = existing_p.get("createdTime")
        action_verb = "Actualizando"
    else:
        action_verb = "Creando"
        
    save_req = urllib.request.Request(
        f"{TB_HOST}/api/deviceProfile",
        data=json.dumps(profile_payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(save_req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        p_id = res["id"]["id"]
        created_profiles[prof_name] = p_id
        num_alarms = len(res.get("profileData", {}).get("alarms", []))
        print(f"  -> {action_verb} '{prof_name}' (ID: {p_id}) con {num_alarms} reglas nativas.")

print("[4/4] Asignando los 15 sitios Telecom a sus nuevos perfiles correspondientes...")
req_get_devs = urllib.request.Request(f"{TB_HOST}/api/tenant/devices?pageSize=100&page=0", headers=headers)
with urllib.request.urlopen(req_get_devs) as resp:
    devices = json.loads(resp.read().decode("utf-8")).get("data", [])

assigned_count = 0
for dev in devices:
    d_name = dev["name"]
    target_profile_name = SITES_TOPOLOGY_MAP.get(d_name)
    if target_profile_name and target_profile_name in created_profiles:
        target_profile_id = created_profiles[target_profile_name]
        dev["deviceProfileId"] = {"entityType": "DEVICE_PROFILE", "id": target_profile_id}
        dev["type"] = target_profile_name
        
        save_dev_req = urllib.request.Request(
            f"{TB_HOST}/api/device",
            data=json.dumps(dev).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(save_dev_req) as resp_d:
            assigned_count += 1
            print(f"  [OK] {d_name:36} => {target_profile_name}")

print(f"\n>>> INTEGRACIÓN COMPLETADA: {assigned_count} sitios telecom asignados a sus perfiles dedicados. <<<")
