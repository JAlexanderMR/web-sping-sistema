#include <Arduino.h>
#include <Servo.h>
#include <SPI.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <util/atomic.h>
#include "Calibracion.h"

namespace {
const byte PIN_SERVO[] = {30, 31, 32, 33, 34, 35};
const byte NIVEL[] = {25, 26, 27}, SELECTOR[] = {36, 37, 38};
const byte IR = 2, TRIG = 22, ECO = 23, CONTACTO = 24;
const byte CERRADA = 39, ABIERTA = 40, SERVICIO = 41;
const byte ANGULO_SELECTOR[] = {10, 90, 170};
const byte ANGULO_CERRADA = 130, ANGULO_ABIERTA = 60;
const uint32_t PULSO_MIN_US = 500, NIVEL_MS = 350, RFID_MS = 15000, CREDITO_MS = 5000;
const byte NIVEL_LLENO = HIGH;
const char* const CAJONES[] = {"Inorganico", "Revision manual", "Organico"};

LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 lector(53, 49);
Servo servo[6];
int angulo[6] = {-1,-1,-1,-1,-1,-1};
Perfil perfil;
bool guardado, automatico, rearme;
uint32_t sesion, ciclo, ultimoEco, tiempoAviso;
byte cerca, despejado;
const char* fallo = nullptr;

// El ISR mide los dos flancos incluso mientras el Mega consulta la tarjeta o el LCD.
volatile byte polaridadIR = 255;
volatile bool midiendoPulso;
volatile uint32_t inicioPulso, pulsos, ultimoAncho;
void flancoIR() {
  if (polaridadIR > 1) return;
  const uint32_t ahora = micros();
  if (digitalRead(IR) == polaridadIR) {
    inicioPulso = ahora;
    midiendoPulso = true;
  } else if (midiendoPulso) {
    ultimoAncho = ahora - inicioPulso;
    if (ultimoAncho >= PULSO_MIN_US) ++pulsos;
    midiendoPulso = false;
  }
}
void configurarIR(byte polaridad) {
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    polaridadIR = polaridad;
    midiendoPulso = false;
    pulsos = ultimoAncho = 0;
  }
}
struct LecturaIR { uint32_t cuenta, ancho; bool libre; };
LecturaIR leerIR() {
  LecturaIR ir;
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    ir.cuenta = pulsos;
    ir.ancho = ultimoAncho;
    ir.libre = polaridadIR <= 1 && digitalRead(IR) != polaridadIR;
  }
  return ir;
}
bool activo(byte pin) { return digitalRead(pin) == LOW; }
bool puertaEn(bool abierta) { return activo(ABIERTA) == abierta && activo(CERRADA) != abierta; }
int posicionSelector() {
  int pos = -1;
  for (byte i = 0; i < 3; ++i) {
    if (!activo(SELECTOR[i])) continue;
    if (pos != -1) return -2; // Dos finales activos son contradictorios.
    pos = i;
  }
  return pos;
}
void pantalla(const char* arriba, const char* abajo = "") {
  lcd.clear();
  lcd.print(arriba);
  lcd.setCursor(0, 1);
  lcd.print(abajo);
}
void detener(const char* causa) {
  if (fallo) return;
  fallo = causa;
  pantalla("Revisar equipo", causa);
  Serial.print(F("{\"evento\":\"requiere_revision\",\"causa\":\""));
  Serial.print(causa); Serial.println(F("\"}"));
}
bool nivelAlto[3];
uint32_t desdeNivel[3];
void vigilar() {
  if (activo(SERVICIO)) detener("SERVICIO_D41");
  const uint32_t ahora = millis();
  for (byte i = 0; i < 3; ++i) {
    bool alto = digitalRead(NIVEL[i]) == NIVEL_LLENO;
    if (alto && !nivelAlto[i]) desdeNivel[i] = ahora;
    nivelAlto[i] = alto;
    if (automatico && alto && ahora - desdeNivel[i] >= NIVEL_MS) {
      const char* const causas[] = {"LLENO_IZQUIERDA", "LLENO_CENTRO", "LLENO_DERECHA"};
      detener(causas[i]);
    }
  }
}
bool nivelesLibres() { return !nivelAlto[0] && !nivelAlto[1] && !nivelAlto[2]; }
int distancia() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);
  unsigned long eco = pulseIn(ECO, HIGH, 25000);
  return eco ? (eco + 29) / 58 : -1;
}

