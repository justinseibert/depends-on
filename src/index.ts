export interface CachePropertyDescriptor<T, R> extends PropertyDescriptor {
  get?: (this: T) => R
};

const INIT = `__dependsOn_isInitialized`
const CACH = `__dependsOn_cache`
const RELA = `__dependsOn_related`

const dependsOn = function (dependencies: string[]) {
  return function <T,R>(target: any, key: PropertyKey, descriptor: CachePropertyDescriptor<T, R>) {
    // record any existing get/set actions
    const getter = descriptor.get
    const setter = descriptor.set
    
    if (!getter) {
      throw new TypeError('The dependsOn decorator expects a getter')
    }
    
    const currentKey = String(key)
    
    // adds cache trackers to the object instance
    const initializeCache = function (instance: any) {
      [INIT, CACH, RELA].forEach((item: string) => {
        instance[item] = instance[item] || {}
      })
    }

    // set all initial values for dependent properties
    // set initialization key to avoid performing more than once
    const initializeRelated = function(instance: any) {
      if (typeof instance[INIT][currentKey] === 'undefined') {
        dependencies.forEach((dependency: string) => {
          const property = Object.getOwnPropertyDescriptor(instance, dependency)
          if (property && instance[CACH][dependency] !== property.value) {
            instance[CACH][dependency] = property.value
          }
          instance[RELA][dependency] = [...(instance[RELA][dependency] || []), currentKey]
        })
      }
      instance[INIT][currentKey] = true
    }

    // if cache is invalid, invalidate all related items too
    const invalidateRelated = (instance: any, cacheKey: string) => {
      const relatedCache = [...(instance[RELA][cacheKey] || [])]

      while (relatedCache.length) {
        const relatedKey = relatedCache.pop()
        instance[CACH][relatedKey] = undefined
        invalidateRelated(instance, relatedKey)
      }
    }
    
    descriptor.get = function (this: any) {
      initializeCache(this)
      initializeRelated(this)
      // add current key to dependencies array in order to force an initial update or shortcut an invalidated cache
      // check for any undefined/invalid caches to determine whether an update is necessary
      const shouldUpdate = [currentKey, ...dependencies].findIndex((dependency: string) => {
        // test that cache value exists or is valid
        if (typeof this[CACH][dependency] === 'undefined') {
          return true
        }
        
        // test that property value is valid
        const property = Object.getOwnPropertyDescriptor(this, dependency)
        if (property && this[CACH][dependency] !== property.value) {
          this[CACH][dependency] = property.value
          return true
        }

        // cached dependency is valid, no update necesssary
        return false
      }) > -1
      

      // needs to update value and cache
      // call the originally defined getter function and invalidate related caches
      if (shouldUpdate) {
        this[CACH][currentKey] = getter.call(this)
        invalidateRelated(this, currentKey)
      }

      // return the synced cache values
      return this[CACH][currentKey]
    }

    // setter wrapper ensures the cache is also updated
    if (setter) {
      descriptor.set = function (this: any, value: any) {
        initializeCache(this)

        this[CACH][currentKey] = value
        setter && setter.call(this, value)
      }
    }
  }
}

export default dependsOn