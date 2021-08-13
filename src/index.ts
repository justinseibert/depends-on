import { DEPO, INIT, CACH, RELA } from './constants'

export interface CachePropertyDescriptor<T, R> extends PropertyDescriptor {
  get?: (this: T) => R
}

// adds cache trackers to the object instance
const initializeCache = function (instance: any) {
  instance[DEPO] = instance[DEPO] || {
    [INIT]: {},
    [CACH]: {},
    [RELA]: {},
  }
}

// set all initial values for dependent properties
// set initialization key to avoid performing more than once
const initializeRelated = function (instance: any, currentKey: string, dependencies: string[]) {
  if (typeof instance[DEPO][INIT][currentKey] === 'undefined') {
    dependencies.forEach((dependency: string) => {
      const property = Object.getOwnPropertyDescriptor(instance, dependency)
      if (property && instance[DEPO][CACH][dependency] !== property.value) {
        instance[DEPO][CACH][dependency] = property.value
      }
      instance[DEPO][RELA][dependency] = [...(instance[DEPO][RELA][dependency] || []), currentKey]
    })
  }
  instance[DEPO][INIT][currentKey] = true
}

// if cache is invalid, invalidate all related items too
const invalidateRelated = (instance: any, cacheKey: string) => {
  const relatedCache = [...(instance[DEPO][RELA][cacheKey] || [])]

  while (relatedCache.length) {
    const relatedKey = relatedCache.pop()
    instance[DEPO][CACH][relatedKey] = undefined
    invalidateRelated(instance, relatedKey)
  }
}

const dependsOn = function (dependencies: string[]) {
  return function <T,R>(target: any, key: PropertyKey, descriptor: CachePropertyDescriptor<T, R>) {
    // record any existing get/set actions
    const getter = descriptor.get
    const setter = descriptor.set
    
    if (!getter) {
      throw new TypeError('The dependsOn decorator expects a getter')
    }
    
    const currentKey = String(key)
    descriptor.get = function (this: any) {
      initializeCache(this)
      initializeRelated(this, currentKey, dependencies)
      // add current key to dependencies array in order to force an initial update or shortcut an invalidated cache
      // check for any undefined/invalid caches to determine whether an update is necessary
      const shouldUpdate = [currentKey, ...dependencies].findIndex((dependency: string) => {
        // test that cache value exists or is valid
        if (typeof this[DEPO][CACH][dependency] === 'undefined') {
          return true
        }
        
        // test that property value is valid
        const property = Object.getOwnPropertyDescriptor(this, dependency)
        if (property && this[DEPO][CACH][dependency] !== property.value) {
          this[DEPO][CACH][dependency] = property.value
          return true
        }

        // cached dependency is valid, no update necesssary
        return false
      }) > -1

      // needs to update value and cache
      // call the originally defined getter function and invalidate related caches
      if (shouldUpdate) {
        this[DEPO][CACH][currentKey] = getter.call(this)
        invalidateRelated(this, currentKey)
      }

      // return the synced cache values
      return this[DEPO][CACH][currentKey]
    }

    // setter wrapper ensures the cache is also updated
    if (setter) {
      descriptor.set = function (this: any, value: any) {
        initializeCache(this)
        initializeRelated(this, currentKey, dependencies)

        this[DEPO][CACH][currentKey] = value
        setter && setter.call(this, value)
      }
    }
  }
}

export default dependsOn