struct Tarjeta {
  char uid[21];
  bool ventana, retirada, invalida;
  byte ausencias;
  uint32_t inicio, consulta;
} tarjeta;
void leerTarjeta() {
  const uint32_t ahora = millis();
  if (!tarjeta.ventana || tarjeta.retirada || tarjeta.invalida ||
      ahora - tarjeta.inicio >= RFID_MS || ahora - tarjeta.consulta < 65) return;
  tarjeta.consulta = ahora;

  bool lecturaCorrecta = false;

  if (!tarjeta.uid[0]) {
    // Diagnostico por USB: informa cada segundo si el RC522 ve una tarjeta.
    static uint32_t ultimoAvisoRFID = 0;
    bool tarjetaPresente = lector.PICC_IsNewCardPresent();
    if (!tarjetaPresente) {
      if (ahora - ultimoAvisoRFID >= 1000) {
        ultimoAvisoRFID = ahora;
        Serial.println(F("# RFID_BUSCANDO: sin tarjeta detectada"));
      }
      return;
    }
    Serial.println(F("# RFID_PICC_PRESENTE"));
    // Diagnostico detallado de la seleccion/anticolision de la tarjeta.
    // PICC_Select devuelve el estado concreto de la comunicacion con el UID.
    MFRC522::StatusCode estadoUID = lector.PICC_Select(&lector.uid);
    if (estadoUID != MFRC522::STATUS_OK) {
      Serial.print(F("# RFID_SELECT_FALLO: "));
      Serial.println(lector.GetStatusCodeName(estadoUID));
      return;
    }
    Serial.println(F("# RFID_UID_LEIDO"));
    lecturaCorrecta = true;
  } else {
    // La tarjeta queda en HALT al finalizar cada lectura. WUPA permite
    // despertarla para comprobar si sigue delante del lector.
    byte respuesta[2], n = sizeof(respuesta);
    const MFRC522::StatusCode estado = lector.PICC_WakeupA(respuesta, &n);

    if (estado == MFRC522::STATUS_TIMEOUT) {
      if (++tarjeta.ausencias >= 3) tarjeta.retirada = true;
      Serial.println(F("# RFID_RETIRO: sin respuesta de tarjeta"));
      return;
    } else if (estado == MFRC522::STATUS_OK ||
               estado == MFRC522::STATUS_COLLISION) {
      lecturaCorrecta = lector.PICC_ReadCardSerial();
    } else {
      // STATUS_ERROR no significa necesariamente que haya dos tarjetas ni
      // que el lector este averiado. Intentar una lectura de UID antes de
      // contabilizar una ausencia.
      lecturaCorrecta = lector.PICC_ReadCardSerial();
      if (!lecturaCorrecta) {
        if (++tarjeta.ausencias >= 3) tarjeta.retirada = true;
        return;
      }
    }

    if (!lecturaCorrecta) {
      // Fallo transitorio de anticollision/lectura: no invalidar la tarjeta.
      return;
    }
  }

  tarjeta.ausencias = 0;

  char visto[21] = {};
  const char hex[] = "0123456789ABCDEF";
  const byte len = lector.uid.size;

  if (len != 4 && len != 7 && len != 10) {
    lector.PICC_HaltA();
    lector.PCD_StopCrypto1();
    return;
  }

  for (byte i = 0; i < len; ++i) {
    visto[2*i] = hex[lector.uid.uidByte[i] >> 4];
    visto[2*i+1] = hex[lector.uid.uidByte[i] & 0x0F];
  }

  if (!tarjeta.uid[0]) {
    strcpy(tarjeta.uid, visto);
  } else if (strcmp(tarjeta.uid, visto) != 0) {
    // Se detecto otro UID durante la misma activacion: no abonar puntos.
    tarjeta.invalida = true;
  }

  // Finalizar la comunicacion con la tarjeta; el siguiente ciclo la
  // despertara mediante WUPA para comprobar presencia/retirada.
  lector.PICC_HaltA();
  lector.PCD_StopCrypto1();
}

// Controles que deben seguir siendo ciertos DURANTE un movimiento.
int selectorVigilado = -1;
bool exigirCerrada, exigirLibre, exigirAbierta, exigirSondaLibre;
bool revisar() {
  vigilar();
  if (!fallo && selectorVigilado >= 0 && posicionSelector() != selectorVigilado)
    detener("SELECTOR_PERDIDO");
  if (!fallo && exigirCerrada && !puertaEn(false)) detener("PUERTA_NO_CIERRA");
  if (!fallo && exigirAbierta && !puertaEn(true)) detener("PUERTA_NO_ABRE");
  if (!fallo && activo(ABIERTA) && activo(CERRADA)) detener("FINALES_PUERTA");
  if (!fallo && exigirLibre && !leerIR().libre) detener("SALIDA_OCUPADA");
  if (!fallo && exigirSondaLibre && activo(CONTACTO)) detener("CONTACTO_PREVIO");
  return !fallo;
}
bool pausa(uint32_t ms) {
  const uint32_t t = millis();
  do {
    if (!revisar()) return false;
    leerTarjeta();
    delay(1);
  } while (millis()-t < ms);
  return revisar();
}
bool ordenar(byte eje, byte grados) {
  if (!revisar()) return false;
  servo[eje].write(grados);
  if (!servo[eje].attached()) servo[eje].attach(PIN_SERVO[eje]);
  angulo[eje] = grados;
  return true;
}
// Interpolación conjunta. La primera consigna de un servo corresponde a su
// posición física prealineada por el instalador, que un servo RC no informa.
bool mover(byte primero, byte n, const byte* objetivo) {
  int origen[4], pasos = 0;
  for (byte i = 0; i < n; ++i) {
    origen[i] = angulo[primero+i] < 0 ? objetivo[i] : angulo[primero+i];
    pasos = max(pasos, abs(int(objetivo[i]) - origen[i]));
  }
  pasos = max(pasos, 1);
  for (int k = 1; k <= pasos; ++k) {
    for (byte i = 0; i < n; ++i) {
      int orden = origen[i] + (int32_t(objetivo[i])-origen[i])*k/pasos;
      if (!ordenar(primero+i, orden)) return false;
    }
    if (!pausa(15)) return false;
  }
  return pausa(180);
}
bool irAPose(const byte* pose) {
  exigirSondaLibre = true;
  bool ok = mover(0, 4, pose);
  exigirSondaLibre = false;
  return ok;
}
bool brazoEnReposo() {
  for (byte i = 0; i < 4; ++i)
    if (!servo[i].attached() || angulo[i] != perfil.reposo[i]) return false;
  return !activo(CONTACTO);
}
bool esperarSelector(byte destino) {
  uint32_t t = millis(), estable = t;
  while (millis()-t < 1800) {
    if (!pausa(5)) return false;
    int pos = posicionSelector();
    if (pos == -2) { detener("FINALES_SELECTOR"); return false; }
    if (pos != destino) estable = millis();
    else if (millis()-estable >= 75) return true;
  }
  detener("SELECTOR"); return false;
}
bool alinear(byte destino) {
  if (!brazoEnReposo() || !puertaEn(false) || !leerIR().libre) return false;
  exigirCerrada = exigirLibre = true;
  bool ok = mover(4, 1, &ANGULO_SELECTOR[destino]) && esperarSelector(destino);
  exigirCerrada = exigirLibre = false;
  return ok;
}
bool puerta(bool abrir) {
  byte tope = abrir ? ANGULO_ABIERTA : ANGULO_CERRADA;
  if (!mover(5, 1, &tope)) return false;
  uint32_t t = millis(), estable = t;
  while (millis()-t < 1600) {
    if (!pausa(5)) return false;
    if (!puertaEn(abrir)) estable = millis();
    else if (millis()-estable >= 75) return true;
  }
  detener(abrir ? "APERTURA" : "CIERRE"); return false;
}

