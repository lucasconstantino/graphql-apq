import APQ from 'graphql-apq'

describe('core', () => {
  it('should create an APQ instance', () => {
    expect(new APQ()).toBeInstanceOf(APQ)
  })

  describe('cache', () => {
    it('should create a default cache object', () => {
      const cache = new APQ().cache
      expect(cache).toHaveProperty('put')
      expect(cache).toHaveProperty('get')
    })

    it('should be possible to provide a custom cache object', () => {
      const cache = {}
      expect(new APQ({ cache }).cache).toBe(cache)
    })
  })

  describe('getNotFoundResponse', () => {
    it('should return a default persisted query not found response', () => {
      expect(new APQ().getNotFoundResponse()).toEqual({
        errors: [{ message: 'PersistedQueryNotFound' }]
      })
    })

    it('should be possible to provide a custom persisted query not found response', () => {
      const notFoundResponse = {}
      expect(new APQ({ notFoundResponse }).getNotFoundResponse()).toBe(
        notFoundResponse
      )
    })
  })

  describe('processOperation', () => {
    let apq

    beforeEach(() => {
      apq = new APQ()
    })

    it('should throw for invalid operations', () => {
      expect(() => apq.processOperation(null)).toThrow('No operation provided')
    })

    it('should return unaltered operation when no hash is available', () => {
      const operation = {}
      expect(apq.processOperation(operation)).toBe(operation)
    })

    it('should return unaltered operation when provided hash is not cached', () => {
      const sha256Hash = 'some hash'
      const operation = {
        extensions: { persistedQuery: { sha256Hash } }
      }
      expect(apq.processOperation(operation)).toBe(operation)
    })

    it('should return unaltered operation when there is a query and it is already cached', () => {
      const query = 'some query'
      const sha256Hash = 'some hash'
      const operation = {
        query,
        extensions: { persistedQuery: { sha256Hash } }
      }

      apq.cache.put(sha256Hash, query)

      expect(apq.processOperation(operation)).toBe(operation)
    })

    it('should add the query to the operation when already cached', () => {
      const query = 'some query'
      const sha256Hash = 'some hash'
      const operation = {
        extensions: { persistedQuery: { sha256Hash } }
      }

      apq.cache.put(sha256Hash, query)

      expect(apq.processOperation(operation)).toEqual({
        ...operation,
        query
      })
    })

    it('should add the query to the cache when both query and hash are available', () => {
      const query = 'some query'
      const sha256Hash = 'some hash'
      const operation = {
        query,
        extensions: { persistedQuery: { sha256Hash } }
      }

      apq.cache.put = jest.fn()
      apq.processOperation(operation)

      expect(apq.cache.put).toHaveBeenCalledTimes(1)
      expect(apq.cache.put).toHaveBeenCalledWith(sha256Hash, query)
    })
  })
})
