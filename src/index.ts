import { DEPO, INIT, CACH, RELA } from './constants'

export interface CachePropertyDescriptor<T, R> extends PropertyDescriptor {
  get?: (this: T) => R
}

const isUndefined = (value: any) => {
  return typeof value === 'undefined'
}

// adds cache trackers to the object instance
const initializeCache = function (instance: any) {
  instance[DEPO] = instance[DEPO] || {
    [INIT]: {},
    [CACH]: {},
    [RELA]: {},
  }
}

const initializeRelated = function (instance: any, currentKey: string, dependencies: string[]) {
  // skip if already initialized for this key
  if (!isUndefined(instance[DEPO][INIT][currentKey])) {
    return
  }

  dependencies.forEach((dependency: string) => {
    // if dependency is a property, convert to accessor
    const property = Object.getOwnPropertyDescriptor(instance, dependency)
    // if property has not been initialized
    if (property && isUndefined(instance[DEPO][INIT][dependency])) {
      instance[DEPO][CACH][dependency] = property.value
      
      Object.defineProperty(instance, dependency,  {
        // create a getter function that retrieves cached value for this property
        get: function (this: any) {
          const getter = function(this: any) {
            return this[DEPO][CACH][dependency]
          }
          return handleGet.call(this, dependency, [], getter)
        },
        // create a setter but because this was a property...
        // there is no original setter function to apply
        set: function (this: any, value: any) {
          return handleSet.call(this, dependency, value, [])
        },
      })
      // consider this new accessor to be initialized
      instance[DEPO][INIT][dependency] = true
    }

    // map the currentKey as being related to this dependency
    instance[DEPO][RELA][dependency] = [...(instance[DEPO][RELA][dependency] || []), currentKey]
  })

  // consider this accessor initialized
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

const handleGet = function(
  this: any,
  key: string,
  dependencies: string[],
  getter: () => any
) {
  initializeCache(this)
  initializeRelated(this, key, dependencies)

  // add current key to dependencies array in order to force an initial update or shortcut an invalidated cache
  // check for any undefined/invalid caches to determine whether an update is necessary
  const shouldUpdate = [key, ...dependencies].findIndex((dependency: string) => {
    // test that cache value exists or is valid
    return isUndefined(this[DEPO][CACH][dependency])
  }) > -1

  // needs to update value and cache
  // call the originally defined getter function and invalidate related caches
  if (shouldUpdate) {
    this[DEPO][CACH][key] = getter.call(this)
    invalidateRelated(this, key)
  }

  // return the synced cache values
  return this[DEPO][CACH][key]
}

const handleSet = function(
  this: any,
  currentKey: string,
  value: any,
  dependencies: string[],
  setter?: (v: any) => void
) {
  initializeCache(this)
  initializeRelated(this, currentKey, dependencies)

  invalidateRelated(this, currentKey)
  setter && setter.call(this, value)

  this[DEPO][CACH][currentKey] = value
}

const dependsOn = function (dependencies: string[]) {
  return function <T,R>(
    _: any,
    key: PropertyKey,
    descriptor: CachePropertyDescriptor<T, R>
  ): void {
    // record any existing get/set actions
    const getter = descriptor.get
    const setter = descriptor.set
    
    if (!getter) {
      throw new TypeError('The dependsOn decorator expects a getter')
    }

    const currentKey = String(key)
    
    descriptor.get = function () {
      return handleGet.call(this, currentKey, dependencies, getter)
    }
    
    descriptor.set = function (value: any) {
      handleSet.call(this, currentKey, value, dependencies, setter)
    }
  }
}

export default dependsOn