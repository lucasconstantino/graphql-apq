import { path } from 'ramda'
import { Cache } from 'memory-cache'

const defaultNotFoundResponse = {
  errors: [{ message: 'PersistedQueryNotFound' }],
}

export default class APQ {
  constructor (config = {}) {
    this.cache = config.cache || new Cache()
    this.notFoundResponse = config.notFoundResponse || defaultNotFoundResponse
    this.resolveHash =
      config.resolvehash || path(['extensions', 'persistedQuery', 'sha256Hash'])
  }

  /**
   * Processes an operation and ensure query is set, when possible.
   */
  processOperation (operation) {
    if (!operation) {
      throw new Error('No operation provided')
    }

    const { query } = operation
    const hash = this.resolveHash(operation)

    // Return unmodified operation in case no hash is present.
    if (!hash) {
      return operation
    }

    const isCached = this.cache.keys().indexOf(hash) !== -1

    // Return unmodified operation in case query is already cached.
    if (query && isCached) {
      return operation
    }

    // Add the query to the operation in case we have it cached.
    if (!query && isCached) {
      return { ...operation, query: this.cache.get(hash) }
    }

    // Add the query to the cache in case we don't have it yet.
    if (query && !isCached) {
      this.cache.put(hash, query)
    }

    // When we have no query on the operation nor the cache we simply
    // return the operation unaltered.
    return operation
  }

  /**
   * Retrieve a valid GraphQL error for the persisted queries load failure.
   */
  getNotFoundResponse () {
    return this.notFoundResponse
  }
}
