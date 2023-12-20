/*
 * This file defines the base schema
 * of the Api. Defining the data type
 * for queries (Query) and
 * mutations (Mutation).
 */
import gql from 'graphql-tag'

export const typeDef = gql`
  type Query {
    salute: String
  }
`
