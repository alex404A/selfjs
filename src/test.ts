import * as interpreter from './main'


// 自举解释器代码
declare const require, __dirname
const fs = require('fs')
const interpreter_code = `
  class B {
    constructor() {
      this.b = 3
    }
  }
  class A extends B {
    constructor() {
      super()
      this.a = 1
    }

    static b() {
      return 2
    }

    c() {
      return 4
    }
  }
  const a = new A(1)
  console.log(a.a)
  console.log(a.b)
  console.log(A.b())
  console.log(a.c())
`
interpreter.run(interpreter_code)
