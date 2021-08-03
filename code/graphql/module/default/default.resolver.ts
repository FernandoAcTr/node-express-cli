export const resolver = {
  Query: {
    greet() {
      return 'Hello World!'
    },
  },
  Mutation: {
    greetPerson(_: unknown, { name }: unknown) {
      return `Hello ${name}`
    },
  },
}
