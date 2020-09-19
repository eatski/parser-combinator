import { regexp, str, sequence, Parser, choice, lazy } from "../src"
test("Calulate Additive", () => {
    const Num = regexp(/[1-9][0-9]*/).then(parseInt)
    const AdditveOperator = str("+")
    const Additive = lazy(() => choice(AdditiveExpression, Num))
    const AdditiveExpression: Parser<number> = sequence(Num, AdditveOperator, Additive)
        .then(([left, , right]) => left + right)
    const res1 = AdditiveExpression.parse("10+90+11")
    expect(res1).toStrictEqual({ result: 'match', content: 111 })
})

test("Additive", () => {
    const Num = regexp(/[1-9][0-9]*/).then(parseInt)
    const AdditveOperator = str("+")
    type Additive = AdditiveExpression | number
    const Additive = lazy(() => choice(AdditiveExpression, Num))
    type AdditiveExpression = [number, "+", Additive]
    const AdditiveExpression: Parser<AdditiveExpression> = sequence(Num, AdditveOperator, Additive)
    const res1 = AdditiveExpression.parse("10+90+11")
    expect(res1).toStrictEqual({ result: 'match', content: [10, '+', [90, '+', 11]] })
})