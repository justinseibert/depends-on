export interface CachePropertyDescriptor<T, R> extends PropertyDescriptor {
  get?: (this: T) => R
};

const PROPS = `__dependsOn_properties`
const CACHE = `__dependsOn_comparator`
const RELAT = `__dependsOn_related`

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
    const addCacheInstance = function (_this: any) {
      [PROPS, CACHE, RELAT].forEach((item: string) => {
        _this[item] = _this[item] || {}
      })
    }
    
    descriptor.get = function (this: any) {
      addCacheInstance(this)
      // set all initial values for dependent properties
      // perform only during first access
      if (typeof this[PROPS][currentKey] === 'undefined') {
        dependencies.forEach((dependency: string) => {
          const propertyDescriptor = Object.getOwnPropertyDescriptor(this, dependency)
          if (
            propertyDescriptor &&
            typeof this[PROPS][dependency] === 'undefined'
          ) {
            // current dependency is a property, record new values to cache
            this[PROPS][dependency] = propertyDescriptor.value
            this[CACHE][dependency] = this[PROPS][dependency]
          }
          // record an array of items that depend on this value (i.e. reverse dependencies)
          this[RELAT][dependency] = [...(this[RELAT][dependency] || []), currentKey]
        })
      }

      // add current key to dependencies array in order to force an initial update or shortcut an invalidated cache
      // check for any undefined/invalid caches to determine whether an update is necessary
      const shouldUpdate = [currentKey, ...dependencies].findIndex((dependency: string) => {
        // test cached getter values
        if (
          typeof this[CACHE][dependency] === 'undefined' ||
          typeof this[PROPS][dependency] === 'undefined' ||
          this[PROPS][dependency] !== this[CACHE][dependency]
          ) {
            // current dependency's cached values are new or invalid
            return true
          }
          
        // test cached property values
        const propertyDescriptor = Object.getOwnPropertyDescriptor(this, dependency)
        if (
          propertyDescriptor &&
          (this[PROPS][dependency] !== propertyDescriptor.value ||
          typeof this[CACHE][dependency] === 'undefined')
        ) {
          // current dependency is a property with a new value, record to cache
          this[PROPS][dependency] = propertyDescriptor.value
          this[CACHE][dependency] = this[PROPS][dependency]
          return true
        }

        // cached dependency is valid, no update necesssary
        return false
      }) > -1

      // if cache is invalid, invalidate all related items too
      const invalidateRelated = (cacheKey: string) => {
        const relatedCache = [ ...(this[RELAT][cacheKey] || []) ]
        
        while(relatedCache.length) {
          const relatedKey = relatedCache.pop()
          this[CACHE][relatedKey] = undefined
          invalidateRelated(relatedKey)
        }
      }

      // needs to update value and cache
      // call the defined getter function and invalidate related caches
      if (shouldUpdate) {
        this[PROPS][currentKey] = getter.call(this)
        invalidateRelated(currentKey)
      }

      // return the synced cache values
      return this[CACHE][currentKey] = this[PROPS][currentKey]
    }

    // setter wrapper ensures the cache is also updated
    if (setter) {
      descriptor.set = function (this: any, value: any) {
        addCacheInstance(this)

        this[CACHE][currentKey] = this[PROPS][currentKey] = value
        setter && setter.call(this, value)
      }
    }
  }
}

export default dependsOn