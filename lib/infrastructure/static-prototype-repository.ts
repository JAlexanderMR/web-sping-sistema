import type { PrototypeRepository } from '@/lib/domain/repositories'
import type { CycleStep, HardwareComponent } from '@/lib/domain/entities'

const hardware: HardwareComponent[] = [
  {
    id: 'hc-sr04',
    name: 'Sensor ultrasónico HC-SR04',
    role: 'Detecta cuando un residuo se aproxima a la máquina.',
    icon: 'radar',
  },
  {
    id: 'humedad',
    name: 'Sensor de humedad',
    role: 'Obtiene información sobre las características del residuo.',
    icon: 'droplets',
  },
  {
    id: 'arduino',
    name: 'Arduino Mega 2560',
    role: 'Interpreta los datos de los sensores y toma la decisión.',
    icon: 'chip',
  },
  {
    id: 'motor',
    name: 'Motorreductor de 9 V + L298N',
    role: 'El motor de 9 V, controlado por el driver L298N, posiciona la compuerta.',
    icon: 'cog',
  },
  {
    id: 'lcd',
    name: 'Pantalla LCD 1602 I²C',
    role: 'Comunica al usuario lo que el sistema está haciendo.',
    icon: 'monitor',
  },
  {
    id: 'rfid',
    name: 'Tarjeta RFID SPING',
    role: 'Futura implementación para registrar los SPING Points.',
    icon: 'card',
  },
]

const cycleSteps: CycleStep[] = [
  {
    id: 'espera',
    order: 1,
    title: 'Espera',
    description: 'La máquina permanece preparada para recibir un residuo.',
    lcdMessage: 'Dale un Sping a la vida',
  },
  {
    id: 'deteccion',
    order: 2,
    title: 'Detección',
    description: 'El HC-SR04 detecta que un objeto se aproxima.',
    lcdMessage: 'Objeto detectado',
  },
  {
    id: 'analisis',
    order: 3,
    title: 'Análisis',
    description: 'El sensor de humedad lee las características del residuo.',
    lcdMessage: 'Analizando residuo...',
  },
  {
    id: 'procesamiento',
    order: 4,
    title: 'Procesamiento',
    description: 'El Arduino Mega 2560 interpreta la información obtenida.',
    lcdMessage: 'Procesando datos...',
  },
  {
    id: 'clasificacion',
    order: 5,
    title: 'Clasificación',
    description: 'El motorreductor de 9 V, vía L298N, posiciona la compuerta.',
    lcdMessage: 'Moviendo compuerta',
  },
  {
    id: 'deposicion',
    order: 6,
    title: 'Deposición',
    description: 'El residuo termina en uno de los dos compartimentos.',
    lcdMessage: 'Residuo separado',
  },
  {
    id: 'interaccion',
    order: 7,
    title: 'Interacción',
    description: 'La LCD 1602 I²C agradece y comunica el resultado.',
    lcdMessage: 'Gracias por confiar en SPING',
  },
  {
    id: 'recompensa',
    order: 8,
    title: 'Recompensa',
    description: 'La tarjeta RFID registrará los SPING Points obtenidos.',
    lcdMessage: '+10 SPING Points',
  },
]

export class StaticPrototypeRepository implements PrototypeRepository {
  getHardware() {
    return hardware
  }

  getCycleSteps() {
    return cycleSteps
  }
}
