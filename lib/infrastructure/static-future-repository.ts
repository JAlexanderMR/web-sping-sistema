import type { FutureRepository } from '@/lib/domain/repositories'
import type {
  AudienceStage,
  GoalGroup,
  ImpactArea,
  IndustryPlan,
  RoadmapRelease,
} from '@/lib/domain/entities'

const roadmap: RoadmapRelease[] = [
  {
    version: '1.0',
    title: 'Separación básica',
    status: 'actual',
    features: [
      'Sensor ultrasónico',
      'Sensor de humedad',
      'Dos compartimentos',
      'Arduino',
      'Motorreductor de 9 V',
      'Pantalla LCD',
    ],
  },
  {
    version: '2.0',
    title: 'Reciclaje gamificado',
    status: 'proximo',
    features: ['RFID', 'SPING Points', 'Tarjetas personales', 'Base de datos', 'Aplicación / web'],
  },
  {
    version: '3.0',
    title: 'Clasificación avanzada',
    status: 'futuro',
    features: ['Nuevos sensores', 'Vidrio · plástico · papel', 'Cartón · Tetra Pak', 'Otros materiales'],
  },
  {
    version: '4.0',
    title: 'Automatización industrial',
    status: 'futuro',
    features: ['Grandes volúmenes', 'Clasificación en múltiples etapas', 'Procesos automáticos'],
  },
]

const audienceStages: AudienceStage[] = [
  {
    id: 'educativa',
    stage: 1,
    title: 'Colegio',
    audience: 'Estudiantes, docentes y personal de instituciones educativas.',
    goal: 'Educación ambiental, participación y experimentación tecnológica.',
    icon: 'school',
  },
  {
    id: 'hogar',
    stage: 2,
    title: 'Hogares',
    audience: 'Familias y usuarios domésticos.',
    goal: 'Facilitar la separación cotidiana y crear hábitos.',
    icon: 'home',
  },
  {
    id: 'institucional',
    stage: 3,
    title: 'Instituciones',
    audience: 'Empresas, universidades, centros comerciales y espacios públicos.',
    goal: 'Mayores volúmenes, datos sobre materiales y automatización.',
    icon: 'building',
  },
  {
    id: 'industrial',
    stage: 4,
    title: 'Industria',
    audience: 'Empresas de gestión y aprovechamiento de residuos.',
    goal: 'Sistemas especializados de clasificación automática.',
    icon: 'factory',
  },
]

const goals: GoalGroup[] = [
  {
    horizon: 'corto',
    label: 'Corto plazo · 2026',
    goals: [
      'Finalizar el prototipo funcional',
      'Presentarlo en la feria STEAM',
      'Implementar la clasificación inicial',
      'Desarrollar la identidad visual y la web',
    ],
  },
  {
    horizon: 'mediano',
    label: 'Mediano plazo',
    goals: [
      'Implementar RFID y SPING Points',
      'Desarrollar una aplicación',
      'Probar SPING en otros espacios educativos',
      'Recopilar datos de funcionamiento',
    ],
  },
  {
    horizon: 'largo',
    label: 'Largo plazo',
    goals: [
      'Identificar más tipos de materiales',
      'Incorporar nuevos sensores',
      'Desarrollar una versión doméstica',
      'Explorar aplicaciones industriales',
    ],
  },
]

const impact: ImpactArea[] = [
  { id: 'ambiental', title: 'Ambiental', description: 'Mejor separación desde el origen.' },
  { id: 'educativo', title: 'Educativo', description: 'Enseñar ciencia, tecnología y responsabilidad.' },
  { id: 'social', title: 'Social', description: 'Motivar la participación de la comunidad.' },
  { id: 'tecnologico', title: 'Tecnológico', description: 'Programación, sensores y automatización reales.' },
]

const industryPlans: IndustryPlan[] = [
  {
    id: 'lineas',
    title: 'Líneas de clasificación automática',
    description:
      'Escalar SPING a bandas transportadoras que separen grandes volúmenes de residuos en múltiples etapas, sin intervención manual.',
    icon: 'factory',
  },
  {
    id: 'sensores',
    title: 'Sensores de identificación de materiales',
    description:
      'Incorporar sensores ópticos, inductivos y de peso para distinguir plástico, vidrio, papel, cartón, metal y Tetra Pak con mayor precisión.',
    icon: 'radar',
  },
  {
    id: 'datos',
    title: 'Monitoreo y datos en tiempo real',
    description:
      'Registrar qué materiales se reciben, en qué cantidad y cuándo, para que las empresas optimicen rutas de recolección y aprovechamiento.',
    icon: 'cpu',
  },
  {
    id: 'alianzas',
    title: 'Alianzas con gestores de residuos',
    description:
      'Trabajar con empresas de reciclaje del Cauca y de Colombia para que el material separado en origen llegue limpio a la cadena de valor.',
    icon: 'recycle',
  },
  {
    id: 'economia',
    title: 'Economía circular',
    description:
      'Reducir lo que termina en rellenos sanitarios y convertir los residuos en materia prima para nuevos productos.',
    icon: 'refresh',
  },
  {
    id: 'modular',
    title: 'Diseño modular y escalable',
    description:
      'Una arquitectura por módulos que permita pasar del prototipo de madera a equipos robustos para plantas industriales.',
    icon: 'cog',
  },
]

export class StaticFutureRepository implements FutureRepository {
  getIndustryPlans() {
    return industryPlans
  }

  getRoadmap() {
    return roadmap
  }

  getAudienceStages() {
    return audienceStages
  }

  getGoals() {
    return goals
  }

  getImpact() {
    return impact
  }
}
