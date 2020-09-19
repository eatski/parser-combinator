import { regexp, str, sequence, Parser, choice, lazy, repeat } from "."

test("sequence", () => {
    const Num = regexp(/[1-9][0-9]*/).then(parseInt)
    const AdditiveExpression = sequence(Num, str("+"), Num)
    const res1 = AdditiveExpression.parse("11+12")
    expect(res1).toStrictEqual({ result: "match", content: [11, '+', 12] })
})

test("choice", () => {
    const Num = regexp(/[1-9][0-9]*/).then(parseInt)
    const AtoZ = regexp(/[1-9a-z]*/)
    const res1 = choice(Num, AtoZ).parse("a1")
    expect(res1).toStrictEqual({
        result: "match",
        content: "a1"
    })
    const res2 = choice(Num, AtoZ).parse("123")
    expect(res2).toStrictEqual({
        result: "match",
        content: 123
    })
})

test("not", () => {
    const Bool = choice(str("false"), str("true"))
    const AtoZ = regexp(/[1-9a-z]*/)
    const res1 = AtoZ.not(Bool).parse("false")
    const expect1 : typeof res1 = {
        result:"failure",
        cause:"false",
        messages:["TODO:"]
    }
    expect(res1).toEqual(expect1)
    const res2 = AtoZ.not(Bool).parse("notfalse")
    expect(res2).toEqual({ result: "match", content: "notfalse" })
})









