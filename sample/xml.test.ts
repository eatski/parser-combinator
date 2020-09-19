import { regexp, str, sequence, Parser, choice, lazy, repeat } from "../src"
const Text = regexp(/[\w ]+/) //TODO: support more charactors
const Blank = regexp(/\s*/)
const trimableRight = <T>(parser:Parser<T>) : Parser<T> => sequence(parser,Blank).then(([left])=> left)
const trimable = <T>(parser:Parser<T>) : Parser<T> => sequence(Blank,parser,Blank).then(([,content])=> content)
const TagName = trimableRight(regexp(/[a-z]+/))
const AttrName = regexp(/[a-zA-z]+/)
const AttrValue = sequence(str("'"),Text,str("'")).then(([,text]) => text)
const Attr = trimableRight(sequence(AttrName,str("="),AttrValue).then(([name,,value])=> ({name,value})))
const TagStart = trimableRight(sequence(str("<"),TagName, repeat(Attr) ,str(">")).then(([, name,attrs]) => ({name,attrs})))
const TagEnd = sequence(str("</"), TagName,Blank, str(">")).then(([, name,]) => name)
type TaggedElement = {
    tagName: string,
    elements: (TaggedElement | string)[],
    attrs:{name:string,value:string}[]
}
const TaggedElement: Parser<TaggedElement> =
    sequence(TagStart, lazy(() => XML), TagEnd)
        .validate(([tagStart, , tagEnd]) => tagStart.name === tagEnd)
        .then(([tagStart, elements]) => ({ tagName:tagStart.name,attrs:tagStart.attrs,elements }))
const Element = choice(trimable(TaggedElement), Text)
const XML = repeat(Element)

describe("atoms", () => {
    test("trimable",() => {
        const simpleMutliLines = `
            hoge
        `
        const blankRes = trimable(str("hoge")).parse(simpleMutliLines)
        const blankExpected : typeof blankRes = {
            result:"match",
            content:"hoge"
        }
        expect(blankRes).toEqual(blankExpected)
    })
    test("invalid tagname",() => {
        const result = TaggedElement.parse("<a>hello</b>")
        const expected : typeof result = {
            result:"failure",
            messages:["Validation Error"],
            cause:"<a>hello</b>"
        }
        expect(result).toEqual(expected)
    })
})
describe("e2e",() => {
    test("single line",() => {
        const xmlText = "<body><p class='hoge'>hello</p>world<div>friend</div></body>"
        const res = XML.parse(xmlText)
        const expected : typeof res = {
            result: "match",
            content: [{
                tagName: "body",
                attrs:[],
                elements: [
                    { tagName: "p", attrs:[{name:"class",value:"hoge"}],elements: ["hello"] },
                    "world",
                    { tagName: "div", attrs:[],elements: ["friend"] }
                ]
            }]
        }
        expect(res).toEqual(expected)
    })
    test("multi lines",() => {
        const xmlTextWithMutliLines = `
            <body>
                <p class='hoge'>hello</p>
                world
                <div>friend</div>
            </body>
        `
        const resML = XML.parse(xmlTextWithMutliLines)
        const expectedML : typeof resML = {
            result: "match",
            content: [{
                tagName: "body",
                attrs:[],
                elements: [
                    { tagName: "p", attrs:[{name:"class",value:"hoge"}],elements: ["hello"] },
                    "world",
                    { tagName: "div", attrs:[],elements: ["friend"] }
                ]
            }]
        }
        expect(resML).toEqual(expectedML)
    })
})
