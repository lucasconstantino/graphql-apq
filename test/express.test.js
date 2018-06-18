import express, { Router } from 'express'
import request from 'supertest'
import bodyParser from 'body-parser'
import { graphqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'

import persistedQuery from 'graphql-apq/express'

describe('express middleware', () => {
  let next
  let req
  let res

  beforeEach(() => {
    req = {}
    res = {
      setHeader: jest.fn(),
      send: jest.fn()
    }
    next = jest.fn()
  })

  describe('defaults', () => {
    const middleware = persistedQuery()

    it('should do nothing when no body is available', () => {
      middleware(req, res, next)
      expect(next).toHaveBeenCalled()
      expect(req.body).toEqual(req.body)
    })

    it('should do nothing on queries with no persisted query data', () => {
      const body = {
        operationName: 'Name',
        query: 'query content',
        variables: {}
      }

      middleware({ ...req, body }, res, next)
      expect(next).toHaveBeenCalled()
      expect(req.body).toEqual(req.body)
    })

    it('should respond with not found response when no query is found', () => {
      const body = {
        extensions: { persistedQuery: { sha256Hash: 'some hash' } },
        operationName: 'Name',
        variables: {}
      }

      middleware({ ...req, body }, res, next)

      expect(res.send).toHaveBeenCalledTimes(1)
      expect(res.send.mock.calls[0][0]).toEqual(
        JSON.stringify({
          errors: [{ message: 'PersistedQueryNotFound' }]
        })
      )
    })

    it('should persist query when both hash an query are provided', () => {
      const sha256Hash = 'some hash'
      const query = 'some query'

      const cache = {
        put: jest.fn(),
        get: jest.fn(),
        keys: () => []
      }

      const body = {
        query,
        extensions: { persistedQuery: { sha256Hash } },
        operationName: 'Name',
        variables: {}
      }

      const middleware = persistedQuery({ cache })

      middleware({ ...req, body }, res, next)

      expect(cache.put).toHaveBeenCalledTimes(1)
      expect(cache.put).toHaveBeenCalledWith(sha256Hash, query)
    })

    it('should fulfil operation with previously persisted query', () => {
      const sha256Hash = 'some hash'
      const query = 'some query'

      const cache = {
        put: jest.fn(),
        get: jest.fn(() => query),
        keys: () => [sha256Hash]
      }

      const body = {
        extensions: { persistedQuery: { sha256Hash } },
        operationName: 'Name',
        variables: {}
      }

      const request = { ...req, body }

      const middleware = persistedQuery({ cache })

      expect(request.body).not.toHaveProperty('query', query)
      middleware(request, res, next)

      expect(cache.get).toHaveBeenCalledTimes(1)
      expect(cache.get).toHaveBeenCalledWith(sha256Hash)
      expect(request.body).toHaveProperty('query', query)
    })
  })

  describe('integration', () => {
    let app

    beforeEach(() => {
      const typeDefs = `
        type SomeType {
          field: String
        }

        type Query {
          someType: SomeType
        }

        schema {
          query: Query
        }
      `

      const resolvers = {
        Query: {
          someType: () => ({})
        },
        SomeType: {
          field: () => 'field value'
        }
      }

      const schema = makeExecutableSchema({ typeDefs, resolvers })

      const graphql = new Router()
        .use(bodyParser.json())
        .use(persistedQuery())
        .use(
          graphqlExpress({
            schema
          })
        )

      app = express().use('/graphql', graphql)
    })

    const operationName = 'SomeOperation'

    const query = `
        query ${operationName} {
          someType {
            field
          }
        }
      `

    const sha256Hash = 'some-hash'
    const extensions = { persistedQuery: { sha256Hash } }

    const promisifyRequest = req =>
      new Promise((resolve, reject) =>
        req.end((err, res) => (err ? reject(err) : resolve(res)))
      )

    const requests = {
      query: () =>
        promisifyRequest(
          request(app)
            .post('/graphql')
            .send({
              operationName,
              query
            })
        ),
      hash: () =>
        promisifyRequest(
          request(app)
            .post('/graphql')
            .send({
              operationName,
              extensions
            })
        ),
      hashAndQuery: () =>
        promisifyRequest(
          request(app)
            .post('/graphql')
            .send({
              operationName,
              extensions,
              query
            })
        )
    }

    it('should respond default query based queries', async () => {
      const response = await requests.query()
      expect(response.body).toHaveProperty('data.someType.field', 'field value')
    })

    it('should respond with not found response when hash is given but no query is found', async () => {
      const response = await requests.hash()
      expect(response.body).toHaveProperty(
        'errors.0.message',
        'PersistedQueryNotFound'
      )
    })

    it('should respond when both hash and query are provided', async () => {
      const response = await requests.hashAndQuery()
      expect(response.body).toHaveProperty('data.someType.field', 'field value')
    })

    it('should cache hash based request and respond subsequent calls correctly', async () => {
      let full
      let hash

      hash = await requests.hash()
      expect(hash.body).not.toHaveProperty('data.someType.field', 'field value')
      expect(hash.body).toHaveProperty(
        'errors.0.message',
        'PersistedQueryNotFound'
      )

      full = await requests.hashAndQuery()
      expect(full.body).toHaveProperty('data.someType.field', 'field value')
      expect(full.body).not.toHaveProperty(
        'errors.0.message',
        'PersistedQueryNotFound'
      )

      hash = await requests.hash()
      expect(hash.body).toHaveProperty('data.someType.field', 'field value')
      expect(hash.body).not.toHaveProperty(
        'errors.0.message',
        'PersistedQueryNotFound'
      )
    })
  })
})