Muestra muestras[6];
byte cantidad;
const char* motivoRechazo;
bool tomarLecturas(Muestra& m) {
  m.contacto = activo(CONTACTO);
  if (!m.contacto) return false;
  uint32_t t = millis();
  while (millis()-t < 300) {
    if (!activo(CONTACTO) || !pausa(2)) return false;
  }
  for (byte i = 0; i < 15; ++i) {
    if (!activo(CONTACTO) || !revisar()) break;
    m.adc[m.n++] = analogRead(A0);
    if (i != 14) {
      uint32_t lectura = micros();
      do {
        // La consulta SPI sin tarjeta puede durar más que una separación ADC.
        // El IR sigue por interrupción y aquí se vigilan los enclavamientos.
        if (!activo(CONTACTO) || !revisar()) return false;
        delayMicroseconds(200);
      } while (micros()-lectura < 20000UL);
    }
  }
  calcularMuestra(m);
  return m.n == 15;
}
const char* const PUNTOS[] = {"Punto 1 de 3", "Punto 2 de 3", "Punto 3 de 3"};
int medirPunto(byte punto, byte intento) {
  Muestra& m = muestras[cantidad++];
  iniciarMuestra(m, punto, intento);
  pantalla(intento == 1 ? "Midiendo residuo" : "Segunda medicion", PUNTOS[punto]);
  if (!irAPose(perfil.sobre[punto])) return -1;
  if (activo(CONTACTO)) { detener("CONTACTO_PREVIO"); return -1; }
  int inicio = perfil.sobre[punto][1], fin = perfil.limite[punto];
  int paso = fin > inicio ? 1 : -1;
  for (int a = inicio; ; a += paso) {
    if (!ordenar(1, a) || !pausa(45)) return -1;
    if (activo(CONTACTO)) {
      if (!pausa(30)) return -1;
      if (activo(CONTACTO)) { tomarLecturas(m); break; }
    }
    if (a == fin) break;
  }
  // Levantar el hombro antes de desplazar lateralmente la punta.
  if (fallo || !mover(1, 1, &perfil.sobre[punto][1])) return -1;
  if (activo(CONTACTO)) { detener("SONDA_ATASCADA"); return -1; }
  if (!irAPose(perfil.reposo)) return -1;
  return clase(m);
}
int clasificar() {
  for (byte intento = 1; intento <= 2 && !fallo; ++intento) {
    int resultados[3] = {-1,-1,-1};
    for (byte i = 0; i < 3 && !fallo; ++i) resultados[i] = medirPunto(i, intento);
    if (!fallo && resultados[0] >= 0 && resultados[1] == resultados[0] &&
        resultados[2] == resultados[0]) return resultados[0];
    if (!fallo && intento == 2)
      motivoRechazo = resultados[0]<0 || resultados[1]<0 || resultados[2]<0 ? "PUNTO_INVALIDO" : "SIN_CONSENSO";
  }
  return 1;
}

