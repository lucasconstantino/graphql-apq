import { RequestHandler } from 'express'
import { APQ, APQConfig } from './core'
import { PersistedQueryError } from './errors'

export default (options?: APQConfig): RequestHandler => {
  const apq = new APQ(options)

  return async (req, res, next) => {
    try {
      req.body = await apq.processOperation(req.body)
      next()
    } catch (error) {
      // Respond known errors gracefully
      if (error instanceof PersistedQueryError) {
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify(apq.formatError(error)))
        return
      }

      next(error)
    }
  }
}
