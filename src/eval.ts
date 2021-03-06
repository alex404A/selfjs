
import * as ESTree from 'estree'

import { EvaluateMap, NodeTypeMap, EvaluateFunc } from './type'
import { Scope } from './scope'
import { Var } from './scope'
import { isIterable } from './utils'

const BREAK_SINGAL: {} = {}
const CONTINUE_SINGAL: {} = {}
const RETURN_SINGAL: { result: any } = { result: undefined }

const evaluate_map: EvaluateMap = {

    Program: (program: ESTree.Program, scope: Scope) => {
        let result
        for (const node of program.body) {
            result = evaluate(node, scope)
        }
        return result
    },

    Identifier: (node: ESTree.Identifier, scope: Scope) => {
        if (node.name === 'undefined') { return undefined } // 奇怪的问题
        const $var = scope.$find(node.name)
        if ($var) { return $var.$get() } // 返回
        else { throw `[Error] ${node.loc}, '${node.name}' 未定义` }
    },

    Literal: (node: ESTree.Literal, scope: Scope) => { 
        return node.value 
    },

    BlockStatement: (block: ESTree.BlockStatement, scope: Scope) => {
        let new_scope = scope.invasived ? scope : new Scope('block', scope)
        for (const node of block.body) {
            const result = evaluate(node, new_scope)
            if (result === BREAK_SINGAL
                || result === CONTINUE_SINGAL
                || result === RETURN_SINGAL) {
                return result
            }
        }
    },

    EmptyStatement: (node: ESTree.EmptyStatement, scope: Scope) => { /* 空当然啥都不干嘛 */ },

    DebuggerStatement: (node: ESTree.DebuggerStatement, scope: Scope) => { debugger },

    ExpressionStatement: (node: ESTree.ExpressionStatement, scope: Scope) => {
        return evaluate(node.expression, scope)
    },

    ReturnStatement: (node: ESTree.ReturnStatement, scope: Scope) => {
        RETURN_SINGAL.result = node.argument ? evaluate(node.argument, scope) : undefined
        return RETURN_SINGAL
    },

    LabeledStatement: (node: ESTree.LabeledStatement, scope: Scope) => { `${node.type} 未实现` },

    BreakStatement: (node: ESTree.BreakStatement, scope: Scope) => {
        return BREAK_SINGAL
    },

    ContinueStatement: (node: ESTree.ContinueStatement, scope: Scope) => {
        return CONTINUE_SINGAL
    },

    IfStatement: (node: ESTree.IfStatement, scope: Scope) => {
        if (evaluate(node.test, scope)) 
            return evaluate(node.consequent, scope)
        else if (node.alternate) 
            return evaluate(node.alternate, scope)
    },

    SwitchStatement: (node: ESTree.SwitchStatement, scope: Scope) => {
        const discriminant = evaluate(node.discriminant, scope)
        const new_scope = new Scope('switch', scope)

        let matched = false
        for (const $case of node.cases) {

            // 进行匹配相应的 case
            if (!matched &&
                (!$case.test || discriminant === evaluate($case.test, new_scope))) {
                matched = true
            }

            if (matched) {
                const result = evaluate($case, new_scope)

                if (result === BREAK_SINGAL) { break }
                else if (result === CONTINUE_SINGAL || result === RETURN_SINGAL) {
                    return result
                }
            }
        }
    },

    SwitchCase: (node: ESTree.SwitchCase, scope: Scope) => {
        for (const stmt of node.consequent) {
            const result = evaluate(stmt, scope)
            if (result === BREAK_SINGAL
                || result === CONTINUE_SINGAL
                || result === RETURN_SINGAL) {
                return result
            }
        }
    },

    WithStatement: (node: ESTree.WithStatement, scope: Scope) => { 
        throw '因为 with 很多问题，已经被基本弃用了，不实现'
    },

    ThrowStatement: (node: ESTree.ThrowStatement, scope: Scope) => {
        throw evaluate(node.argument, scope)
    },

    TryStatement: (node: ESTree.TryStatement, scope: Scope) => {
        try {
            return evaluate(node.block, scope)
        } catch (err) {
            if (node.handler) {
                const param = <ESTree.Identifier>node.handler.param
                const new_scope = new Scope('block', scope)
                new_scope.invasived = true // 标记为侵入式Scope，不用再多构造啦
                new_scope.$const(param.name, err)
                return evaluate(node.handler, new_scope)
            } else {
                throw err
            }
        } finally {
            if (node.finalizer)
                evaluate(node.finalizer, scope)
        }
    },

    CatchClause: (node: ESTree.CatchClause, scope: Scope) => {
        return evaluate(node.body, scope)
    },

    WhileStatement: (node: ESTree.WhileStatement, scope: Scope) => {
        while (evaluate(node.test, scope)) {
            const new_scope = new Scope('loop', scope)
            new_scope.invasived = true
            const result = evaluate(node.body, new_scope)

            if (result === BREAK_SINGAL) { break }
            else if (result === CONTINUE_SINGAL) { continue }
            else if (result === RETURN_SINGAL) { return result }
        }
    },

    DoWhileStatement: (node: ESTree.DoWhileStatement, scope: Scope) => {
        do {
            const new_scope = new Scope('loop', scope)
            new_scope.invasived = true
            const result = evaluate(node.body, new_scope)
            if (result === BREAK_SINGAL) { break }
            else if (result === CONTINUE_SINGAL) { continue }
            else if (result === RETURN_SINGAL) { return result }
        } while (evaluate(node.test, scope))
    },

    ForStatement: (node: ESTree.ForStatement, scope: Scope) => {
        for (
            const new_scope = new Scope('loop', scope)
            , init_val = node.init ? evaluate(node.init, new_scope) : null;
            node.test ? evaluate(node.test, new_scope) : true;
            node.update ? evaluate(node.update, new_scope) : void (0)
        ) {
            const result = evaluate(node.body, new_scope)
            if (result === BREAK_SINGAL) { break }
            else if (result === CONTINUE_SINGAL) { continue }
            else if (result === RETURN_SINGAL) { return result }
        }
    },

    ForInStatement: (node: ESTree.ForInStatement, scope: Scope) => {

        const kind = (<ESTree.VariableDeclaration>node.left).kind
        const decl = (<ESTree.VariableDeclaration>node.left).declarations[0]
        const name = (<ESTree.Identifier>decl.id).name

        for (const value in evaluate(node.right, scope)) {
            const new_scope = new Scope('loop', scope)
            new_scope.invasived = true
            scope.$declar(kind, name, value)
            const result = evaluate(node.body, new_scope)
            if (result === BREAK_SINGAL) { break }
            else if (result === CONTINUE_SINGAL) { continue }
            else if (result === RETURN_SINGAL) { return result }
        }
    },

    FunctionDeclaration: (node: ESTree.FunctionDeclaration, scope: Scope) => {
        const func = evaluate_map.FunctionExpression(<any>node, scope)
        const { name: func_name } = node.id
        if (!scope.$const(func_name, func)) {
            throw `[Error] ${name} 重复定义`
        }
    },

    VariableDeclaration: (node: ESTree.VariableDeclaration, scope: Scope) => {
        const kind = node.kind
        for (const declartor of node.declarations) {
            const value = declartor.init ? evaluate(declartor.init, scope) : undefined
            if (declartor.id.type === 'Identifier') {
                const { name } = declartor.id
                if (!scope.$declar(kind, name, value)) {
                    throw `[Error] ${name} 重复定义`
                }
            } else {
                evaluate(declartor.id, scope, value)
            }
        }
    },

    VariableDeclarator: (node: ESTree.VariableDeclarator, scope: Scope) => {
        throw '执行这里就错了'
    },

    ThisExpression: (node: ESTree.ThisExpression, scope: Scope) => {
        const this_val = scope.$find('this')
        return this_val ? this_val.$get() : null
    },

    ArrayExpression: (node: ESTree.ArrayExpression, scope: Scope) => {
        return node.elements.map(item => evaluate(item, scope))
    },

    ObjectExpression: (node: ESTree.ObjectExpression, scope: Scope) => {
        const object = {}
        for (const property of node.properties) {
            const kind = property.kind

            let key;
            if (property.key.type === 'Literal') {
                key = evaluate(property.key, scope)
            } else if (property.key.type === 'Identifier') {
                key = property.key.name
            } else { throw '这里绝对就错了' }

            const value = evaluate(property.value, scope)
            if (kind === 'init') {
                object[key] = value
            } else if (kind === 'set') {
                Object.defineProperty(object, key, { set: value });
            } else if (kind === 'get') {
                Object.defineProperty(object, key, { get: value });
            } else { throw '这里绝对就错了' }
        }
        return object
    },

    FunctionExpression: (node: ESTree.FunctionExpression, scope: Scope) => { 
        return function (...args) {
            const new_scope = new Scope('function', scope)
            new_scope.invasived = true
            for (let i = 0; i < node.params.length; i++) {
                const param = node.params[i]
                if (param.type === 'Identifier') {
                    const name = param.name
                    new_scope.$const(name, args[i])
                } else if (param.type === 'RestElement') {
                    const rest = Array.prototype.slice.call(arguments).slice(i)
                    evaluate(param, new_scope, rest)
                    break
                }
            }
            new_scope.$const('this', this)
            new_scope.$const('arguments', arguments)
            const result = evaluate(node.body, new_scope)
            if (result === RETURN_SINGAL) {
                return result.result
            }
        }
    },

    UnaryExpression: (node: ESTree.UnaryExpression, scope: Scope) => { 
        return ({
            '-': () => - evaluate(node.argument, scope),
            '+': () => + evaluate(node.argument, scope),
            '!': () => ! evaluate(node.argument, scope),
            '~': () => ~ evaluate(node.argument, scope),
            'void': () => void evaluate(node.argument, scope),
            'typeof': () => {
                if (node.argument.type === 'Identifier') {
                    const $var = scope.$find(node.argument.name)
                    return $var ? typeof $var.$get() : 'undefined'
                } else {
                    return typeof evaluate(node.argument, scope)
                }
            },
            'delete': () => {
                // delete 是真麻烦
                if (node.argument.type === 'MemberExpression') {
                    const { object, property, computed } = node.argument
                    if (computed) {
                        return delete evaluate(object, scope)[evaluate(property, scope)]
                    } else {
                        return delete evaluate(object, scope)[(<ESTree.Identifier>property).name]
                    }
                } else if (node.argument.type === 'Identifier') {
                    const $this = scope.$find('this')
                    if ($this) return $this.$get()[node.argument.name]
                }
            }
        })[node.operator]()
    },

    UpdateExpression: (node: ESTree.UpdateExpression, scope: Scope) => { 
        const { prefix } = node
        let $var: {
            $set(value: any): boolean
            $get(): any
        }
        if (node.argument.type === 'Identifier') {
            const { name } = node.argument
            $var = <Var>scope.$find(name)
            if (!$var) throw `${name} 未定义`
        } else if (node.argument.type === 'MemberExpression') {
            const argument = node.argument
            const object = evaluate(argument.object, scope)
            let property = argument.computed
                ? evaluate(argument.property, scope)
                : (<ESTree.Identifier>argument.property).name
            $var = {
                $set(value: any) {
                    object[property] = value
                    return true
                },
                $get() {
                    return object[property]
                }
            }
        }

        return ({
            '--': v => ($var.$set(v - 1), (prefix ? --v : v--)),
            '++': v => ($var.$set(v + 1), (prefix ? ++v : v++))
        })[node.operator](evaluate(node.argument, scope))
    },

    BinaryExpression: (node: ESTree.BinaryExpression, scope: Scope) => {
        return ({
            "==": (a, b) => a == b,
            "!=": (a, b) => a != b,
            "===": (a, b) => a === b,
            "!==": (a, b) => a !== b,
            "<": (a, b) => a < b,
            "<=": (a, b) => a <= b,
            ">": (a, b) => a > b,
            ">=": (a, b) => a >= b,
            "<<": (a, b) => a << b,
            ">>": (a, b) => a >> b,
            ">>>": (a, b) => a >>> b,
            "+": (a, b) => a + b,
            "-": (a, b) => a - b,
            "*": (a, b) => a * b,
            "/": (a, b) => a / b,
            "%": (a, b) => a % b,
            "|": (a, b) => a | b,
            "^": (a, b) => a ^ b,
            "&": (a, b) => a & b,
            "in": (a, b) => a in b,
            "instanceof": (a, b) => a instanceof b
        })[node.operator](evaluate(node.left, scope), evaluate(node.right, scope))
    },

    AssignmentExpression: (node: ESTree.AssignmentExpression, scope: Scope) => {
        let $var: {
            $set(value: any): boolean
            $get(): any
        }

        if (node.left.type === 'Identifier') {
            const { name } = node.left
            const $var_or_not = scope.$find(name)
            if (!$var_or_not) throw `${name} 未定义`
            $var = $var_or_not
        } else if (node.left.type === 'MemberExpression') {
            const left = node.left
            const object = evaluate(left.object, scope)
            let property = left.computed
                ? evaluate(left.property, scope)
                : (<ESTree.Identifier>left.property).name
            $var = {
                $set(value: any) {
                    object[property] = value
                    return true
                },
                $get() {
                    return object[property]
                }
            }
        } else { throw `如果出现在这里，那就说明有问题了` }

        return ({
            "=": (v) => ($var.$set(v), v),
            "+=": (v) => ($var.$set($var.$get() + v), $var.$get()),
            "-=": (v) => ($var.$set($var.$get() - v), $var.$get()),
            "*=": (v) => ($var.$set($var.$get() * v), $var.$get()),
            "/=": (v) => ($var.$set($var.$get() / v), $var.$get()),
            "%=": (v) => ($var.$set($var.$get() % v), $var.$get()),
            "<<=": (v) => ($var.$set($var.$get() << v), $var.$get()),
            ">>=": (v) => ($var.$set($var.$get() >> v), $var.$get()),
            ">>>=": (v) => ($var.$set($var.$get() >>> v), $var.$get()),
            "|=": (v) => ($var.$set($var.$get() | v), $var.$get()),
            "^=": (v) => ($var.$set($var.$get() ^ v), $var.$get()),
            "&=": (v) => ($var.$set($var.$get() & v), $var.$get())
        })[node.operator](evaluate(node.right, scope))
    },

    LogicalExpression: (node: ESTree.LogicalExpression, scope: Scope) => {
        return ({
            "||": () => evaluate(node.left, scope) || evaluate(node.right, scope),
            "&&": () => evaluate(node.left, scope) && evaluate(node.right, scope),
        })[node.operator]()
    },

    MemberExpression: (node: ESTree.MemberExpression, scope: Scope) => {
        const { object, property, computed } = node
        if (computed) {
            return evaluate(object, scope)[evaluate(property, scope)]
        } else {
            return evaluate(object, scope)[(<ESTree.Identifier>property).name]
        }
    },

    ConditionalExpression: (node: ESTree.ConditionalExpression, scope: Scope) => {
        return (
            evaluate(node.test, scope)
                ? evaluate(node.consequent, scope)
                : evaluate(node.alternate, scope)
        )
    },

    CallExpression: (node: ESTree.CallExpression, scope: Scope) => {
        const func = evaluate(node.callee, scope)
        const args = node.arguments.map(arg => evaluate(arg, scope))

        // 心疼自己
        if (node.callee.type === 'MemberExpression') {
            const object = evaluate(node.callee.object, scope)
            return func.apply(object, args)
        } else {
            const this_val = scope.$find('this')
            return func.apply(this_val ? this_val.$get() : null, args)
        }
    },

    NewExpression: (node: ESTree.NewExpression, scope: Scope) => {
        const func = evaluate(node.callee, scope)
        const args = node.arguments.map(arg => evaluate(arg, scope))
        return new (func.bind.apply(func, [null].concat(args)))
    },

    SequenceExpression: (node: ESTree.SequenceExpression, scope: Scope) => {
        let last
        for (const expr of node.expressions) {
            last = evaluate(expr, scope)
        }
        return last
    },

    Property: (node: ESTree.Property, scope: Scope, computed: boolean) => { throw '这里如果被执行了那也是错的...' },

    ClassExpression: (node: ESTree.ClassExpression, scope: Scope) => {
        let superClass = null
        if (node.superClass !== null && node.superClass !== undefined) {
            superClass = evaluate(node.superClass, scope)
        }
        return evaluate(node.body, scope, superClass)
    },

    ClassDeclaration: (node: ESTree.ClassDeclaration, scope: Scope) => {
        const identifier = node.id.name
        let superClass = null
        if (node.superClass !== null && node.superClass !== undefined) {
            superClass = evaluate(node.superClass, scope)
        }
        const func = evaluate(node.body, scope, superClass)
        scope.$declar('var', identifier, func)
    },

    ClassBody: (node: ESTree.ClassBody, scope: Scope, superClass: () => any | null) => {
        function getKey(md: ESTree.MethodDefinition): string {
            if (md.computed) {
                const key = evaluate(md.value, scope)
                return key.toString()
            } else {
                const identifier = <ESTree.Identifier> md.key
                return identifier.name
            }
        }
        function isSuperInvoke(funcExp: ESTree.FunctionExpression): boolean { 
            if (funcExp.body.body.length === 0) {
                return false
            }
            const stmt = funcExp.body.body[0]
            if (stmt.type !== 'ExpressionStatement') {
                return false
            }
            const exp = stmt.expression
            return exp.type === 'CallExpression' && exp.callee.type === 'Super'
        }
        const new_scope = new Scope('block', scope)
        const constructors = node.body.filter((md: ESTree.MethodDefinition) => md.kind === 'constructor')
        const isConstructorExist = constructors.length > 0
        let constructor = function () {}
        constructor.prototype = {}
        if (isConstructorExist) {
            const constructorNode = constructors[0].value
            constructor = evaluate(constructorNode, new_scope)
            if (superClass !== null && !isSuperInvoke(constructorNode)) {
                throw 'Must call super constructor in derived class before accessing "this" or returning from derived constructor'
            }
        } else if (superClass != null) {
            constructor = function () {
                superClass.call(this)
            }
        }
        if (superClass !== null) {
            constructor.prototype = Object.create(superClass.prototype)
        }
        constructor.prototype.constructor = constructor
        const others = node.body.filter((md: ESTree.MethodDefinition) => md.kind !== 'constructor')
        const staticFuncs = others.filter((md: ESTree.MethodDefinition) => md.static)
        const memberFuncs = others.filter((md: ESTree.MethodDefinition) => !md.static)
        const staticKeys: Array<string> = []
        for (let func of staticFuncs) {
            const key = getKey(func)
            if (staticKeys.indexOf(key) > -1) {
                throw 'duplicate static key in class definition'
            }
            const value = evaluate(func.value, new_scope)
            staticKeys.push(key)
            constructor[key] = value
        }
        const memberKeys: Array<string> = []
        for (let func of memberFuncs) {
            const key = getKey(func)
            if (memberKeys.indexOf(key) > -1) {
                throw 'duplicate member key in class definition'
            }
            const value = evaluate(func.value, new_scope)
            memberKeys.push(key)
            constructor.prototype[key] = value
        }
        return constructor
    },

    Super: (node: ESTree.Super, scope: Scope) => {
        const $var = scope.$find('this')
        if ($var === null) {
            throw 'no this found in scope when evaluating super'
        }
        const thisVar = $var.$get()
        const constructor = thisVar.__proto__.__proto__.constructor
        return constructor.bind(thisVar)
    },

    RestElement: (node: ESTree.RestElement, scope: Scope, rest: Array<any>) => {
        switch (node.argument.type) {
            case 'Identifier':
                const name = node.argument.name
                scope.$const(name, rest)
            default:
                evaluate(node.argument, scope, rest)
        }
        
    },

    ArrayPattern: (node: ESTree.ArrayPattern, scope: Scope, sourceVar: any) => {
        if (!isIterable(sourceVar)) {
            throw 'ArrayPattern args are not iterable'
        }
        for (let i = 0; i < node.elements.length; i++) {
            const element = node.elements[i]
            if (element === null) {
                continue
            } else if (element.type === 'Identifier') {
                const name = element.name
                scope.$const(name, sourceVar[i])
            } else if (element.type === 'RestElement') {
                evaluate(element, scope, sourceVar.slice(i))
            } else {
                evaluate(element, scope, sourceVar[i])
            }
        }
    },

    ObjectPattern: (node: ESTree.ObjectPattern, scope: Scope, sourceVar: any) => {
        for (let property of node.properties) {
            const key = property.key.type === 'Identifier' ? property.key.name : evaluate(property.key, scope)
            if (property.value.type === 'Identifier') {
                const name = property.value.name
                scope.$const(name, sourceVar[key])
            } else {
                evaluate(property.value, scope, sourceVar[key])
            }
        }
    },

    AssignmentPattern: (node: ESTree.AssignmentPattern, scope: Scope, evaluateVal: any) => {
        const defaultVal = evaluate(node.right, scope)
        const value = evaluateVal === undefined ? defaultVal : evaluateVal
        if (node.left.type === 'Identifier') {
            const name = node.left.name
            scope.$const(name, value)
        } else {
            evaluate(node.left, scope, value)
        }
    },

    // 下面是 es6 / es7 特性, 先不做处理
    MetaProperty: (node: ESTree.MetaProperty, scope: Scope) => { throw `${node.type} 未实现` },
    AwaitExpression: (node: ESTree.AwaitExpression, scope: Scope) => { throw `${node.type} 未实现` },
    SpreadElement: (node: ESTree.SpreadElement, scope: Scope) => { throw `${node.type} 未实现` },
    TemplateElement: (node: ESTree.TemplateElement, scope: Scope) => { throw `${node.type} 未实现` },
    TaggedTemplateExpression: (node: ESTree.TaggedTemplateExpression, scope: Scope) => { throw `${node.type} 未实现` },
    MethodDefinition: (node: ESTree.MethodDefinition, scope: Scope) => { throw `${node.type} 未实现` },
    ForOfStatement: (node: ESTree.ForOfStatement, scope: Scope) => { throw `${node.type} 未实现` },
    TemplateLiteral: (node: ESTree.TemplateLiteral, scope: Scope) => { throw `${node.type} 未实现` },
    ImportDeclaration: (node: ESTree.ImportDeclaration, scope: Scope) => { throw `${node.type} 未实现` },
    ExportNamedDeclaration: (node: ESTree.ExportNamedDeclaration, scope: Scope) => { throw `${node.type} 未实现` },
    ExportDefaultDeclaration: (node: ESTree.ExportDefaultDeclaration, scope: Scope) => { throw `${node.type} 未实现` },
    ExportAllDeclaration: (node: ESTree.ExportAllDeclaration, scope: Scope) => { throw `${node.type} 未实现` },
    ImportSpecifier: (node: ESTree.ImportSpecifier, scope: Scope) => { throw `${node.type} 未实现` },
    ImportDefaultSpecifier: (node: ESTree.ImportDefaultSpecifier, scope: Scope) => { throw `${node.type} 未实现` },
    ImportNamespaceSpecifier: (node: ESTree.ImportNamespaceSpecifier, scope: Scope) => { throw `${node.type} 未实现` },
    ExportSpecifier: (node: ESTree.ExportSpecifier, scope: Scope) => { throw `${node.type} 未实现` },
    YieldExpression: (node: ESTree.YieldExpression, scope: Scope) => { throw `${node.type} 未实现` },
    ArrowFunctionExpression: (node: ESTree.ArrowFunctionExpression, scope: Scope) => { throw `${node.type} 未实现` },
}

const evaluate = (node: ESTree.Node, scope: Scope, arg?: any) => {
    const _evalute = (<EvaluateFunc>(evaluate_map[node.type]))
    return _evalute(node, scope, arg)
}

function dealVarInPattern(name: string, value: any, scope: Scope) {
}

export default evaluate