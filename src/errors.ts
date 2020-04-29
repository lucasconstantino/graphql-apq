class PersistedQueryError extends Error {}

/**
 * Error for when no query could be resolve.
 */
class PersistedQueryNotFound extends PersistedQueryError {
  public message = 'PersistedQueryNotFound'
}

/**
 * Error for when no hash is found in the operation.
 */
class PersistedQueryHashMissing extends PersistedQueryError {
  public message = 'PersistedQueryHashMissing'
}

const errors = {
  NOT_FOUND: PersistedQueryNotFound,
  HASH_MISSING: PersistedQueryHashMissing,
}

export { PersistedQueryError, errors }
