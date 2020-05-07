import * as interpreter from '../src/main'
import { expect } from 'chai'
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha'

describe('object pattern', () => {
  it('matching value in shorthand', () => {
    const code = `
     var {a} = {a: 1}
     a
     `
    const result = interpreter.run(code, {})
    expect(result).equal(1)
  })

  it('matching value not in shorthand', () => {
    const code = `
     var {a: b} = {a: 1}
     b
     `
    const result = interpreter.run(code, {})
    expect(result).equal(1)
  })

  it('multiple matching', () => {
    const code = `
     var {a: a, b} = {a: 1, b: 2}
     var c = {
       a: a,
       b: b
     }
     c
     `
    const result = interpreter.run(code, {})
    expect(result.a).equal(1)
    expect(result.b).equal(2)
  })

  it('without matching', () => {
    const code = `
     var {a} = {b: 1}
     a
     `
    const result = interpreter.run(code, {})
    expect(result).to.be.undefined
  })

  it('embedding', () => {
    const code = `
    var {a, b: {b}} = {a: 1, b: {b: 2}}
    var c = {
      a: a,
      b: b
    }
    c
    `
    const result = interpreter.run(code, {})
    expect(result.a).to.equal(1)
    expect(result.b).to.equal(2)
  })

  it('without matching a valid object', () => {
    const code = `
     var {a} = 1
     a
     `
    const result = interpreter.run(code, {})
    expect(result).to.be.undefined
  })

  it('matching a null', () => {
    const code = `
     var {a} = null
     `
    expect(interpreter.run.bind(null, code, {})).throw()
  })

})