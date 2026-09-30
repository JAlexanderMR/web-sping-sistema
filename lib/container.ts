import {
  ContactService,
  FutureService,
  ProjectService,
  PrototypeService,
  TeamService,
} from './application/services'
import { StaticContactRepository } from './infrastructure/static-contact-repository'
import { StaticFutureRepository } from './infrastructure/static-future-repository'
import { StaticProjectRepository } from './infrastructure/static-project-repository'
import { StaticPrototypeRepository } from './infrastructure/static-prototype-repository'
import { StaticTeamRepository } from './infrastructure/static-team-repository'

export const container = {
  projectService: new ProjectService(new StaticProjectRepository()),
  prototypeService: new PrototypeService(new StaticPrototypeRepository()),
  futureService: new FutureService(new StaticFutureRepository()),
  teamService: new TeamService(new StaticTeamRepository()),
  contactService: new ContactService(new StaticContactRepository()),
}
