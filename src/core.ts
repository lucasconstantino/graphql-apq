import { getStorage } from './memory-storage'

export interface CacheInterface {
  get: (key: string) => string | null | Promise<string | null>
  set: (key: string, value: string) => void | Promise<void>
  has: (key: string) => boolean | Promise<boolean>
}

export interface Operation {
  query?: string
  extensions?: { persistedQuery?: { sha256Hash?: string } }
}

export type HashResolver = (
  operation: Operation
) => string | null | Promise<string | null>

export interface APQConfig {
  cache?: CacheInterface
  notFoundResponse?: any
  resolveHash?: HashResolver
}

const defaults = {
  cache: getStorage(),
  notFoundResponse: { errors: [{ message: 'PersistedQueryNotFound' }] },
  resolveHash: (operation: Operation) =>
    operation?.extensions?.persistedQuery?.sha256Hash || null,
}

class APQ {
  private cache: CacheInterface
  private notFoundResponse: any
  private resolveHash: HashResolver

  constructor(_config?: APQConfig) {
    const config = { ...defaults, ..._config }

    this.cache = config.cache
    this.notFoundResponse = config.notFoundResponse
    this.resolveHash = config.resolveHash

    this.validateConfig()
  }

  private validateConfig() {
    const cacheMethods = ['get', 'set', 'has'] as const

    if (!this.cache || !cacheMethods.every((key) => this.cache[key])) {
      throw new Error('Invalid cache provided')
    }

    if (typeof this.resolveHash !== 'function') {
      throw new Error('Invalid resolveHash provided')
    }
  }

  /**
   * Processes an operation and ensure query is set, when possible.
   */
  async processOperation(operation: Operation) {
    if (typeof operation !== 'object' && typeof operation !== 'undefined') {
      throw new Error('Invalid operation provided')
    }

    if (!operation) {
      throw new Error('No operation provided')
    }

    const { query } = operation
    const hash = await this.resolveHash(operation)

    // Proceed with unmodified operation in case no hash is present.
    if (!hash) {
      return operation
    }

    const isCached = hash && (await this.cache.has(hash))

    // Proceed with unmodified operation in case query is present and already cached.
    if (query && isCached) {
      return operation
    }

    // Append query to the operation in case we have it cached.
    if (!query && isCached) {
      return { ...operation, query: this.cache.get(hash) }
    }

    // Add the query to the cache in case we don't have it yet.
    if (query && !isCached) {
      await this.cache.set(hash, query)
    }

    // Proceed with unmodified operation in case we couldn't find a query.
    return operation
  }

  /**
   * Retrieve a valid GraphQL error for the persisted queries load failure.
   */
  getNotFoundResponse() {
    return this.notFoundResponse
  }
}

export { APQ }
