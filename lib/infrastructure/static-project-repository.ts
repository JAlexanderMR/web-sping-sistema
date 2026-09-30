import type { ProjectRepository } from '@/lib/domain/repositories'
import type {
  CoreValue,
  Pillar,
  ProblemPerspective,
  ProjectIdentity,
} from '@/lib/domain/entities'

const identity: ProjectIdentity = {
  name: 'SPING',
  slogan: 'Dale un Sping a la vida.',
  extendedSlogan: 'Dale un Sping a la vida, haz el cambio.',
  foundingQuestion:
    '¿Y si reciclar pudiera ser tan fácil y motivador como utilizar cualquier otra tecnología cotidiana?',
  centralConcept:
    'No queremos solamente separar residuos. Queremos cambiar la forma en que las personas piensan sobre ellos.',
  nameConcept:
    'SPING nace del término inglés spin —“girar”— y la idea de darle un giro a nuestra manera de relacionarnos con los residuos. El cambio no ocurre solo con grandes acciones: comienza con pequeñas decisiones individuales que, repetidas colectivamente, transforman nuestro entorno.',
  summary:
    'SPING es un prototipo de máquina inteligente para la separación automatizada de residuos, desarrollado bajo una perspectiva STEAM que integra tecnología, ciencias, programación, electrónica, diseño y educación ambiental.',
  mission:
    'Desarrollar soluciones tecnológicas inteligentes que faciliten la separación de residuos, promuevan la educación ambiental y motiven a las personas a transformar sus hábitos mediante experiencias de reciclaje accesibles, interactivas y gamificadas.',
  vision:
    'Convertir a SPING en una iniciativa referente en innovación ambiental, evolucionando desde soluciones educativas hasta sistemas inteligentes capaces de clasificar diversos materiales en hogares, instituciones e industrias.',
}

const problemPerspectives: ProblemPerspective[] = [
  {
    id: 'usuario',
    audience: 'Para quien recicla',
    issues: [
      'Separar puede percibirse como una tarea tediosa.',
      'Existe desconocimiento sobre dónde depositar ciertos residuos.',
      'La falta de incentivos reduce la participación.',
    ],
  },
  {
    id: 'aseo',
    audience: 'Para el personal de aseo',
    issues: [
      'Los residuos llegan mezclados.',
      'La clasificación posterior requiere tiempo y esfuerzo.',
      'Una mala separación dificulta el aprovechamiento de materiales.',
    ],
  },
]

const pillars: Pillar[] = [
  {
    id: 'educacion',
    title: 'Educación ambiental',
    description: 'Enseñamos que la separación comienza con una decisión individual.',
    icon: 'education',
  },
  {
    id: 'automatizacion',
    title: 'Automatización',
    description: 'Sensores, programación y actuadores que facilitan la clasificación.',
    icon: 'cpu',
  },
  {
    id: 'gamificacion',
    title: 'Gamificación',
    description: 'El reciclaje se vuelve una experiencia participativa con los SPING Points.',
    icon: 'gamepad',
  },
]

const values: CoreValue[] = [
  {
    id: 'sostenibilidad',
    title: 'Sostenibilidad',
    description: 'Aprovechar mejor los materiales y reducir la mezcla innecesaria de residuos.',
    icon: 'leaf',
  },
  {
    id: 'innovacion',
    title: 'Innovación',
    description: 'Tecnología para abordar un problema cotidiano desde otra perspectiva.',
    icon: 'sparkles',
  },
  {
    id: 'educacion',
    title: 'Educación',
    description: 'La tecnología también sirve para enseñar y generar conciencia.',
    icon: 'education',
  },
  {
    id: 'participacion',
    title: 'Participación',
    description: 'El cambio ambiental requiere la acción conjunta de las personas.',
    icon: 'users',
  },
  {
    id: 'responsabilidad',
    title: 'Responsabilidad',
    description: 'Automatizar procesos que beneficien al entorno y a la sociedad.',
    icon: 'shield',
  },
  {
    id: 'transformacion',
    title: 'Transformación',
    description: 'Pequeñas acciones pueden producir cambios mayores.',
    icon: 'refresh',
  },
]

export class StaticProjectRepository implements ProjectRepository {
  getIdentity() {
    return identity
  }

  getProblemPerspectives() {
    return problemPerspectives
  }

  getPillars() {
    return pillars
  }

  getValues() {
    return values
  }
}