struct Deposito {
  int cm, destino;
  bool selector, paso, cierre;
  uint32_t pulsosIR;
} deposito;
bool ventanaPaso;
uint32_t cuentaAlAbrir;
uint32_t cicloCredito, esperaCredito;
void descargar() {
  byte destino = deposito.destino;
  if (!alinear(destino)) { detener("SALIDA_NO_LISTA"); return; }
  deposito.selector = true;
  selectorVigilado = destino;
  LecturaIR previo = leerIR();
  if (!previo.libre || !puertaEn(false)) { detener("SALIDA_NO_LISTA"); return; }
  cuentaAlAbrir = previo.cuenta; ventanaPaso = true;
  // Armar ANTES de abrir. Un residuo pequeño puede cruzar durante la apertura.
  if (!puerta(true)) return;
  exigirAbierta = true;
  uint32_t t = millis(), estable = t;
  bool visto = false;
  while (millis()-t < 2500) {
    if (!pausa(2)) return;
    LecturaIR ir = leerIR();
    deposito.pulsosIR = ir.cuenta - previo.cuenta;
    if (deposito.pulsosIR > 1) { detener("PASO_MULTIPLE"); return; }
    if (!ir.libre || deposito.pulsosIR != 1) estable = millis();
    else if (millis()-estable >= 120) { visto = true; break; }
  }
  exigirAbierta = false;
  if (!leerIR().libre) { detener("ATASCO"); return; }
  deposito.paso = visto;
  // Un pulso tardío durante el cierre no convierte una descarga vacía en válida.
  exigirLibre = true;
  if (!puerta(false)) return;
  deposito.cierre = true;
  exigirCerrada = true;
  if (!pausa(100)) return;
  deposito.pulsosIR = leerIR().cuenta - previo.cuenta;
  if (deposito.pulsosIR > 1) { deposito.paso = false; detener("PASO_MULTIPLE"); }
  else if (!visto) detener("SIN_CAIDA");
}

void booleano(bool valor) { Serial.print(valor ? F("true") : F("false")); }
void emitir(const char* estado, bool incluirUID) {
  Serial.print(F("{\"evento\":\"ciclo\",\"version\":3,\"sesion\":")); Serial.print(sesion);
  Serial.print(F(",\"ciclo_local\":")); Serial.print(ciclo);
  Serial.print(F(",\"distancia_cm\":")); Serial.print(deposito.cm);
  Serial.print(F(",\"estado\":\"")); Serial.print(estado);
  Serial.print(F("\",\"destino\":")); Serial.print(deposito.destino);
  Serial.print(F(",\"destino_observado\":null,\"selector_confirmado\":")); booleano(deposito.selector);
  Serial.print(F(",\"caida_confirmada\":")); booleano(deposito.paso);
  Serial.print(F(",\"cierre_confirmado\":")); booleano(deposito.cierre);
  Serial.print(F(",\"pulsos_ir\":")); Serial.print(deposito.pulsosIR);
  if (motivoRechazo) {
    Serial.print(F(",\"motivo_rechazo\":\"")); Serial.print(motivoRechazo); Serial.print('"');
  }
  if (incluirUID) { Serial.print(F(",\"uid\":\"")); Serial.print(tarjeta.uid); Serial.print('"'); }
  Serial.print(F(",\"mediciones\":["));
  for (byte i = 0; i < cantidad; ++i) {
    const Muestra& m = muestras[i];
    if (i) Serial.print(',');
    Serial.print(F("{\"punto\":")); Serial.print(m.sitio+1);
    Serial.print(F(",\"intento\":")); Serial.print(m.intento);
    Serial.print(F(",\"contacto\":")); booleano(m.contacto);
    Serial.print(F(",\"mediana_adc\":")); Serial.print(m.mediana);
    Serial.print(F(",\"dispersion_adc\":")); Serial.print(m.dispersion);
    Serial.print(F(",\"adc\":["));
    for (byte j=0; j<m.n; ++j) { if (j) Serial.print(','); Serial.print(m.adc[j]); }
    Serial.print(F("]}"));
  }
  Serial.println(F("]}"));
  memset(&tarjeta, 0, sizeof tarjeta);
}
bool nuevoCiclo(int cm) {
  if (ciclo == UINT32_MAX) { detener("LIMITE_CICLOS"); return false; }
  ++ciclo;
  deposito = {cm, -1, false, false, false, 0};
  cantidad = 0; ventanaPaso = false; motivoRechazo = nullptr;
  cicloCredito = 0;
  return true;
}
void ejecutar(int cm) {
  if (!nuevoCiclo(cm)) return;
  tarjeta = {};
  tarjeta.ventana = true; tarjeta.inicio = millis();
  exigirCerrada = exigirLibre = true;
  if (!brazoEnReposo() || posicionSelector() < 0) detener("INICIO_INSEGURO");
  if (!fallo) pantalla("Acerca y retira", "tu tarjeta SPING");
  if (pausa(3000)) {
    int ruta = clasificar();
    if (!fallo && !brazoEnReposo()) detener("BRAZO_FUERA");
    if (!fallo) {
      deposito.destino = ruta;
      pantalla("Separando", CAJONES[ruta]);
      descargar();
      if (ventanaPaso) {
        deposito.pulsosIR = leerIR().cuenta - cuentaAlAbrir;
        if (deposito.pulsosIR > 1) { deposito.paso = false; detener("PASO_MULTIPLE"); }
      }
    }
  }
  // Para un rechazo real también se espera la retirada de la misma tarjeta.
  // No cambia la ruta física: solo permite asociar el evento de revisión al usuario.
  if (!fallo && deposito.destino >= 0 && tarjeta.uid[0] &&
      !tarjeta.retirada && !tarjeta.invalida && millis()-tarjeta.inicio < RFID_MS) {
    pantalla("Retira tarjeta", "tu tarjeta SPING");
    while (!tarjeta.retirada && !tarjeta.invalida &&
           millis()-tarjeta.inicio < RFID_MS && pausa(5)) {}
  }
  if (selectorVigilado >= 0 && posicionSelector() != selectorVigilado) deposito.selector = false;
  if (deposito.cierre && !puertaEn(false)) deposito.cierre = false;
  revisar();
  bool completo = !fallo && (deposito.destino == 0 || deposito.destino == 2) &&
                  deposito.selector && deposito.paso && deposito.cierre;
  bool abonar = completo && tarjeta.uid[0] && tarjeta.retirada && !tarjeta.invalida;
  bool rechazoClasificacion = !fallo && deposito.destino == 1 && motivoRechazo &&
                              deposito.selector && deposito.paso && deposito.cierre &&
                              deposito.pulsosIR == 1;
  bool rechazoConUsuario = rechazoClasificacion && tarjeta.uid[0] &&
                           tarjeta.retirada && !tarjeta.invalida;
  const char* estadoEvento = fallo ? fallo : (completo ? "COMPLETO" :
                             (rechazoClasificacion ? "RECHAZO" : "INCOMPLETO"));
  emitir(estadoEvento, abonar || rechazoConUsuario);
  selectorVigilado = -1; exigirCerrada = exigirAbierta = exigirLibre = false;
  if (fallo) { pantalla("Revisar equipo", fallo); return; }
  if (abonar) {
    cicloCredito = ciclo; esperaCredito = millis();
    pantalla("Deposito valido", "Registro USB");
  } else pantalla(completo ? "Deposito valido" : "A revision", completo ? "Sin abono" : "Registro USB");
  rearme = true; despejado = cerca = 0; tiempoAviso = millis();
}
bool bancoMedir() {
  for (byte i = 0; i < 6; ++i)
    if (servo[i].attached()) { Serial.println(F("# Use BANCO con el brazo sostenido")); return false; }
  if (activo(CONTACTO)) { Serial.println(F("# Libere D24")); return false; }
  if (!nuevoCiclo(distancia())) return false;
  for (byte i=0; i<3 && !fallo; ++i) {
    pantalla("Apoya la sonda", PUNTOS[i]);
    Muestra& m = muestras[cantidad++];
    iniciarMuestra(m, i, 1);
    uint32_t t=millis();
    while (!activo(CONTACTO) && millis()-t < 10000 && pausa(5)) {}
    if (fallo) break;
    if (!activo(CONTACTO)) continue;
    tomarLecturas(m);
    if (fallo) break;
    pantalla("Levanta sonda", PUNTOS[i]); t=millis();
    while (activo(CONTACTO) && millis()-t < 10000 && pausa(5)) {}
    if (activo(CONTACTO)) detener("SONDA_ATASCADA");
  }
  emitir(fallo ? "BANCO_INTERRUMPIDO" : "BANCO", false);
  if (!fallo) pantalla("Banco sin motor", "Datos por USB");
  return !fallo;
}

