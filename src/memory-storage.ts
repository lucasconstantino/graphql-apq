import { Cache } from 'memory-cache'

export interface CacheInterface {
  get: (key: string) => string | Promise<string>
  set: (key: string, value: string) => void | Promise<void>
  has: (key: string) => boolean | Promise<boolean>
}

const getStorage = () => {
  const cache = new Cache<string, string>()

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: string) => void cache.put(key, value),
    has: (key: string) => cache.keys().includes(key),
  }
}

export { getStorage }
