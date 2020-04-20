import * as interpreter from '../src/main'
import { expect } from 'chai'
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha'

describe('class evaluation', () => {
  it('simple class declaration with constructor', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
  })

  it('simple class declaration without constructor', () => {
    const code = `
    class A {
    }
    const a = new A()
    const b = {
      'a.a': a.a
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).to.be.undefined
  })

  it('simple class expression', () => {
    const code = `
    const A = class {
      constructor() {
        this.a = 1
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
  })

  it('class declaration with member method', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      b() {
        return 2
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'a.b()': a.b(),
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['a.b()']).equal(2)
  })

  it('class declaration with multiple member method', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      b() {
        return 2
      }

      c() {
        return 3
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'a.b()': a.b(),
      'a.c()': a.c()
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['a.b()']).equal(2)
    expect(result['a.c()']).equal(3)
  })

  it('class declaration with static method', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      static b() {
        return 2
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'A.b()': A.b(),
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['A.b()']).equal(2)
  })

  it('class declaration with multiple static method', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      static b() {
        return 2
      }

      static c() {
        return 3 
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'A.b()': A.b(),
      'A.c()': A.c()
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['A.b()']).equal(2)
    expect(result['A.c()']).equal(3)
  })

  it('class declaration with member conflict', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      a() {
        return 2
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
  })

  it('class declaration with member/static name same', () => {
    const code = `
    class A {
      constructor() {
        this.a = 1
      }

      static a() {
        return 2
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'A.a()': A.a()
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['A.a()']).equal(2)
  })

  it('class A extend class B, both have constructor, A calls super', () => {
    const code = `
    class B {
      constructor() {
        this.b = 2
      }
    }
    class A extends B {
      constructor() {
        super()
        this.a = 1
      }
    }
    const a = new A()
    const b = {
      'a.a': a.a,
      'a.b': a.b
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a']).equal(1)
    expect(result['a.b']).equal(2)
  })

  it('class A extend class B, both no constructor', () => {
    const code = `
    class B {
    }
    class A extends B {
      a() {
        return 1
      }
    }
    const a = new A()
    const b = {
      'a.a()': a.a()
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a()']).equal(1)
  })

  it('class A extend class B, both have constructor, A doesn\'t call super', () => {
    const code = `
    class B {
      constructor() {
        this.b = 2
      }
    }
    class A extends B {
      constructor() {
        this.b = 2
      }
    }
    const a = new A()
    const b = {
      'a.b': a.b
    }
    b 
    `
    expect(interpreter.run.bind(null, code, {})).throw()
  })

  it('class A extend class B, A overide B\'s member', () => {
    const code = `
    class B {
      constructor() {
        this.b = 1
      }
      a() {
        return 1
      }
    }
    class A extends B {
      constructor() {
        super()
        this.b = 2
      }
      a() {
        return 2
      }
    }
    const a = new A()
    const b = {
      'a.a()': a.a(),
      'a.b': a.b,
      'B.prototype.a()': B.prototype.a()
    }
    b 
    `
    const result = interpreter.run(code, {})
    expect(result['a.a()']).equal(2)
    expect(result['a.b']).equal(2)
    expect(result['B.prototype.a()']).equal(1)
  })
})