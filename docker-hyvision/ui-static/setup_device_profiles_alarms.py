import urllib.request
import json
import uuid

print("[1/3] Autenticando con ThingsBoard...")
login_url = "http://localhost:8082/api/auth/login"
req = urllib.request.Request(
    login_url, 
    data=json.dumps({"username": "tenant@thingsboard.org", "password": "tenant"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]
headers = {"X-Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def make_numeric_condition(key, op, val):
    return {
        "condition": [
            {
                "key": {
                    "type": "TIME_SERIES",
                    "key": key
                },
                "valueType": "NUMERIC",
                "predicate": {
                    "type": "NUMERIC",
                    "operation": op,
                    "value": {
                        "defaultValue": val,
                        "userValue": None,
                        "dynamicValue": None
                    }
                }
            }
        ],
        "spec": {
            "type": "SIMPLE"
        }
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

# 1. Configurar Alarm Rules en Device Profile HYBRICO_MICROGRID
print("[2/3] Configurando Alarm Rules en Device Profile HYBRICO_MICROGRID (15 sitios telecom)...")
dp_telecom_id = "4c66ce10-c1a0-11f1-aed0-2d3b54e3e2bb"
req_dp = urllib.request.Request(f"http://localhost:8082/api/deviceProfile/{dp_telecom_id}", headers=headers)
dp_telecom = json.loads(urllib.request.urlopen(req_dp).read().decode("utf-8"))

telecom_alarms = [
    # Gateway Edge
    make_alarm("ALM-HNT-001 Controlador Edge Offline", "edge_offline_alarm", "EQUAL", 1.0, clear_op="EQUAL", clear_val=0.0, details="Pérdida de enlace con gateway Edge"),
    # Batería Telecom
    make_alarm("ALM-BAT-001 SOC Crítico Telecom", "battery_soc", "LESS", 15.0, clear_op="GREATER_OR_EQUAL", clear_val=20.0, warn_val=25.0, warn_op="LESS", details="SOC bajo en batería telecom (${battery_soc}%)"),
    make_alarm("ALM-BAT-003 Subtensión Bus DC 48V", "battery_voltage", "LESS", 47.0, clear_op="GREATER_OR_EQUAL", clear_val=48.5, warn_val=48.5, warn_op="LESS", details="Subtensión en bus DC (${battery_voltage}V)"),
    make_alarm("ALM-BAT-005 Sobretensión Bus DC 48V", "battery_voltage", "GREATER", 57.6, clear_op="LESS_OR_EQUAL", clear_val=56.0, details="Sobretensión en bus DC (${battery_voltage}V)"),
    make_alarm("ALM-BAT-006 Sobretemperatura Batería Telecom", "temp_bateria_max", "GREATER", 45.0, clear_op="LESS_OR_EQUAL", clear_val=40.0, warn_val=38.0, warn_op="GREATER", details="Temperatura elevada en batería (${temp_bateria_max}°C)"),
    make_alarm("ALM-BAT-009 Autonomía Restante Crítica", "battery_autonomy_hours", "LESS", 2.0, clear_op="GREATER_OR_EQUAL", clear_val=3.5, details="Autonomía de baterías crítica (${battery_autonomy_hours}h)"),
    # Cargas BTS
    make_alarm("ALM-LOD-001 Caída Carga Telecom / Apagado BTS", "load_power_kw", "LESS", 0.05, clear_op="GREATER_OR_EQUAL", clear_val=0.1, details="Carga de radiobase anormalmente baja (${load_power_kw} kW)"),
    # Generador Diésel
    make_alarm("ALM-GEN-001 Nivel Crítico Combustible Diésel", "generator_fuel_level", "LESS", 15.0, clear_op="GREATER_OR_EQUAL", clear_val=25.0, warn_val=25.0, warn_op="LESS", details="Nivel de combustible diésel bajo (${generator_fuel_level}%)"),
    # Red Comercial
    make_alarm("ALM-GRD-001 Corte de Suministro Red Comercial", "grid_available", "EQUAL", 0.0, clear_op="EQUAL", clear_val=1.0, details="Ausencia de suministro de red comercial")
]

if not dp_telecom.get("profileData"):
    dp_telecom["profileData"] = {}
dp_telecom["profileData"]["alarms"] = telecom_alarms

save_req_telecom = urllib.request.Request(
    "http://localhost:8082/api/deviceProfile",
    data=json.dumps(dp_telecom).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req_telecom) as resp:
    res_t = json.loads(resp.read().decode("utf-8"))
    print(f"-> HYBRICO_MICROGRID actualizado con {len(res_t.get('profileData',{}).get('alarms',[]))} reglas de alarma nativas.")

# 2. Configurar Alarm Rules en Device Profile BESS (GAORI)
print("[3/3] Configurando Alarm Rules en Device Profile BESS (GAORI)...")
dp_bess_id = "64a91750-be6a-11f1-a395-4fe608e17de1"
req_bess = urllib.request.Request(f"http://localhost:8082/api/deviceProfile/{dp_bess_id}", headers=headers)
dp_bess = json.loads(urllib.request.urlopen(req_bess).read().decode("utf-8"))

bess_alarms = [
    make_alarm("ALM-BMS-001 SOC Crítico BESS", "bess_soc", "LESS", 15.0, clear_op="GREATER_OR_EQUAL", clear_val=20.0, warn_val=25.0, warn_op="LESS", details="SOC en banco BESS (${bess_soc}%)"),
    make_alarm("ALM-BMS-003 Desbalance Celdas BESS", "delta_v_celdas_mv", "GREATER", 60.0, clear_op="LESS_OR_EQUAL", clear_val=40.0, warn_val=30.0, warn_op="GREATER", details="Delta voltaje entre celdas (${delta_v_celdas_mv} mV)"),
    make_alarm("ALM-BMS-005 Sobretemperatura Baterías BESS", "temp_bateria_max", "GREATER", 45.0, clear_op="LESS_OR_EQUAL", clear_val=40.0, warn_val=38.0, warn_op="GREATER", details="Temperatura de racks BESS (${temp_bateria_max}°C)"),
    make_alarm("ALM-PCS-001 Sobretemperatura IGBTs PCS", "temp_igbt_max", "GREATER", 75.0, clear_op="LESS_OR_EQUAL", clear_val=68.0, warn_val=65.0, warn_op="GREATER", details="Temperatura en módulo IGBT (${temp_igbt_max}°C)"),
    make_alarm("ALM-GRD-001 Desviación Frecuencia AC", "frecuencia_red_hz", "LESS", 59.5, clear_op="GREATER_OR_EQUAL", clear_val=59.7, details="Frecuencia AC fuera de rango nominal (${frecuencia_red_hz} Hz)")
]

if not dp_bess.get("profileData"):
    dp_bess["profileData"] = {}
dp_bess["profileData"]["alarms"] = bess_alarms

save_req_bess = urllib.request.Request(
    "http://localhost:8082/api/deviceProfile",
    data=json.dumps(dp_bess).encode("utf-8"),
    headers=headers,
    method="POST"
)
with urllib.request.urlopen(save_req_bess) as resp:
    res_b = json.loads(resp.read().decode("utf-8"))
    print(f"-> BESS actualizado con {len(res_b.get('profileData',{}).get('alarms',[]))} reglas de alarma nativas.")

print(">>> CONFIGURACIÓN DE DEVICE PROFILES COMPLETADA EXITOSAMENTE <<<")