void estado() {
  LecturaIR ir = leerIR();
  Serial.print(F("# modo=")); Serial.print(fallo ? "REVISION" : automatico ? "AUTO" : "BANCO");
  if (fallo) { Serial.print(F(" causa=")); Serial.print(fallo); }
  Serial.print(F(" sesion=")); Serial.print(sesion);
  Serial.print(F(" D2=")); Serial.print(digitalRead(IR));
  Serial.print(F(" libre=")); Serial.print(ir.libre);
  Serial.print(F(" pulsos_ir=")); Serial.print(ir.cuenta);
  Serial.print(F(" ultimo_us=")); Serial.print(ir.ancho);
  const byte entradas[] = {24,25,26,27,36,37,38,39,40,41};
  for (byte p : entradas) {
    Serial.print(F(" D")); Serial.print(p); Serial.print('='); Serial.print(digitalRead(p));
  }
  Serial.print(F(" cm=")); Serial.print(distancia());
  Serial.print(F(" A0=")); Serial.println(analogRead(A0));
}
void filaPerfil(const char* nombre, const byte* a) {
  Serial.print(F("# ")); Serial.print(nombre);
  for (byte i=0; i<4; ++i) {
    Serial.print(' ');
    if (a[i] == SIN_MEDIR) Serial.print('-'); else Serial.print(a[i]);
  }
  Serial.println();
}
void verPerfil() {
  filaPerfil("R", perfil.reposo);
  for (byte i=0; i<3; ++i) {
    filaPerfil(PUNTOS[i], perfil.sobre[i]);
    Serial.print(F("# limite hombro=")); Serial.println(perfil.limite[i]);
  }
  Serial.print(F("# IR_bloqueado=")); Serial.print(perfil.irBloqueado);
  Serial.print(F(" validado_brazo=")); Serial.print(bool(perfil.verificaciones & VER_BRAZO));
  Serial.print(F(" validado_ir=")); Serial.print(bool(perfil.verificaciones & VER_IR));
  Serial.print(F(" validado_salida=")); Serial.print(bool(perfil.verificaciones & VER_MECANICA));
  Serial.print(F(" guardado=")); Serial.println(guardado);
}
void desconectar() {
  automatico = false; cicloCredito = 0;
  exigirCerrada = exigirAbierta = exigirLibre = false; selectorVigilado = -1;
  for (byte i=0; i<6; ++i) {
    if (servo[i].attached()) servo[i].detach();
    angulo[i] = -1;
  }
  pantalla("Modo banco", "Monitor serie");
}
bool activar() {
  if (!guardado || !perfilListo(perfil) || !sesion) {
    Serial.println(F("# Revise PERFIL, VALIDAR y GUARDAR; se requiere sesion EEPROM")); return false;
  }
  if (!puertaEn(false) || activo(CONTACTO) || !leerIR().libre || posicionSelector() < 0) {
    Serial.println(F("# Revise puerta cerrada, D24, IR y selector")); return false;
  }
  // Tras calibrar en banco sabemos si hubo un mando distinto al de reposo.
  for (byte i=0; i<4; ++i) if (angulo[i]>=0 && angulo[i]!=perfil.reposo[i]) {
    Serial.println(F("# Devuelva el brazo a POS R antes de AUTO")); return false;
  }
  for (byte i=0; i<3; ++i) {
    if (!pausa(70) || !nivelesLibres() || distancia() <= 12) {
      Serial.println(F("# Revise los niveles y el eco de camara vacia")); return false;
    }
  }
  int pos = posicionSelector();
  if (pos < 0 || !puertaEn(false) || activo(CONTACTO) || !leerIR().libre) return false;
  automatico = true; exigirCerrada = exigirLibre = true;
  selectorVigilado = pos;
  if (!ordenar(5, ANGULO_CERRADA) || !ordenar(4, ANGULO_SELECTOR[pos]) || !irAPose(perfil.reposo))
    return false;
  selectorVigilado = -1; exigirCerrada = exigirLibre = false;
  rearme = false; cerca = despejado = 0;
  pantalla("Secalo bien", "Coloca 1 residuo");
  return true;
}

