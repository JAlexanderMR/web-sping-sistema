#ifndef SPING_CALIBRACION_H
#define SPING_CALIBRACION_H

#include <Arduino.h>
#include <EEPROM.h>
#include <string.h>

constexpr uint8_t SIN_MEDIR = 255;
constexpr uint8_t VER_BRAZO = 1, VER_IR = 2, VER_MECANICA = 4;
constexpr uint8_t VER_TODO = VER_BRAZO | VER_IR | VER_MECANICA;

struct Perfil {
  uint8_t reposo[4];       // Base, hombro, codo, pinza.
  uint8_t sobre[3][4];     // Posiciones elevadas en cada punto de medida.
  uint8_t limite[3];       // Último ángulo de hombro permitido en descenso.
  uint8_t irBloqueado;     // LOW, HIGH o SIN_MEDIR.
  uint8_t verificaciones;
};

inline void perfilInicial(Perfil& p) {
  memset(&p, SIN_MEDIR, sizeof p);
  p.verificaciones = 0;
}

inline bool brazoValido(const Perfil& p) {
  for (uint8_t a : p.reposo) if (a > 180) return false;
  for (uint8_t i = 0; i < 3; ++i) {
    for (uint8_t a : p.sobre[i]) if (a > 180) return false;
    if (p.sobre[i][3] != p.reposo[3]) return false; // La pinza sostiene la sonda.
    for (uint8_t anterior = 0; anterior < i; ++anterior) {
      if (memcmp(p.sobre[i], p.sobre[anterior], 3) == 0) return false;
    }
    // El sentido de descenso se deduce de las dos medidas en el montaje.
    if (p.limite[i] > 180 || p.limite[i] == p.sobre[i][1]) return false;
  }
  return true;
}

inline bool perfilListo(const Perfil& p) {
  return p.verificaciones == VER_TODO && p.irBloqueado <= 1 && brazoValido(p);
}

namespace memoriaSping {
// Cada registro tiene sello, contenido y CRC16. Se invalida el sello antes
// de escribir y se publica al final. El otro registro conserva el último valor.
constexpr uint8_t SELLO_PERFIL = 0xA6, SELLO_SESION = 0xD3;
constexpr uint8_t VERSION = 1;
constexpr int BASE_PERFIL = 0, PASO_PERFIL = 48;
constexpr int BASE_SESIONES = 128, PASO_SESION = 8;
constexpr uint8_t PARES_SESION = 32;

struct  __attribute__((packed)) RegistroPerfil {
  uint32_t revision;
  uint8_t version;
  Perfil perfil;
};
static_assert(sizeof(RegistroPerfil) + 3 <= PASO_PERFIL, "Espacio EEPROM de perfil insuficiente");
static_assert(sizeof(uint32_t) + 3 <= PASO_SESION, "Espacio EEPROM de sesion insuficiente");

inline uint16_t crc16(const void* datos, uint8_t n) {
  const uint8_t* bytes = static_cast<const uint8_t*>(datos);
  uint16_t crc = 0xFFFF;
  for (uint8_t i = 0; i < n; ++i) {
    crc ^= uint16_t(bytes[i]) << 8;
    for (uint8_t bit = 0; bit < 8; ++bit) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
    }
  }
  return crc;
}

template<typename T>
inline bool leer(int dir, uint8_t sello, T& datos) {
  if (EEPROM.read(dir) != sello) return false;
  EEPROM.get(dir + 1, datos);
  uint16_t crc;
  EEPROM.get(dir + 1 + sizeof datos, crc);
  return crc == crc16(&datos, sizeof datos);
}

template<typename T>
inline bool escribir(int dir, uint8_t sello, const T& datos) {
  EEPROM.update(dir, 0);
  if (EEPROM.read(dir) != 0) return false;
  EEPROM.put(dir + 1, datos);
  const uint16_t crc = crc16(&datos, sizeof datos);
  EEPROM.put(dir + 1 + sizeof datos, crc);
  EEPROM.update(dir, sello);
  T comprobacion;
  return leer(dir, sello, comprobacion) && memcmp(&datos, &comprobacion, sizeof datos) == 0;
}

inline bool anguloOBorrador(uint8_t a) { return a <= 180 || a == SIN_MEDIR; }

