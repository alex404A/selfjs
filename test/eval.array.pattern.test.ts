import * as interpreter from '../src/main'
import { expect } from 'chai'
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha'

describe('array pattern', () => {
  it('with matching value', () => {
    const code = `
    var [a] = [1]
    a
    `
    const result = interpreter.run(code, {})
    expect(result).equal(1)
  })

  it('without matching value', () => {
    const code = `
    var [a] = []
    a
    `
    const result = interpreter.run(code, {})
    expect(result).to.be.undefined
  })

  it('skipping forward', () => {
    const code = `
    var [,,a] = [1,1,2]
    a
    `
    const result = interpreter.run(code, {})
    expect(result).to.equal(2)
  })

  it('skipping backward', () => {
    const code = `
    var [a,,] = [1,2,3]
    a
    `
    const result = interpreter.run(code, {})
    expect(result).to.equal(1)
  })

  it('embedding', () => {
    const code = `
    var [a,[b,c]] = [1,[2,3]]
    var d = {
      a: a,
      b: b,
      c: c
    }
    d
    `
    const result = interpreter.run(code, {})
    expect(result.a).to.equal(1)
    expect(result.b).to.equal(2)
    expect(result.c).to.equal(3)
  })

  it('without iterable', () => {
    const code = `
    var [a] = 1
    a
    `
    expect(interpreter.run.bind(null, code, {})).throw()
  })

})