import type { TeamRepository } from '@/lib/domain/repositories'
import type { TeamProfile } from '@/lib/domain/entities'

const profile: TeamProfile = {
  headline: 'Cinco estudiantes, una misma visión',
  description:
    'Somos un grupo de muchachos de grado once de bachillerato con una gran visión a futuro. Creemos que la tecnología puede cambiar la forma en que nos relacionamos con el planeta, y SPING es nuestro primer giro hacia ese futuro.',
  collectiveStatement:
    'SPING es el resultado de integrar tecnología, investigación, diseño, comunicación y la creatividad de sus cinco integrantes.',
  members: [
    {
      id: 'luis-magon',
      fullName: 'Luis Eduardo Magón Narváez',
      displayName: 'Luis Magón',
      role: 'Asesor comercial y desarrollo digital',
      description:
        'Asesor comercial de SPING: gestiona alianzas y contacto con aliados. Diseña la página web, proyecta la futura aplicación y apoyó la construcción del prototipo.',
    },
    {
      id: 'david-hoyos',
      fullName: 'David Santiago Hoyos Tróchez',
      displayName: 'David Hoyos',
      role: 'Líder tecnológico',
      description:
        'Responsable de la concepción tecnológica, la programación, la electrónica y el desarrollo del primer modelo SPING.',
    },
    {
      id: 'isabel-salamanca',
      fullName: 'Isabel Salamanca Vargas',
      displayName: 'Isabel Salamanca',
      role: 'Diseño físico y experiencia',
      description:
        'Construcción del stand, tarjetas SPING, elementos visuales y propuesta de presentación física del prototipo.',
    },
    {
      id: 'andres-camilo',
      fullName: 'Andrés Camilo Fernández Miranda',
      displayName: 'Andrés Camilo',
      role: 'Producción audiovisual',
      description:
        'Elaboración del material audiovisual, animaciones y recursos para comunicar el proyecto.',
    },
    {
      id: 'david-martinez',
      fullName: 'David Esteban Martínez Rosales',
      displayName: 'David Martínez',
      role: 'Diseño y experiencia visual',
      description:
        'Construcción del stand, elementos gráficos y material visual del proyecto.',
    },
  ],
}

export class StaticTeamRepository implements TeamRepository {
  getProfile() {
    return profile
  }
}