byte nivelLibreIR = SIN_MEDIR;
byte pruebasSalida;
void invalidar(byte flags) {
  perfil.verificaciones &= ~flags;
  guardado = false;
  if (flags & VER_MECANICA) pruebasSalida = 0;
}
bool numero(const char* token, uint32_t& valor) {
  valor = 0;
  if (!token || !*token) return false;
  for (const char* p=token; *p; ++p) {
    if (*p < '0' || *p > '9') return false;
    byte d = *p-'0';
    if (valor > (UINT32_MAX-d)/10) return false;
    valor = valor*10+d;
  }
  return true;
}
bool igual(const char* a, const char* b) { return strcmp(a,b)==0; }
bool calibrarIR(const char* accion) {
  byte valor = digitalRead(IR);
  uint32_t t = millis();
  while (millis()-t < 120) {
    if (!pausa(2) || digitalRead(IR) != valor) return false;
  }
  if (igual(accion, "LIBRE")) {
    invalidar(VER_IR | VER_MECANICA);
    nivelLibreIR = valor;
    perfil.irBloqueado = SIN_MEDIR;
    configurarIR(SIN_MEDIR);
    return true;
  }
  if (igual(accion,"PASO") && nivelLibreIR <= 1 && valor != nivelLibreIR) {
    invalidar(VER_IR | VER_MECANICA);
    perfil.irBloqueado = valor;
    configurarIR(valor);
    nivelLibreIR = SIN_MEDIR;
    return true;
  }
  return false;
}
bool registrarPose(const char* nombre, bool limite) {
  for (byte i=0; i<4; ++i) if (angulo[i] < 0) return false;
  bool reposo = igual(nombre, "R");
  uint32_t n=0;
  if (!(reposo && !limite) && (!numero(nombre,n) || n < 1 || n > 3)) return false;
  if (!puertaEn(false)) return false;
  if (limite) {
    for (byte i=0; i<4; ++i) if (i != 1 && angulo[i] != perfil.sobre[n-1][i]) return false;
    if (perfil.sobre[n-1][1] > 180 || angulo[1] == perfil.sobre[n-1][1]) return false;
    perfil.limite[n-1] = angulo[1];
  } else {
    if (activo(CONTACTO)) return false;
    byte* pose = reposo ? perfil.reposo : perfil.sobre[n-1];
    for (byte i=0; i<4; ++i) pose[i] = angulo[i];
    if (!reposo) perfil.limite[n-1] = SIN_MEDIR;
  }
  invalidar(VER_BRAZO | VER_MECANICA);
  return true;
}
bool probarSalida(const char* nombre) {
  if (!(perfil.verificaciones & VER_BRAZO) || !(perfil.verificaciones & VER_IR)) return false;
  int pos = posicionSelector();
  if (pos < 0 || !puertaEn(false) || !leerIR().libre || !brazoEnReposo()) return false;
  int destino = igual(nombre,"I") ? 0 : igual(nombre,"C") ? 1 : igual(nombre,"D") ? 2 : -1;
  if (destino < 0) return false;
  if (!servo[4].attached() && !ordenar(4, ANGULO_SELECTOR[pos])) return false;
  if (!alinear(destino)) return false;
  pruebasSalida |= 1 << destino;
  return true;
}
bool probarPuerta(const char* nombre) {
  bool abrir = igual(nombre,"A");
  if (!abrir && !igual(nombre,"C")) return false;
  int pos = posicionSelector();
  if (!(perfil.verificaciones & VER_BRAZO) || !(perfil.verificaciones & VER_IR) ||
      pos < 0 || !brazoEnReposo() || !leerIR().libre || !puertaEn(!abrir)) return false;
  selectorVigilado = pos; exigirLibre = true;
  bool ok = true;
  if (!servo[5].attached()) ok = ordenar(5, abrir ? ANGULO_CERRADA : ANGULO_ABIERTA);
  if (ok) ok = puerta(abrir);
  selectorVigilado = -1; exigirLibre = false;
  if (ok) pruebasSalida |= abrir ? 8 : 16;
  return ok;
}
bool validar(const char* elemento) {
  if (igual(elemento, "IR")) {
    LecturaIR ir = leerIR();
    if (!ir.libre || !ir.cuenta) return false;
    perfil.verificaciones |= VER_IR;
  } else if (igual(elemento, "BRAZO")) {
    if (!brazoValido(perfil) || !brazoEnReposo()) return false;
    perfil.verificaciones |= VER_BRAZO;
  } else if (igual(elemento, "SALIDA")) {
    if (pruebasSalida != 31 || !puertaEn(false) || posicionSelector() < 0 || !leerIR().libre)
      return false;
    perfil.verificaciones |= VER_MECANICA;
  } else return false;
  guardado = false;
  return true;
}
bool bancoComando(char** v, byte n) {
  if (n==2 && igual(v[0],"IR")) return calibrarIR(v[1]);
  if (n==2 && igual(v[0],"VALIDAR")) return validar(v[1]);
  if (n==3 && igual(v[0],"EJE")) {
    uint32_t eje, a;
    if (!numero(v[1],eje) || eje<1 || eje>4 || !numero(v[2],a) || a>180 || !puertaEn(false))
      return false;
    if (activo(CONTACTO) && eje!=2) return false;
    byte objetivo=a;
    return mover(eje-1, 1, &objetivo);
  }
  if (n==2 && (igual(v[0],"POS") || igual(v[0],"LIM"))) return registrarPose(v[1], igual(v[0],"LIM"));
  if (n==2 && igual(v[0],"SALIDA")) return probarSalida(v[1]);
  if (n==2 && igual(v[0],"PUERTA")) return probarPuerta(v[1]);
  if (n==1 && igual(v[0],"GUARDAR")) { guardado = guardarPerfil(perfil); return guardado; }
  if (n==1 && igual(v[0],"AUTO")) return activar();
  if (n==1 && igual(v[0],"MEDIR")) return bancoMedir();
  return false;
}
// El comando solo se atiende en banco, con los seis servos sin pulsos.
// La reserva usa el mismo criterio de lectura y retirada que un depósito.
char solicitudRFID[37] = {};
bool tarjetaAvisada;

