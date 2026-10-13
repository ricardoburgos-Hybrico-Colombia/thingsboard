import requests
import json
from datetime import datetime, timezone, timedelta
import sys

sys.stdout.reconfigure(encoding='utf-8')

STELLAR_BASE_URL = "https://api.stellar.newsunroad.com/api/v0"
STELLAR_TOKEN    = "64a5a683dc7754dbdfa8f16a55bf5a766db304cf2dbc810144674c3d303f1c51"
STELLAR_HEADERS  = {
    "Authorization": f"Token {STELLAR_TOKEN}",
    "Accept": "application/json"
}

with open("c:/Users/PC/Documents/AI_Engineer/20.LEER_DATA_API_ENERCLO/sitios_provisionados_thingsboard.json", "r", encoding="utf-8") as f:
    sites = json.load(f)

now = datetime.now(timezone.utc)
start_time = (now - timedelta(minutes=180)).strftime("%Y-%m-%dT%H:%M:%SZ") # last 3 hours
end_time = now.strftime("%Y-%m-%dT%H:%M:%SZ")

STELLAR_PARAMS = (
    "loadPower,acLoadPower,dcLoadPower,loadEnergy,"
    "solarChargerPower,solarPower,solarEnergy,solarChargerEnergy,"
    "inverterArrayPower,inverterPower,inverterEnergy,inverterVoltage,inverterCurrent,inverterFrequency,"
    "generatorRuntime,generatorPower,generatorEnergy,generatorFuelLevel,generatorStarts,"
    "gridPower,gridEnergy,gridVoltage,gridFrequency,"
    "batteryStateOfCharge,batteryStateOfChargeMin,batteryStateOfChargeMax,batteryStateOfHealth,"
    "batteryVoltage,batteryCurrent,batteryPower,batteryTemperature,batteryEnergy,batteryChargeEnergy,batteryDischargeEnergy,batteryCycles,"
    "rectifierPower,rectifierEnergy,rectifierVoltage,rectifierCurrent,"
    "ambientTemperature,ambientHumidity,systemState,edgeOfflineAlarm"
)

print(f"AUDITORIA EXHAUSTIVA DE TELEMETRIA STELLAR (NSR) - {len(sites)} SITIOS")
print(f"Rango analizado: {start_time} hasta {end_time}")
print("=" * 100)

summary_report = []

for s in sites:
    alias = s["nombre_alias"]
    ps_id = s["ps_id"]
    params = {
        "params": STELLAR_PARAMS,
        "start": start_time,
        "end": end_time,
        "binDuration": "1-min"
    }
    try:
        r = requests.get(f"{STELLAR_BASE_URL}/ts/{ps_id}", headers=STELLAR_HEADERS, params=params, timeout=15)
        if r.status_code != 200:
            print(f"[!] {alias} ({ps_id}) -> HTTP Error: {r.status_code}")
            continue
        data = r.json().get("data", [])
        if not data:
            print(f"[!] {alias} ({ps_id}) -> Sin data")
            continue
        ts = data[0].get("timeSeries", [])
        if not ts:
            print(f"[!] {alias} ({ps_id}) -> timeSeries vacio")
            continue

        # Analizar puntos
        total_pts = len(ts)
        neg_load_pts = []
        zero_load_pts = []
        neg_grid_pts = []
        neg_solar_pts = []
        bat_volts = []
        bat_currs = []
        load_powers = []
        solar_powers = []
        rect_powers = []
        grid_powers = []

        for pt in ts:
            lp = pt.get("loadPower")
            if lp is not None:
                lp_f = float(lp)
                load_powers.append(lp_f)
                if lp_f < -0.001:
                    neg_load_pts.append((pt.get("time"), lp_f, pt.get("solarChargerPower"), pt.get("batteryPower")))
                elif abs(lp_f) < 0.005:
                    zero_load_pts.append((pt.get("time"), lp_f))
            
            gp = pt.get("gridPower")
            if gp is not None and float(gp) < -0.001:
                neg_grid_pts.append((pt.get("time"), float(gp)))

            sp = pt.get("solarChargerPower") or pt.get("solarPower")
            if sp is not None and float(sp) < -0.001:
                neg_solar_pts.append((pt.get("time"), float(sp)))

            bv = pt.get("batteryVoltage")
            if bv is not None:
                bat_volts.append(float(bv))

            bi = pt.get("batteryCurrent")
            if bi is not None:
                bat_currs.append(float(bi))

            rp = pt.get("rectifierPower")
            if rp is not None:
                rect_powers.append(float(rp))

        last_pt = ts[-1]
        last_lp = last_pt.get("loadPower")
        last_sp = last_pt.get("solarChargerPower") or last_pt.get("solarPower")
        last_bv = last_pt.get("batteryVoltage")
        last_bi = last_pt.get("batteryCurrent")
        last_rp = last_pt.get("rectifierPower")
        last_gp = last_pt.get("gridPower")

        print(f"\nSITIO: {alias} | ID: {ps_id} | Total puntos: {total_pts}")
        print(f"  Último punto ({last_pt.get('time')}):")
        print(f"    Load: {last_lp} kW | Solar: {last_sp} kW | Vbat: {last_bv} V | Ibat: {last_bi} A | Rect: {last_rp} kW | Grid: {last_gp} kW")
        
        anomalies = []
        if neg_load_pts:
            anomalies.append(f"CARGA NEGATIVA ({len(neg_load_pts)}/{total_pts} pts, min={min(x[1] for x in neg_load_pts):.3f} kW)")
        if zero_load_pts and len(zero_load_pts) > total_pts * 0.5:
            anomalies.append(f"CARGA CASI NULA O CERO ({len(zero_load_pts)}/{total_pts} pts)")
        if neg_grid_pts:
            anomalies.append(f"GRID NEGATIVA ({len(neg_grid_pts)} pts)")
        if neg_solar_pts:
            anomalies.append(f"SOLAR NEGATIVA ({len(neg_solar_pts)} pts)")

        if anomalies:
            print(f"  ⚠️ ANOMALÍAS DETECTADAS: {', '.join(anomalies)}")
            if neg_load_pts:
                print(f"     Muestra carga negativa: t={neg_load_pts[0][0]}, load={neg_load_pts[0][1]} kW, solar={neg_load_pts[0][2]} kW, pbat={neg_load_pts[0][3]} kW")
        else:
            print(f"  ✅ DATOS CONSISTENTES (Sin negativos)")

    except Exception as e:
        print(f"[!] Error procesando {alias}: {e}")

print("\n" + "=" * 100)
print("AUDITORÍA STELLAR FINALIZADA.")
