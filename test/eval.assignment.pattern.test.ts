import * as interpreter from '../src/main'
import { expect } from 'chai'
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha'

describe('assignment pattern', () => {
  it('array pattern default value', () => {
    const code = `
     var [a = 1] = []
     a
     `
    const result = interpreter.run(code, {})
    expect(result).equal(1)
  })

  it('array pattern matching null', () => {
    const code = `
     var [a = 1] = [null]
     a
     `
    const result = interpreter.run(code, {})
    expect(result).to.be.null
  })

  it('object pattern default value', () => {
    const code = `
     var {a = 1} = {}
     a
     `
    const result = interpreter.run(code, {})
    expect(result).equal(1)
  })

  it('object pattern matching null', () => {
    const code = `
     var {a = 1} = {a: null}
     a
     `
    const result = interpreter.run(code, {})
    expect(result).to.be.null
  })

})