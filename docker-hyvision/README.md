# HyVision - Infraestructura de Datos con Docker

Esta carpeta contiene la configuración oficial de Docker para desplegar **HyVision**, la plataforma de monitoreo de energía solar para Hybrico.

## Componentes del Stack

1. **`hyvision-timescaledb`**: Base de datos PostgreSQL 16 con motor hiper-escalable **TimescaleDB** para almacenar telemetría de inversores y plantas solares con compresión nativa del 90-95%.
2. **`hyvision-app`**: Núcleo de ThingsBoard versión **4.3 LTS** bajo licencia **Apache 2.0** (capacidad ilimitada de dispositivos a costo cero).
3. **Persistencia Total**: Volúmenes nombrados de Docker (`hyvision_timescaledb_data`, `hyvision_app_data`, `hyvision_app_logs`) que aseguran que los datos nunca se pierdan al reiniciar o actualizar.

---

## 🚀 Despliegue en 1 Solo Paso

### En Windows (PowerShell) o Linux (Ubuntu Server)
Ubícate en esta carpeta y ejecuta:

```bash
cd docker-hyvision
cp .env.example .env   # primera vez
docker compose up -d
```

### Primera instalación (esquema ThingsBoard en PostgreSQL)

Si la UI responde **502** o la base está vacía, inicializa el esquema **una sola vez** (no repetir en actualizaciones):

```bash
docker compose up -d hyvision-db
docker compose run --no-deps --rm -e INSTALL_TB=true -e LOAD_DEMO=true hyvision-app
docker compose up -d
```

### Desarrollo en VPS (rama `develop`, paralelo a producción)

| | Producción | Desarrollo |
|---|------------|------------|
| Ruta | `/opt/hyvision-prod` | `/opt/hyvision-dev` |
| Rama Git | `main` | `develop` |
| HTTP | `8082` (`.env.example`) | `8083` (`.env.dev.example`) |
| Contenedores | `hyvision-*` | `hyvision-dev-*` |

```bash
sudo mkdir -p /opt/hyvision-dev && sudo chown "$USER:$USER" /opt/hyvision-dev
git clone -b develop git@github.com:ricardoburgos-Hybrico-Colombia/thingsboard.git /opt/hyvision-dev
cd /opt/hyvision-dev/docker-hyvision
cp .env.dev.example .env
# Editar POSTGRES_PASSWORD si hace falta
docker compose up -d hyvision-db
docker compose run --no-deps --rm -e INSTALL_TB=true -e LOAD_DEMO=true hyvision-app
docker compose up -d
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8083
```

Abre **TCP 8083** en el firewall del panel (Hostinger), igual que hiciste con 8082.  
Prod existente **no requiere** cambiar `.env` al hacer `git pull` si mantienes los defaults de `HYVISION_STACK=hyvision`.

> **Nota para tu máquina actual en Windows:**
> Si ya tienes contenedores previos usando los puertos `8080` o `1883`, puedes detenerlos primero con:
> ```powershell
> docker stop thingsboard-thingsboard-ce-1 thingsboard-postgres-1
> ```
> O cambiar temporalmente el puerto `HYVISION_HTTP_PORT=8082` en el archivo `.env`.

---

## 🌐 Acceso a la Plataforma

Una vez levantados los contenedores:
* **URL:** `http://localhost:8080` (o `http://IP_DE_TU_SERVIDOR:8080` en Ubuntu)
* **Credenciales por defecto:**
  * **Email:** `sysadmin@thingsboard.org`
  * **Contraseña:** `sysadmin`
  * *(El sistema te pedirá cambiarla en el primer inicio de sesión)*.

---

## 🛠️ Comandos de Operación Habituales

* **Ver estado y consumo de recursos:**
  ```bash
  docker compose ps
  docker stats hyvision-app hyvision-timescaledb   # o hyvision-dev-app en dev
  ```
* **Ver logs en tiempo real:**
  ```bash
  docker compose logs -f hyvision-app
  ```
* **Detener los servicios (sin perder datos):**
  ```bash
  docker compose stop
  ```
* **Reiniciar los servicios:**
  ```bash
  docker compose restart
  ```
* **Hacer un respaldo (Backup) de la base de datos en 1 línea:**
  ```bash
  docker exec -t hyvision-timescaledb pg_dump -U hyvision -d hyvision -Fc > hyvision_backup_$(date +%Y%m%d).dump
  ```