inline bool coherente(const Perfil& p) {
  if (p.verificaciones & ~VER_TODO) return false;
  if (p.irBloqueado > 1 && p.irBloqueado != SIN_MEDIR) return false;
  if ((p.verificaciones & VER_IR) && p.irBloqueado == SIN_MEDIR) return false;
  for (uint8_t a : p.reposo) if (!anguloOBorrador(a)) return false;
  for (uint8_t i = 0; i < 3; ++i) {
    for (uint8_t a : p.sobre[i]) if (!anguloOBorrador(a)) return false;
    if (!anguloOBorrador(p.limite[i])) return false;
  }
  return !(p.verificaciones & VER_BRAZO) || brazoValido(p);
}

inline int ultimoPerfil(RegistroPerfil& ultimo) {
  int indice = -1;
  for (uint8_t i = 0; i < 2; ++i) {
    RegistroPerfil r;
    if (!leer(BASE_PERFIL + i * PASO_PERFIL, SELLO_PERFIL, r)) continue;
    if (r.version != VERSION || r.revision == 0 || !coherente(r.perfil)) continue;
    if (indice == -1 || r.revision > ultimo.revision) {
      ultimo = r;
      indice = i;
    }
  }
  return indice;
}
} // namespace memoriaSping

inline bool cargarPerfil(Perfil& p) {
  memoriaSping::RegistroPerfil r;
  if (memoriaSping::ultimoPerfil(r) < 0) {
    perfilInicial(p);
    return false;
  }
  p = r.perfil;
  return true;
}

inline bool guardarPerfil(const Perfil& p) {
  using namespace memoriaSping;
  if (!coherente(p)) return false;
  RegistroPerfil previo = {};
  int indice = ultimoPerfil(previo);
  if (indice >= 0 && memcmp(&previo.perfil, &p, sizeof p) == 0) return true;
  if (previo.revision == UINT32_MAX) return false;
  RegistroPerfil siguiente = {previo.revision + 1, VERSION, p};
  int destino = (indice == 0) ? 1 : 0;
  return escribir(BASE_PERFIL + destino * PASO_PERFIL, SELLO_PERFIL, siguiente);
}

inline uint32_t nuevaSesion() {
  using namespace memoriaSping;
  const uint8_t total = PARES_SESION * 2;
  if (BASE_SESIONES + total * PASO_SESION > EEPROM.length()) return 0;
  uint32_t ultima = 0;
  for (uint8_t i = 0; i < total; ++i) {
    int dir = BASE_SESIONES + i * PASO_SESION;
    uint8_t marca = EEPROM.read(dir);
    if (marca == 0xFF || marca == 0) continue; // Libre o escritura interrumpida.
    uint32_t s;
    // Un registro publicado e ilegible no permite garantizar ID únicos.
    if (!leer(dir, SELLO_SESION, s) || s == 0) return 0;
    if (s > ultima) ultima = s;
  }
  if (ultima == UINT32_MAX) return 0;
  uint32_t siguiente = ultima + 1;
  int dir = BASE_SESIONES + (ultima % PARES_SESION) * 2 * PASO_SESION;
  if (!escribir(dir, SELLO_SESION, siguiente)) return 0;
  if (!escribir(dir + PASO_SESION, SELLO_SESION, siguiente)) return 0;
  return siguiente;
}

struct Muestra {
  uint16_t adc[15];
  uint8_t sitio, intento, n;
  int mediana, dispersion;
  bool contacto;
};

inline void iniciarMuestra(Muestra& m, uint8_t sitio, uint8_t intento) {
  memset(&m, 0, sizeof m);
  m.sitio = sitio;
  m.intento = intento;
  m.mediana = m.dispersion = -1;
}

inline void calcularMuestra(Muestra& m) {
  m.mediana = m.dispersion = -1;
  if (m.n != 15) return;
  uint16_t orden[15];
  memcpy(orden, m.adc, sizeof orden); // Conservar el orden de adquisición para USB.
  for (uint8_t i = 1; i < 15; ++i) {
    uint16_t valor = orden[i];
    uint8_t j = i;
    while (j > 0 && orden[j - 1] > valor) {
      orden[j] = orden[j - 1];
      --j;
    }
    orden[j] = valor;
  }
  m.mediana = orden[7];
  m.dispersion = orden[14] - orden[0];
}

inline int clase(const Muestra& m) {
  if (!m.contacto || m.n != 15 || m.mediana < 0 || m.mediana >= 1019 ||
      m.dispersion < 0 || m.dispersion > 25) return -1;
  if (m.mediana <= 929) return 2; // Húmedo, derecha.
  if (m.mediana >= 932) return 0; // Seco, izquierda.
  return -1;
}

#endif
