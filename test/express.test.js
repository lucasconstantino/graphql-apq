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
})
