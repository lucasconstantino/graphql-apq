import APQ from 'graphql-apq'

describe('core', () => {
  let cache
  let apq

  const getCache = () => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
  })

  beforeEach(() => {
    cache = getCache()
    apq = new APQ({ cache })
  })

  it('should create an APQ instance', () => {
    expect(new APQ()).toBeInstanceOf(APQ)
  })

  describe('cache', () => {
    it('should create a default cache object', () => {
      const cache = new APQ().cache
      expect(cache).toHaveProperty('get', expect.any(Function))
      expect(cache).toHaveProperty('set', expect.any(Function))
      expect(cache).toHaveProperty('has', expect.any(Function))
    })

    it('should be possible to provide a custom cache object', () => {
      const cache = getCache()
      expect(new APQ({ cache }).cache).toBe(cache)
    })

    it('should throw for invalid custom cache', () => {
      expect(() => new APQ({ cache: '' })).toThrow('Invalid cache')
      expect(() => new APQ({ cache: {} })).toThrow('Invalid cache')
    })

    it('should throw for invalid resolveHash', () => {
      expect(() => new APQ({ resolveHash: '' })).toThrow('Invalid resolveHash')
      expect(() => new APQ({ resolveHash: {} })).toThrow('Invalid resolveHash')
    })
  })

  describe('getNotFoundResponse', () => {
    it('should return a default persisted query not found response', () => {
      expect(new APQ().getNotFoundResponse()).toHaveProperty(
        'errors.0.message',
        'PersistedQueryNotFound'
      )
    })

    it('should be possible to provide a custom persisted query not found response', () => {
      const notFoundResponse = {}
      expect(new APQ({ notFoundResponse }).getNotFoundResponse()).toBe(
        notFoundResponse
      )
    })
  })

  describe('processOperation', () => {
    it.each([
      [1, 'Invalid operation provided'],
      ['', 'Invalid operation provided'],
      [null, 'No operation provided'],
      [undefined, 'No operation provided'],
    ])('should throw for invalid operations', (op, expected) => {
      return expect(() => apq.processOperation(op)).rejects.toThrow(expected)
    })

    describe('should return unaltered operation', () => {
      it('when no hash is available', async () => {
        const operation = {}
        expect(await apq.processOperation(operation)).toBe(operation)
      })

      it('when provided hash is not cached', async () => {
        const sha256Hash = 'some hash'
        const operation = { extensions: { persistedQuery: { sha256Hash } } }
        expect(await apq.processOperation(operation)).toBe(operation)
      })

      it('when there is a query and it is already cached', async () => {
        const query = 'some query'
        const sha256Hash = 'some hash'

        const operation = {
          query,
          extensions: { persistedQuery: { sha256Hash } },
        }

        await apq.cache.set(sha256Hash, query)

        expect(await apq.processOperation(operation)).toBe(operation)
      })
    })

    it('should add the query to the operation when already cached', async () => {
      const query = 'some query'
      const sha256Hash = 'some hash'
      const operation = { extensions: { persistedQuery: { sha256Hash } } }

      cache.has.mockReturnValueOnce(true)
      cache.get.mockReturnValueOnce(query)

      const result = await apq.processOperation(operation)

      expect(result).toHaveProperty('query', query)
    })

    it('should add the query to the cache when both query and hash are available', async () => {
      const query = 'some query'
      const sha256Hash = 'some hash'

      const operation = {
        query,
        extensions: { persistedQuery: { sha256Hash } },
      }

      expect(await apq.processOperation(operation)).toBe(operation)

      expect(apq.cache.set).toHaveBeenCalledTimes(1)
      expect(apq.cache.set).toHaveBeenCalledWith(sha256Hash, query)
    })
  })
})
