import { __EntityName__Service } from './services/__modulename__.service'
const repository = new __EntityName__Service()

export const resolver = {
  Query: {
    async __modulename__s() {
      return repository.findAll()
    },
    async __modulename__(root: any, args: any) {
      return repository.findOne(args._id)
    },
  },

  Mutation: {
    async create__EntityName__(root: any, args: any) {
      return repository.store(args)
    },
    async delete__EntityName__(root: any, args: any) {
      return repository.destroy(args._id)
    },
    async update__EntityName__(root: any, args: any) {
      return repository.update(args._id, args.alumno)
    },
  },
}
