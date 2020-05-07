import * as interpreter from '../src/main'
import { expect } from 'chai'
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha'

describe('rest element', () => {
  it('only itself', () => {
    const code = `
     var [...a] = [1, 2, 3]
     a
     `
    const result = interpreter.run(code, {})
    expect(result).eql([1, 2, 3])
  })

  it('with something forward', () => {
    const code = `
     var [, ...a] = [1, 2, 3]
     a
     `
    const result = interpreter.run(code, {})
    expect(result).eql([2, 3])
  })

  it('connect array pattern', () => {
    const code = `
     var [...[a, b, c]] = [1, 2, 3]
     var d = {
       a: a,
       b: b,
       c: c
     }
     d
     `
    const result = interpreter.run(code, {})
    expect(result.a).equal(1)
    expect(result.b).equal(2)
    expect(result.c).equal(3)
  })

})