bool uuidValido(const char* id) {
  if (strlen(id) != 36) return false;
  for (byte i = 0; i < 36; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      if (id[i] != '-') return false;
    } else if (!isxdigit(id[i])) return false;
  }
  return true;
}
void eventoRFID(const char* id, const char* estado, const char* uid = nullptr) {
  Serial.print(F("{\"evento\":\"activacion_rfid\",\"version\":1,\"solicitud\":\""));
  Serial.print(id);
  Serial.print(F("\",\"estado\":\""));
  Serial.print(estado);
  if (uid) {
    Serial.print(F("\",\"uid\":\""));
    Serial.print(uid);
  }
  Serial.println(F("\"}"));
}
void iniciarLecturaRFID(const char* id) {
  if (!uuidValido(id)) { Serial.println(F("# UUID invalido")); return; }
  if (solicitudRFID[0] && strcmp(id, solicitudRFID) == 0) return;
  bool ocupado = fallo || automatico || solicitudRFID[0];
  for (byte i = 0; i < 6; ++i) ocupado |= servo[i].attached();
  if (ocupado) { eventoRFID(id, "OCUPADO"); return; }
  byte version = lector.PCD_ReadRegister(MFRC522::VersionReg);
  if (!version || version == 0xFF) { eventoRFID(id, "SIN_LECTOR"); return; }
  strcpy(solicitudRFID, id);
  tarjeta = {};
  tarjeta.ventana = true;
  tarjeta.inicio = millis();
  tarjetaAvisada = false;
  pantalla("Activar tarjeta", "Acerca y retira");
  eventoRFID(id, "ESPERANDO");
}
void atenderLecturaRFID() {
  if (!solicitudRFID[0]) return;
  if (!fallo) leerTarjeta();
  const char* fin = nullptr;
  if (fallo) fin = "REVISION";
  else if (tarjeta.invalida) fin = "LECTURA_INVALIDA";
  else if (tarjeta.retirada) fin = "LEIDA";
  else if (millis() - tarjeta.inicio >= RFID_MS) fin = "TIEMPO_AGOTADO";
  else if (tarjeta.uid[0] && !tarjetaAvisada) {
    pantalla("Tarjeta detectada", "Retirala");
    eventoRFID(solicitudRFID, "DETECTADA");
    tarjetaAvisada = true;
  }
  if (fin) {
    eventoRFID(solicitudRFID, fin, strcmp(fin, "LEIDA") == 0 ? tarjeta.uid : nullptr);
    solicitudRFID[0] = 0;
    tarjeta = {};
    if (!fallo) pantalla("Modo banco", "Ver resultado PC");
  }
}
void comando(char* linea) {
  char* v[4];
  byte n=0;
  for (char* t=strtok(linea," \t"); t; t=strtok(nullptr," \t")) {
    if (n==4) { Serial.println(F("# Comando demasiado largo")); return; }
    v[n++]=t;
  }
  if (!n) return;
  if (n==1 && igual(v[0],"ENLACE")) {
    Serial.print(F("{\"evento\":\"enlace_usb\",\"version\":1,\"modo\":\""));
    Serial.print(fallo ? "REVISION" : automatico ? "AUTO" : "BANCO");
    Serial.print(F("\",\"sesion\":")); Serial.print(sesion);
    Serial.print(F(",\"rc522\":")); Serial.print(lector.PCD_ReadRegister(MFRC522::VersionReg));
    Serial.println(F("}")); return;
  }
  if (n==1 && igual(v[0],"ESTADO")) { estado(); return; }
  if (n==1 && igual(v[0],"PERFIL")) { verPerfil(); return; }
  if (n==1 && igual(v[0],"AYUDA")) {
    Serial.println(F("# VINCULAR uuid (solo banco sin servos)"));
    Serial.println(F("# ESTADO | PERFIL | IR LIBRE/PASO | EJE n grados | POS R/1/2/3 | LIM 1/2/3"));
    Serial.println(F("# VALIDAR IR/BRAZO/SALIDA | SALIDA I/C/D | PUERTA A/C | GUARDAR | MEDIR | AUTO | BANCO"));
    return;
  }
  if (n==2 && igual(v[0],"VINCULAR")) { iniciarLecturaRFID(v[1]); return; }
  if (solicitudRFID[0]) { Serial.println(F("# Lectura de activacion en curso")); return; }
  if (fallo) { Serial.println(F("# Revisar y reiniciar el equipo")); return; }
  if (n==1 && igual(v[0],"BANCO")) { desconectar(); Serial.println(F("# OK BANCO")); return; }
  bool ok = false;
  if (n==3 && igual(v[0],"CREDITO")) {
    uint32_t s, c;
    if (automatico && cicloCredito && millis()-esperaCredito < CREDITO_MS &&
        numero(v[1],s) && numero(v[2],c) && s==sesion && c==cicloCredito) {
      cicloCredito=0; tiempoAviso=millis();
      pantalla("Puntos abonados", "Gracias"); ok=true;
    }
  } else if (!automatico) ok = bancoComando(v,n);
  Serial.println(ok ? F("# OK") : F("# Sin ejecutar; consulte ESTADO, PERFIL y GUIA.md"));
}
void recibir() {
  static char linea[64];
  static byte n;
  static bool desborde;
  while (Serial.available()) {
    char c=Serial.read();
    if (c=='\r') continue;
    if (c=='\n') {
      if (desborde) Serial.println(F("# Linea descartada"));
      else { linea[n]=0; comando(linea); }
      n=0; desborde=false;
    } else if (n < sizeof(linea)-1) linea[n++]=c;
    else desborde=true;
  }
}
} // namespace

