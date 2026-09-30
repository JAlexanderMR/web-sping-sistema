import type { ContactRepository } from '@/lib/domain/repositories'
import type { ContactInfo } from '@/lib/domain/entities'

const contact: ContactInfo = {
  headline: 'Hablemos de SPING',
  description:
    '¿Quieres llevar SPING a tu colegio, empresa o comunidad? ¿Te interesa apoyar el proyecto? Escríbenos y con gusto te contamos más.',
  advisor: {
    name: 'Luis Magón',
    role: 'Asesor comercial',
    phone: '+57 3108338515',
  },
  email: 'robaunbrainrothl@gmail.com',
  location: {
    municipality: 'Timbío',
    department: 'Cauca',
    country: 'Colombia',
  },
}

export class StaticContactRepository implements ContactRepository {
  getContactInfo() {
    return contact
  }
}
