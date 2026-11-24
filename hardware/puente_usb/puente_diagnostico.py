"""Puente para un Mega SPING. Ejecutar desde una consola en el PC del lector."""
import argparse
import getpass
from http.client import HTTPException
import json
import math
import os
from pathlib import Path
import queue
import re
import sqlite3
import statistics
import sys
import threading
import time
import uuid
from urllib import error, request
from urllib.parse import urlsplit
import serial
from serial.tools import list_ports

UID = re.compile(r'(?:[A-F0-9]{8}|[A-F0-9]{14}|[A-F0-9]{20})')
MOTIVOS = {
    'OCUPADO': 'Equipo ocupado. Usa el modo banco con los servos sin pulsos.',
    'SIN_LECTOR': 'El Mega no obtiene respuesta del RC522.',
    'TIEMPO_AGOTADO': 'Acerca y retira una tarjeta dentro de los 15 segundos.',
    'LECTURA_INVALIDA': 'Lectura ambigua. Utiliza una sola tarjeta.',
    'REVISION': 'El equipo requiere revisión local.',
}


def positivo(n):
    return type(n) is int and 1 <= n <= 0xffffffff


def datos_credito(e):
    """Validar señales físicas y las tres medianas del último intento."""
    if (e.get('evento') != 'ciclo' or e.get('version') != 3 or
        e.get('estado') != 'COMPLETO' or not UID.fullmatch(str(e.get('uid'))) or
        not positivo(e.get('sesion')) or not positivo(e.get('ciclo_local')) or
        not positivo(e.get('distancia_cm')) or type(e.get('destino')) is not int or
        e['destino'] not in (0, 2) or type(e.get('pulsos_ir')) is not int or e['pulsos_ir'] != 1 or
        any(e.get(k) is not True for k in ('selector_confirmado', 'caida_confirmada','cierre_confirmado'))):
        return None
    medidas = e.get('mediciones')
    if not isinstance(medidas, list) or len(medidas) not in (3, 6):
        return None
    intento = len(medidas) // 3
    medianas = []
    for punto, m in enumerate(medidas[-3:], 1):
        if not isinstance(m, dict) or m.get('intento') != intento or m.get('punto') != punto or m.get('contacto') is not True:
            return None
        adc = m.get('adc')
        if not isinstance(adc, list) or len(adc) != 15 or any(type(v) is not int or not 0 <= v <= 1023 for v in adc):
            return None
        mediana = statistics.median(adc)
        dispersion = max(adc) - min(adc)
        if m.get('mediana_adc') != mediana or m.get('dispersion_adc') != dispersion or dispersion > 25:
            return None
        if not (932 <= mediana <= 1018 if e['destino'] == 0 else mediana <= 929):
            return None
        medianas.append(mediana)
    # Índice relativo para el campo 0–100 de la web. Los ADC originales quedan en SQLite.
    indice = round(100 * (1023 - statistics.median(medianas)) / 1023)
    seco = e['destino'] == 0
    return {'uid': e['uid'], 'tipoResiduo': 'SECO' if seco else 'HUMEDO',
            'direccionMotor': 'IZQUIERDA' if seco else 'DERECHA',
            'humedad': indice, 'distancia': e['distancia_cm']}


def abrir_db(path):
    db = sqlite3.connect(path, timeout=6)
    db.execute('pragma journal_mode=WAL')
    db.execute('''create table if not exists eventos (
        id text primary key, original text not null, datos text, estado text not null,
        proximo real default 0, intentos integer default 0, detalle text default '')''')
    return db


def guardar(db, equipo, e):
    if not positivo(e.get('sesion')) or not positivo(e.get('ciclo_local')):
        return None
    clave = str(uuid.uuid5(uuid.NAMESPACE_URL, f'sping:{equipo}:{e["sesion"]}:{e["ciclo_local"]}'))
    datos = datos_credito(e)
    raw = json.dumps(e, sort_keys=True, separators=(',', ':'))
    with db:
        db.execute('insert or ignore into eventos(id,original,datos,estado) values(?,?,?,?)',
                   (clave, raw, json.dumps(datos) if datos else None, 'pendiente' if datos else 'telemetria'))
        previo = db.execute('select original from eventos where id=?', (clave,)).fetchone()[0]
        if previo != raw:
            raise ValueError('Colisión de sesión/ciclo. Revisa la identidad de la placa.')
    return clave


