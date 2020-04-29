import { getStorage } from './memory-storage'
import { errors, PersistedQueryError } from './errors'

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

export type ErrorFormatter = (error: PersistedQueryError) => any

export interface APQConfig {
  cache?: CacheInterface
  formatError?: ErrorFormatter
  requireHash?: boolean
  resolveHash?: HashResolver
}

const defaults = {
  cache: getStorage(),
  requireHash: true,
  formatError: (error: PersistedQueryError) => ({
    errors: [{ message: error.message }],
  }),
  resolveHash: (operation: Operation) =>
    operation?.extensions?.persistedQuery?.sha256Hash || null,
}

class APQ {
  private cache: CacheInterface
  private requireHash: boolean
  private resolveHash: HashResolver
  public formatError: ErrorFormatter

  constructor(_config?: APQConfig) {
    const config = { ...defaults, ..._config }

    this.cache = config.cache
    this.formatError = config.formatError
    this.requireHash = config.requireHash
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
      throw new Error('Invalid GraphQL operation provided')
    }

    if (!operation) {
      throw new Error('No GraphQL operation provided')
    }

    const { query } = operation
    const hash = await this.resolveHash(operation)

    if (!hash) {
      // Advise user on missing required hash.
      if (this.requireHash) {
        throw new errors.HASH_MISSING()
      }

      // Proceed with unmodified operation in case no hash is present.
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

    // Proceed with original operation if we had both query and hash, but was
    // already cached.
    if (query) {
      return operation
    }

    // Fail with no persisted query found in case no query could be resolved.
    throw new errors.NOT_FOUND()
  }
}

export { APQ }
