import gql from 'graphql-tag'

export const typeDef = gql`
  # Types
  type __EntityName__ {
    name: String
  }

  input New__EntityName__Input {
    name: String
  }

  input Update__EntityName__Input {
    name: String
  }

  # Queries
  extend type Query {
    __modulename__s: [__EntityName__]
    __modulename__(_id: ID!): __EntityName__
  }

  # Mutations
  extend type Mutation {
    create__EntityName__(
      __modulename__: New__EntityName__Input!
    ): __EntityName__
    delete__EntityName__(_id: ID!): __EntityName__
    update__EntityName__(
      _id: ID!
      __modulename__: Update__EntityName__Input!
    ): __EntityName__
  }
`