void iniciarSping() {
  Serial.begin(115200);
  pinMode(TRIG,OUTPUT); pinMode(ECO,INPUT); pinMode(IR,INPUT);
  for (byte p : NIVEL) pinMode(p,INPUT_PULLUP);
  for (byte p : SELECTOR) pinMode(p,INPUT_PULLUP);
  const byte contactos[] = {CONTACTO, CERRADA, ABIERTA, SERVICIO};
  for (byte p : contactos) pinMode(p,INPUT_PULLUP);
  SPI.begin(); lector.PCD_Init();
  Wire.begin(); lcd.init(); lcd.backlight();
  guardado = cargarPerfil(perfil);
  sesion = nuevaSesion();
  configurarIR(perfil.irBloqueado);
  attachInterrupt(digitalPinToInterrupt(IR), flancoIR, CHANGE);
  pantalla("Dale un Sping", "a la vida");
  delay(1000); // En este punto todavía no se ha conectado ningún servo.
  desconectar(); vigilar();
  Serial.println(F("# SPING 3 | BANCO | 115200 | AYUDA"));
}
void atenderSping() {
  vigilar();
  recibir();
  atenderLecturaRFID();
  if (fallo || !automatico) return;
  if (cicloCredito && millis()-esperaCredito >= CREDITO_MS) cicloCredito=0;
  if (millis()-ultimoEco < 65) return;
  ultimoEco=millis();
  int cm=distancia();
  if (rearme) {
    despejado = cm>12 ? min(3,despejado+1) : 0;
    if (despejado>=3 && !cicloCredito && millis()-tiempoAviso >= 1500) {
      rearme=false; cerca=despejado=0;
      pantalla("Secalo bien", "Coloca 1 residuo");
    }
  } else {
    cerca = (cm>0 && cm<=10) ? cerca+1 : 0;
    if (cerca>=3) ejecutar(cm);
  }
}