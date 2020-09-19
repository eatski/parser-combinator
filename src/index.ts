export interface Parser<T> {
    consume(str:string):ParseResultInner<T>,
    parse(str:string):ParseResult<T>
    then<R>(action: (result:T) => R):Parser<R>,
    validate(predicate: (result:T) => boolean):Parser<T>
    onParsed(cb:(str:string,parsed:ParseResultInner<T>) => void):Parser<T>,
    not(parser:Parser<unknown>):Parser<T>
}
type Parsers<T> = { [P in keyof T]: Parser<T[P]> };
type ParseResultTypeSuccess = "match" 
type ParseResultTypeFailure = "failure" 
type ParseResultSuccess<T> = {result:ParseResultTypeSuccess,content:T}
type ParseResultSuccessInner<T> = {result:ParseResultTypeSuccess,content:T,unconsumed:string}
type ParseResultFailure = {result:ParseResultTypeFailure,messages:string[],cause:string}

type ParseResultInner<T> = ParseResultFailure | ParseResultSuccessInner<T>
export type ParseResult<T> = ParseResultFailure | ParseResultSuccess<T>

const createParser = <T>(arg:Pick<Parser<T>,"consume">):Parser<T> => {
    return {
        ...arg,
        then(action){
            return createParser({
                consume(str:string){
                    const res = arg.consume(str)
                    switch (res.result) {
                        case "match":
                            return {
                                result:res.result,
                                unconsumed:res.unconsumed,
                                content:action(res.content),
                            }
                        case "failure":
                            return res
                    }
                }
            })
        },
        onParsed(cb){
            return createParser({
                consume(str){
                    const res = arg.consume(str)
                    cb(str,res);
                    return res;
                }
            })
        },
        parse(str){
            const res = arg.consume(str);
            if(res.result === "failure"){
                return res
            }
            if(res.unconsumed === ""){
                return {
                    result:res.result,
                    content:res.content,
                }
            }
            return {
                result:"failure",
                messages:[`Expect EOF. But '${res.unconsumed}' was found`],
                cause:str
            }
        },
        validate(predicate){
            return createParser({
                consume(str:string){
                    const res = arg.consume(str)
                    switch (res.result) {
                        case "match":
                            return predicate(res.content) ? res : {
                                result:"failure",
                                messages:["Validation Error"],
                                cause:str                      
                            }
                        case "failure":
                            return res
                    }
                }
            })
        },
        not(parser){
            return createParser({
                consume(str:string){
                    const checked = parser.consume(str);
                    switch (checked.result) {
                        case "match":      
                            return {result:"failure",messages:["TODO:"],cause:str}
                        case "failure":
                            return arg.consume(str)
                    }
                }
            })
        }
    }
}
export const lazy = <T>(factory:() => Parser<T>):Parser<T> => createParser({
    consume(str){
        return factory().consume(str);
    }
})

export const sequence = <T extends Array<unknown>>(...parsers:Parsers<T>): Parser<T> => {
    return createParser({
        consume(str){
            return _matchSeq(str,parsers) as ParseResultInner<T>
        }
    })
}

const _matchSeq = <T>(str:string,parsers:Parser<T>[]):ParseResultInner<T[]> => {
    const fn = (cur:string,num:number = 0,prev:T[]=[]):ParseResultInner<T[]> => {
        const parser = parsers[num]
        const res = parser.consume(cur)
        switch (res.result) {
            case "match":
                const content = [...prev,res.content]
                return parsers[num + 1] ? 
                    fn(res.unconsumed,num + 1,content) : 
                    {result:"match",content,unconsumed:res.unconsumed}
            case "failure":
                return res
        }
    }
    return fn(str);
}

export const choice = <T extends Array<unknown>>(...parsers:Parsers<T>) :Parser<T[number]> => {
    return createParser({
        consume(str){
            const fn = (num:number = 0,messages:string[] = []):ParseResultInner<T[number]> => {
                const parser = parsers[num]
                if(typeof parser == "undefined") return {
                    result:"failure",
                    messages,
                    cause:str
                };
                const res = parser.consume(str);
                switch (res.result) {
                    case "match":  
                        return res
                    case "failure":
                        return fn(num + 1,[...messages,...res.messages])
                }
            }
            return fn()
        }
    })
}

export const repeat = <T>(parser:Parser<T>) : Parser<T[]> => {
    return createParser({
        consume(str){
            const fn = (cur:string=str,acc:T[]=[]):ParseResultInner<T[]> => {
                const res = parser.consume(cur);
                switch (res.result) {
                    case "match":
                        const content = [...acc,res.content]
                        return res.unconsumed !== "" ? 
                            fn(res.unconsumed,content) : 
                            {result:"match",content,unconsumed:res.unconsumed}
                    case "failure":
                        return  {result:"match",content:acc,unconsumed:cur}
                }
            }
            return fn();
        }
    })
}

export const regexp = (exp:RegExp):Parser<string> => {
    const matcher = new RegExp(`^(${exp.source})([\\s\\S]*)$`)
    return createParser({
        consume(str){
            const result = matcher.exec(str);
            if(!result){
                return {
                    result:"failure",
                    messages:[`Regexp not matched: '${exp}'`],
                    cause:str
                }
            }
            const [,content,unconsumed] = result
            return {content,result:"match",unconsumed}
        },
    })
}

const escapeRegExp = (text:string) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export const str = <S extends string>(literal:S):Parser<S> => {
    const escaped = escapeRegExp(literal);
    const matcher = new RegExp(`^${escaped}([\\s\\S]*)$`)
    return createParser({
        consume(str){
            const result = matcher.exec(str);
            if(!result){
                return {
                    result:"failure",
                    messages:[`Literal not matched: '${literal}'`],
                    cause:str
                }
            }
            const [,unconsumed] = result
            return {content:literal,result:"match",unconsumed}
        },
    })
}