class SinRedireccion(request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class API:
    def __init__(self, url, key):
        self.url = url.rstrip('/')
        self.key = key
        self.http = request.build_opener(SinRedireccion)

    def post(self, ruta, datos, evento=None):
        cab = {'Content-Type': 'application/json', 'x-sping-device-key': self.key}
        if evento:
            cab['x-idempotency-key'] = evento
        req = request.Request(self.url + ruta, json.dumps(datos).encode(), cab)
        try:
            with self.http.open(req, timeout=4) as r:
                return r.status, json.load(r)
        except error.HTTPError as ex:
            try:
                info = json.load(ex)
            except (ValueError, OSError):
                info = {}
            return ex.code, info if isinstance(info, dict) else {}
        except (OSError, ValueError, EOFError, HTTPException):
            return 0, {}


def abono_confirmado(respuesta, campo):
    if not isinstance(respuesta, dict) or respuesta.get('exitoso') is not True:
        return False

    # Evento nuevo: la RPC informa los puntos sumados en esta operación.
    v = respuesta.get(campo)
    if type(v) in (int, float) and math.isfinite(v) and v > 0:
        return True

    # Reintento idempotente: la primera petición pudo confirmar en SQL pero
    # perder su respuesta HTTP. La RPC devuelve puntos_sumados=0 en el
    # duplicado, pero la clasificación original conserva puntos_obtenidos.
    if respuesta.get('duplicado') is True:
        clasificacion = respuesta.get('clasificacion')
        if isinstance(clasificacion, dict):
            otorgados = clasificacion.get('puntos_obtenidos')
            return (
                type(otorgados) in (int, float)
                and math.isfinite(otorgados)
                and otorgados > 0
            )

    return False


def enviar_creditos(path, api, campo, avisos, terminar, despertar):
    db = abrir_db(path)
    try:
        while not terminar.is_set():
            fila = db.execute("select id,datos,original,intentos from eventos where estado='pendiente' and proximo<=? order by rowid limit 1",
                              (time.time(),)).fetchone()
            if not fila:
                despertar.wait(.2)
                despertar.clear()
                continue
            clave, datos, raw, intentos = fila
            status, respuesta = api.post('/api/clasificaciones', json.loads(datos), clave)
            if 200 <= status < 300 and isinstance(respuesta, dict) and respuesta.get('exitoso') is True:
                e = json.loads(raw)
                if abono_confirmado(respuesta, campo):
                    nuevo = 'abonado'
                    avisos.put(('credito', (e['sesion'], e['ciclo_local'])))
                else:
                    nuevo = 'registrado_sin_confirmacion_de_puntos'
                detalle = json.dumps(respuesta, ensure_ascii=False)[:1800]
            elif status == 0 or status >= 500 or status in (401, 408, 429):
                nuevo, detalle = 'pendiente', f'Reintento HTTP {status}'
            else:
                nuevo, detalle = 'rechazado', str(respuesta.get('error', status))
            with db:
                db.execute('update eventos set estado=?,detalle=?,intentos=?,proximo=? where id=?',
                           (nuevo, detalle, intentos+1, time.time()+min(60, 2**min(intentos+1,6)), clave))
            print(f'Ciclo {clave} · {nuevo} · HTTP {status}', flush=True)
            if nuevo == 'registrado_sin_confirmacion_de_puntos':
                campos = [k for k,v in respuesta.items() if type(v) in (int,float)]
                print('Consulta el saldo en el dashboard. Campos numéricos devueltos:', ', '.join(campos) or 'ninguno', flush=True)
    finally:
        db.close()


def trabajar_activacion(api, tareas, avisos, terminar):
    while not terminar.is_set():
        try:
            accion, token, extra = tareas.get(timeout=.25)
        except queue.Empty:
            continue
        datos = {'accion': accion, 'solicitud': token, **extra}
        for intento in range(4):
            status, info = api.post('/api/rfid/activacion', datos)
            if (status and status < 500 and status not in (408,429)) or accion != 'completar':
                break
            if terminar.wait(min(2**intento, 5)):
                return
        avisos.put(('web', (accion, token, status, info)))


def diagnosticar(puerto):
    # El Mega puede reiniciar al abrir el puerto. Un intercambio JSON prueba ambos sentidos.
    fin = time.monotonic()+9
    proximo = 0
    parcial = bytearray()
    while time.monotonic() < fin:
        if time.monotonic() >= proximo:
            puerto.write(b'ENLACE\n')
            proximo = time.monotonic()+1.1
        parcial.extend(puerto.read_until(b'\n', 4096))
        if len(parcial)>8192:
            parcial.clear()
        if parcial.endswith(b'\n'):
            try:
                e = json.loads(parcial)
            except (ValueError, UnicodeError):
                e = {}
            parcial.clear()
            if isinstance(e, dict) and e.get('evento') == 'enlace_usb' and e.get('version') == 1:
                print(f"USB verificado · modo {e['modo']} · sesión {e['sesion']} · RC522 0x{e['rc522']:02X}", flush=True)
                return e
    raise RuntimeError('Sin respuesta ENLACE. Comprueba firmware, puerto y cable USB de datos.')


def consola(avisos):
    try:
        for linea in sys.stdin:
            avisos.put(('teclado', linea.strip()))
    except OSError:
        return


def ejecutar(puerto, enlace, args, api, dbpath):
    db = abrir_db(dbpath)
    avisos, tareas = queue.Queue(), queue.Queue()
    terminar, despertar = threading.Event(), threading.Event()
    workers = [
        threading.Thread(target=enviar_creditos, args=(dbpath,api,args.campo_puntos,avisos,terminar,despertar), daemon=True),
        threading.Thread(target=trabajar_activacion, args=(api,tareas,avisos,terminar), daemon=True),
    ]
    for w in workers:
        w.start()
    threading.Thread(target=consola, args=(avisos,), daemon=True).start()
    print('Comandos locales: ESTADO, PERFIL, ENLACE, BANCO, AUTO, VINCULAR <código>, SALIR.', flush=True)
    activo, plazo = None, 0
    sesion = enlace['sesion']
    reciente = {}
    buffer = bytearray()
    descartar = False

    def enviar(cmd):
        puerto.write((cmd+'\n').encode('ascii'))

    try:
        while True:
            if activo and time.monotonic()>plazo:
                tareas.put(('fallar',activo,{'motivo':'El equipo no confirmó la lectura a tiempo.'}))
                activo = None
            while not avisos.empty():
                tipo, valor = avisos.get()
                if tipo == 'credito':
                    if valor[0]==sesion and time.monotonic()-reciente.get(valor,-100)<5:
                        enviar(f'CREDITO {valor[0]} {valor[1]}')
                elif tipo == 'web':
                    accion, token, status, info = valor
                    if not isinstance(info, dict):
                        info = {}
                    ok = 200<=status<300
                    print(accion, info.get('mensaje') or info.get('fase') or info.get('error') or f'HTTP {status}', flush=True)
                    if accion=='abrir' and activo==token:
                        if ok and info.get('fase')=='LEYENDO':
                            enviar('VINCULAR '+token)
                            plazo = time.monotonic()+21
                        else:
                            activo = None
                elif tipo == 'teclado':
                    partes = valor.split()
                    if not partes:
                        continue
                    cmd = partes[0].upper()
                    if cmd=='SALIR':
                        return
                    if cmd=='VINCULAR' and len(partes)==2 and not activo:
                        try:
                            token = str(uuid.UUID(partes[1]))
                        except ValueError:
                            print('Código inválido. Copia el comando completo del dashboard.')
                            continue
                        activo, plazo = token, time.monotonic()+12
                        tareas.put(('abrir', token, {}))
                    elif len(partes)==1 and cmd in ('ESTADO','PERFIL','ENLACE','AUTO','BANCO') and not activo:
                        enviar(cmd)
                    else:
                        print('Comando no disponible.')
            trozo = puerto.read(puerto.in_waiting or 1)
            if not trozo:
                continue
            buffer.extend(trozo)
            while b'\n' in buffer:
                linea, _, resto = buffer.partition(b'\n')
                buffer = bytearray(resto)
                if descartar or len(linea)>8192:
                    descartar = False
                    continue
                if linea.startswith(b'#'):
                    print(linea.decode(errors='replace').strip(), flush=True)
                    if linea.startswith(b'# SPING 3'):
                        if activo:
                            tareas.put(('fallar',activo,{'motivo':'El Mega se reinició durante la lectura.'}))
                            activo = None
                        reciente.clear()
                        enviar('ENLACE')
                    continue
                try:
                    e = json.loads(linea)
                except (ValueError, UnicodeError):
                    continue
                if not isinstance(e, dict):
                    continue
                tipo = e.get('evento')
                if tipo=='enlace_usb':
                    sesion = e.get('sesion')
                    print(f"Modo {e.get('modo')} · sesión {sesion} · RC522 {e.get('rc522')}")
                elif tipo=='ciclo' and e.get('version')==3 and e.get('sesion')==sesion:
                    reciente = {(sesion,e.get('ciclo_local')): time.monotonic()}
                    clave = guardar(db,args.equipo,e)
                    despertar.set()
                    print('Ciclo recibido:', clave, e.get('estado'), flush=True)
                elif tipo=='activacion_rfid' and e.get('version')==1 and activo and e.get('solicitud')==activo:
                    estado = e.get('estado')
                    print('RC522:', estado, flush=True)
                    if estado=='DETECTADA':
                        tareas.put(('detectada',activo,{}))
                    elif estado=='LEIDA' and UID.fullmatch(str(e.get('uid'))):
                        tareas.put(('completar',activo,{'uid':e['uid']}))
                        activo = None
                    elif estado in MOTIVOS:
                        tareas.put(('fallar',activo,{'motivo':MOTIVOS[estado]}))
                        activo = None
                elif tipo=='requiere_revision':
                    print('Revisión local:',e.get('causa'))
            if len(buffer)>8192:
                buffer.clear()
                descartar = True
    finally:
        terminar.set()
        despertar.set()
        db.close()


def identificar(puerto, enlace):
    if enlace['modo'] != 'BANCO':
        raise RuntimeError('Para identificar una tarjeta, el Mega debe estar en banco.')
    token = str(uuid.uuid4())
    puerto.write(f'VINCULAR {token}\n'.encode('ascii'))
    print('Cuando la LCD lo indique, acerca y retira una tarjeta.')
    fin = time.monotonic()+19
    parcial = bytearray()
    while time.monotonic()<fin:
        parcial.extend(puerto.read_until(b'\n', 4096))
        if len(parcial)>8192:
            parcial.clear()
        if not parcial.endswith(b'\n'):
            continue
        linea = bytes(parcial).strip()
        if linea.startswith(b'#'):
            print(linea.decode(errors='replace'), flush=True)
            parcial.clear()
            continue
        try:
            e = json.loads(linea)
        except (ValueError, UnicodeError):
            e = {}
        parcial.clear()
        if not isinstance(e,dict) or e.get('evento')!='activacion_rfid' or e.get('solicitud')!=token:
            continue
        estado = e.get('estado')
        if estado == 'DETECTADA':
            print('RC522: UID detectado; esperando confirmacion de retirada...', flush=True)
            continue
        if estado=='LEIDA' and UID.fullmatch(str(e.get('uid'))):
            print('UID para el prerregistro administrativo:', e['uid'])
            return
        if estado in MOTIVOS:
            raise RuntimeError(MOTIVOS[estado])
    raise RuntimeError('Se agotó la espera del RC522.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--listar', action='store_true')
    prueba = parser.add_mutually_exclusive_group()
    prueba.add_argument('--diagnostico', action='store_true')
    prueba.add_argument('--leer-uid', action='store_true', help='Leer una tarjeta localmente para el administrador')
    parser.add_argument('--puerto')
    parser.add_argument('--equipo', default='SPING-01',help='Identidad permanente de esta placa')
    parser.add_argument('--url', default='https://web-sping-sistema.vercel.app')
    parser.add_argument('--campo-puntos', default='puntos_sumados', help='Campo numérico de puntos devuelto por la API de clasificaciones')
    args = parser.parse_args()
    puertos = list(list_ports.comports())
    if args.listar or not args.puerto and len(puertos)!=1:
        for p in puertos:
            print(p.device, p.description)
        if not puertos:
            print('No se detectaron puertos serie.')
        if not args.listar:
            parser.error('Selecciona el Mega con --puerto COMx.')
        return
    puerto = args.puerto or puertos[0].device
    srv = urlsplit(args.url)
    if srv.scheme!='https' and not (srv.scheme=='http' and srv.hostname in ('localhost','127.0.0.1','::1')):
        parser.error('La URL debe ser HTTPS o un servidor local de prueba.')
    if not (args.diagnostico or args.leer_uid):
        key = os.getenv('SPING_DEVICE_API_KEY') or getpass.getpass('Clave del dispositivo (entrada oculta): ')
        if not key:
            parser.error('Falta la clave del dispositivo.')
        directorio = Path(os.getenv('LOCALAPPDATA') or Path.home())/'SPING'
        directorio.mkdir(exist_ok=True)
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,48}',args.equipo):
            parser.error('Identificador de equipo inválido.')
        # Evita que una cola de pruebas se entregue a producción.
        destino = uuid.uuid5(uuid.NAMESPACE_URL,args.url.rstrip('/')).hex[:12]
        dbpath = directorio/f'{args.equipo}-{destino}.sqlite3'
        print('Registro local:',dbpath)
    with serial.Serial(puerto,115200,timeout=.08,write_timeout=1) as ser:
        enlace = diagnosticar(ser)
        if args.leer_uid:
            identificar(ser,enlace)
        elif not args.diagnostico:
            ejecutar(ser,enlace,args,API(args.url,key),dbpath)


if __name__=='__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
    except (serial.SerialException,OSError,sqlite3.Error,RuntimeError,ValueError) as exc:
        sys.exit(f'Puente detenido: {exc}')
