const cheerio = require('cheerio')
var uuid = require('uuid/v1')
var axios = require('axios')
var request = require('request');
var requestPromise = require('request-promise-native')
var block = require('./block')


let url = 'http://127.0.0.1:5500/index.html'

let restrictedElements = ['script', 'noscript', 'style', 'object', 'embed', 'svg'],
    allowedAttrs = ['placeholder', 'title']; // visible attributes 

let noAlpha = new RegExp('^[^\u0041-\u005A\u0061-\u007A]+$', 'g');


var $, $d, $b, $i;
let mt_data = []
var rendered;

async function prerender(mainDomainURL, lang) {
    rendered = await requestPromise(mainDomainURL);
    console.log('typeof', typeof rendered);

    console.log("<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>")
    console.log(rendered)

    $ = cheerio.load(rendered, { ignoreWhitespace: true })
    let rootNode = $.root()[0]
    rootNode = $.html('body')
    // console.log('rootnode', rootNode);

    // console.log('length', $('body').children().length);

    // $('body').each((n, ele) => {
    //     console.log('ele', ele);

    // })





    nodeTreeWalker()

    // let target_lang = getTransCodeFromDomainCode(lang)
    // let tns = await fetch_transliteration(mt_data, target_lang)
    // console.log(tns);

    return $.html()
}

//HTML Parsing

function nodeTreeWalker() {
    $('body').children().each(function (i, ele) {

        // console.log('ele', $(this).attr('class'), ele.name);

        if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag') {
            divHandler(ele, 'main')
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            inlineHandler(ele, 'main')
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
            blockHandler(ele, 'main')
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
            inlineHandler(ele, 'main')
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
            blockHandler(ele, 'main')
        }
    })


}

//Div Handler

function divHandler(node, ref) {
    let $t
    switch (ref) {
        case 'main':
            $t = $
            break;
        case 'div':
            $t = $d
            break;
        case 'block':
            $t = $b
            break;
        case 'inline':
            $t = $i
            break;
        default:
            break;
    }
    let val = $t.html(node, this)
    val = $t(val).html();
    $d = cheerio.load(val)

    $d('body').children().each(function (i, ele) {
        if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            inlineHandler(ele, 'div')
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
            blockHandler(ele, 'div')
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
            inlineHandler(ele, 'div')
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
            blockHandler(ele, 'div')
        } else if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag') {
            divHandler(ele, 'div')
        }
    })

}

function blockHandler(node, ref) {
    let $t, value, arr = []
    switch (ref) {
        case 'main':
            $t = $
            break;
        case 'div':
            $t = $d
            break;
        case 'block':
            $t = $b
            break;
        case 'inline':
            $t = $i
            break;
        default:
            break;
    }
    let val = $t.html(node, this)
    val = $t(val).html();

    $b = cheerio.load(val)
    let broot = $b.root()[0]
    console.log('block', val, $b('body').children().length);

    //taking only the text value

    if ($b('body').children().length > 0) {
        let val1 = val
        let textValue = val1.replace(/<\s*[a-z][^>]*>(.*?)<\s*\/\s*([a-z]*)>/g, "")

        console.log('---->text<----', textValue);
    }

    if ($b('body').children().length > 0) {
        $b('body').children().each(function (i, ele) {
            // console.log('block outer exec...');

            if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && $(this).hasClass('no-split')) {
                console.log('Block inner exec.....');
                blockHandler(ele, 'block')

            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1) {
                console.log('Block Iner exec.....');
                blockHandler(ele, 'block')

            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1) {
                value = $.html(this)
                let res = `${value} +${uuid()}`
                let unique = res.split('+')[1]
                arr.push(res)
                $(ele.name, this).attr('unique', unique)
                console.log('array', arr);

            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1) {
                console.log('inside block handler....');

                value = $.html(this)
                let res = `${value} +${uuid()}`
                let unique = res.split('+')[1]
                arr.push(res)
                $(ele.name, this).attr('unique', unique)
                console.log('array', arr);

            }
            // else if (is_allowed(ele) && ele.type == 'tag' && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1) {
            //     value = $(ele.name, this).html()
            //     // let res = `${value} +${uuid()}`
            //     // let unique = res.split('+')[1]
            //     // $(ele.name, this).attr('unique', unique);
            //     arr.push(value)
            // }

        })

    } else {
        // console.log('block exec 0..');
        let htm = $.html(node, this)

        let res = `${val} +${uuid()}`
        let unique = res.split('+')[1]
        $(node.name).attr('unique', unique);
        arr.push(res)
        console.log('array', arr);
    }

    // //checking for text
    // $b('body').childNodes.forEach(n => console.log('n', n.name))

}

