/*
 * This file defines the base schema
 * of the Api. Defining the data type
 * for queries (Query) and
 * mutations (Mutation).
 */
import { gql } from 'apollo-server-express'

export const typeDef = gql`
  type Query {
    greet: String
  }

  type Mutation {
    greetPerson(name: String!): String!
  }
`
