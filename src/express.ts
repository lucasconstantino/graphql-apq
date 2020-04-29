import APQ from './core'

export default (options) => {
  const apq = new APQ(options)

  return (req, res, next) => {
    // Skip when no persistedQuery data is available.
    if (
      !req.body ||
      !req.body.extensions ||
      !req.body.extensions.persistedQuery
    ) {
      next()
      return
    }

    req.body = apq.processOperation(req.body)

    // No query found response.
    if (!req.body.query) {
      res.setHeader('Content-Type', 'application/json')
      res.send(JSON.stringify(apq.getNotFoundResponse()))
      return
    }

    next()
  }
}