function inlineHandler(node, ref) {
    let case_insensitive_set = new Set()

    let $t
    switch (ref) {
        case 'main':
            $t = $
            break;
        case 'div':
            $t = $d
            break;
        case 'block':
            $t = $b
            break;
        case 'inline':
            $t = $i
            break;
        default:
            break;
    }
    let val = $t.html(node, this)
    val = $t(val).html();

    console.log('inline', val);
    $i = cheerio.load(val)

    //taking only the text value

    if ($i('body').children().length > 0) {
        let val1 = val
        let textValue = val1.replace(/<\s*[a-z][^>]*>(.*?)<\s*\/\s*([a-z]*)>/g, "")

        console.log('---->text<----', textValue);
    }

    if ($i('body').children().length > 0) {

        $i('body').children().each(function (i, ele) {
            if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
                // inlineParser(ele)
                inlineHandler(ele, 'inline')
            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
                blockHandler(ele, 'inline')
                // blockParser(ele)
            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
                blockHandler(ele, 'inline')
            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
                inlineParser(ele)
            }
        })

    } else {
        console.log('inline exec 0...');

        if (!case_insensitive_set.has(val.toLowerCase())) {
            mt_data.push(val)
            case_insensitive_set.add(val.toLowerCase())
            console.log('mt-data', mt_data);

        }
    }


}

//parsing inline element
function inlineParser(node) {
    console.log('======....Inline Parser exec.....====');


    function rec(_node) {
        // check eligibility
        if (is_allowed(_node)) {
            // send back only the text nodes 
            if (_node.nodeType === 3) {
                cb(_node)
            }
        }
        else return

        // process attributes if the node is an element node here 
        if (_node.nodeType === 1 && _node.attribs && _node.attribs.length > 0) {
            let attrs = _node.attribs

            for (let i = 0; i < attrs.length; i++)
                if (is_allowed(attrs[i])) {
                    cb(attrs[i])
                }
        }

        // process childrens 
        if (_node.childNodes) {
            _node.childNodes.forEach(n => is_allowed(n) && rec(n))
        }

        // process attributes 
        if (_node.attribs)
            for (let i = 0; i < _node.attribs.length; i++) {
                if (allowedAttrs.indexOf(_node.attribs[i].name.toLowerCase()) !== -1)
                    rec(_node.attribs[i])
            }
    }

    rec(node)
}

function blockParser(ele) {
    let arr = []
    let value = $(ele.name, this).html()
    let res = `${value} +${uuid()}`
    let unique = res.split('+')[1]
    $(ele.name, this).attr('unique', unique);
    arr.push(res)
}

function cb(node) {
    let case_insensitive_set = new Set()

    var text = $i(node, this).text().replace(/^\s+|\s+$/gm, '')
    console.log("-------" + text + "--------")
    if (!case_insensitive_set.has(text.toLowerCase())) {
        mt_data.push(text)
        case_insensitive_set.add(text.toLowerCase())
    }
    console.log('mt-data', mt_data);

}


//is allowed
function is_allowed(n) {
    // if parent element is in the restricted list
    if (n.parentNode && n.parentNode.name && restrictedElements.indexOf(n.parentNode.name.toLowerCase()) != -1) return false

    // if parent element has revIgnore attribute applied
    //if(n.parentNode && (typeof n.parentNode.attribs.revIgnore == 'string' )) return false

    // if element is restricted
    if (n.name && restrictedElements.indexOf(n.name.toLowerCase()) !== -1) return false

    // if this element has revIgnore attribute applied
    //if(n.attribs && ( typeof n.attribs.revIgnore == 'string' ) ) return false

    // if empty node or not a valid text node 
    if ((n.nodeType === 2 || n.nodeType === 3) && n.nodeValue && n.nodeValue.trim() == '') return false

    // if it us an attribute but not allowed
    if (n.nodeType === 2 && allowedAttrs.indexOf(n.name) === -1) return false

    // if it doesn't contain any alphabets
    if ((n.nodeType === 2 || n.nodeType === 3) && n.nodeValue.trim().match(noAlpha)) return false

    return true
}


prerender(url)
    .then(res => {
        console.log('-==-=-=-=-=-=-=-=-=-=--=-=-=-==-=-=-=-')
        console.log(res);
        console.log('-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=-=-=-=-');
    })
    .catch(err => console.log(err))