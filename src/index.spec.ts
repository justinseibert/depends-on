import { DEPO, INIT, CACH, RELA } from './constants'
import dependsOn from './index'

describe('dependsOn: cache decorator', () => {
  it('should permanently cache getters with no dependencies', () => {
    class Test {
      bool = false

      @dependsOn([])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    const initial = test.random

    expect(test.random).toEqual(initial)
    
    test.bool = true
    const update = test.random
    
    expect(update).toEqual(initial)
    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(update)
  })

  it ('should create cache on first get', () => {
    class Test {
      i = 0
      bool = true

      @dependsOn(['bool'])
      get counter() {
        return ++this.i
      }
    }

    const test = new Test()
    let initial = test.counter
    expect((test as any)[DEPO][CACH].bool).not.toBeUndefined()
    expect((test as any)[DEPO][CACH].counter).not.toBeUndefined()

    expect((test as any)[DEPO][CACH].bool).toEqual(true)
    expect((test as any)[DEPO][CACH].counter).toEqual(1)
  })

  it('should cache getter for one dependent property', () => {
    class Test {
      bool = false

      @dependsOn(['bool'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    const initial = test.random

    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(initial)

    test.bool = true
    const update = test.random

    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should create a map of related dependencies', () => {
    class Test {
      a = 1
      b = 2
      c = 3

      @dependsOn(['a', 'b', 'c'])
      get x() {
        return Math.random()
      }

      @dependsOn(['a', 'x'])
      get y() {
        return Math.random()
      }
    }

    const test = new Test()
    expect(test.x).toEqual(test.x)
    expect(test.y).toEqual(test.y)

    expect((test as any)[DEPO][INIT]).not.toBeUndefined()
    expect((test as any)[DEPO][RELA].a).toEqual(expect.arrayContaining(['x', 'y']))
    expect((test as any)[DEPO][RELA].a).toEqual(expect.not.arrayContaining(['a', 'b', 'c']))
    expect((test as any)[DEPO][RELA].b).toEqual(expect.arrayContaining(['x']))
    expect((test as any)[DEPO][RELA].c).toEqual(expect.arrayContaining(['x']))
    expect((test as any)[DEPO][RELA].x).toEqual(expect.arrayContaining(['y']))
  })


  it('should cache getter for multiple dependent properties', () => {
    class Test {
      num = 0
      str = ''

      @dependsOn(['num', 'str'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    let initial = test.random
    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(initial)
    
    test.num = 1
    let update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.str = 'hello'
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should cache the getter with shallow equality for dependent object', () => {
    class Test {
      obj = { a: 1, b: { c: 1 } }

      @dependsOn(['obj'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    let initial = test.random
    expect(test.obj).toMatchObject({ a: 1, b: { c: 1 } })
    test.obj.b.c = 2
    let update = test.random
    expect(update).toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.obj.b = { c: 3 }
    update = test.random
    expect(update).toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.obj = { ...test.obj }
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should cache getter and update cache with setter', () => {
    class Test {
      bool = false
      count = 0

      @dependsOn(['bool'])
      get random() {
        return Math.random()
      }

      set random(value: number) {
        this.count ++
      }
    }

    const test = new Test()
    let initial = test.random
    expect(test.random).toEqual(initial)

    test.bool = true
    let update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    test.random = 5
    expect(test.count).toEqual(1)
    expect(test.random).toEqual(5)
    expect(test.random).toEqual(5)

    initial = test.random
    update = test.random
    expect(update).toEqual(initial)

    test.bool = false
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it ('should update cached value with a set value and assume dependent properties were also updated', () => {
    class Test {
      a = 0
      b = 0

      @dependsOn(['a', 'b'])
      get random() {
        return Math.random()
      }

      set random(value: number) {
        this.a++
        this.b++
      }
    }

    const test = new Test()
    test.random = 5
    expect(test.a).toEqual(1)
    expect(test.b).toEqual(1)

    expect(test.random).toEqual(5)
    expect(test.random).toEqual(5)
    
    test.b = 0
    expect(test.random).not.toEqual(5)
  })

  it ('should update cached value with a set value', () => {
    class Test {
      a = 0
      b = 0

      @dependsOn(['a', 'b'])
      get random() {
        return Math.random()
      }

      set random(value: number) {
        this.a++
        this.b++
      }
    }

    const test = new Test()
    test.random = 5
    expect(test.a).toEqual(1)
    expect(test.b).toEqual(1)
  })

  it('should update cached value with a set value and assume dependent getters were also updated', () => {
    class Test {
      a = 0

      @dependsOn(['a'])
      get b() {
        return Math.random()
      }

      set b(value: number) {
        this.a ++
      }

      @dependsOn(['b'])
      get random() {
        return Math.random()
      }

      set random(value: number) {
        this.b = 10
      }
    }

    const test = new Test()
    test.random = 5
    expect(test.random).toEqual(5)
    
    expect(test.a).toEqual(1)
    expect(test.b).toEqual(10)
    expect(test.b).toEqual(10)
    
    expect(test.random).toEqual(5)
    expect(test.random).toEqual(5)
    
    test.b = 20
    expect(test.a).toEqual(2)
    expect(test.random).not.toEqual(5)
    
    test.random = 5
    test.a = 10
    expect(test.b).not.toEqual(20)
    expect(test.random).not.toEqual(5)
  })

  it('should respect interdependent getters and setters', () => {
    class Test {
      a = 1
  
      @dependsOn(['a'])
      public get random() {
        return this.a + Math.random()
      }
  
      public set random(value) {
        this.a = value - this.a
      }
  
      @dependsOn(['a', 'random'])
      public get difference() {
        return this.random - this.a
      }
    }

    const test = new Test()
    expect(test.random).toEqual(test.random)
    expect(test.random).toBeGreaterThanOrEqual(test.a)
    expect(test.difference).toEqual(test.random - test.a)
    
    test.random = 5
    expect(test.a).toEqual(4)
    expect(test.difference).toEqual(test.random - test.a)
  })

  it('should ignore uncached getters', () => {
    class Test {
      a = 0
  
      public get alwaysUpdate() {
        this.a ++
        return this.a
      }

      @dependsOn(['alwaysUpdate'])
      public get alwaysAhead() {
        return this.alwaysUpdate
      }
    }

    const test = new Test()
    expect(test.alwaysAhead).toEqual(1)
    expect(test.alwaysAhead).not.toEqual(test.alwaysAhead)
    expect(test.alwaysAhead + 1).toEqual(test.alwaysAhead)
    expect(test.a + 1).toEqual(test.alwaysUpdate)
    expect(test.alwaysUpdate).toEqual(7)
  })

  it('should check for and invalidate related cache items', () => {
    class Test {
      c = 0

      @dependsOn(['c'])
      get a() {
        return Math.random()
      }

      @dependsOn(['a'])
      get b() {
        return Math.random()
      }
    }

    const test = new Test()
    let a = test.a
    let b = test.b
    test.c = 1
    expect(test.a).not.toEqual(a)
    let b1 = test.b
    expect(b1).not.toEqual(b)
    expect(test.b).toEqual(b1)
  })

  it('should create a unique cache per instance', () => {
    class Test {
      i = 0
      update = 0

      @dependsOn(['update'])
      get increment() {
        return ++ this.i
      }
    }

    const testA = new Test()
    const testB = new Test()

    let incA = testA.increment
    testA.update ++
    expect(testA.increment).toEqual(2)
    expect(testA.increment).not.toEqual(incA)
    expect(testA.increment).not.toEqual(incA)
    
    expect(testB.increment).toEqual(1)
    testA.update ++
    testB.update ++
    expect(testA.increment).not.toEqual(testB.increment)
  })

  it('should raise when decorating a non-getter', () => {
    expect(() => {
      class Test {
        @dependsOn([])
        method() {
          /* Empty */
        }
      }
    }).toThrowError(TypeError)
  })
})
