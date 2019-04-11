const cheerio = require('cheerio')
var uuid = require('uuid/v1')
var axios = require('axios')
var request = require('request');
var requestPromise = require('request-promise-native')
var block = require('./block')

// var str = $('ul').html();
// var res = `${str} + ${uuid()}`
// var unique = res.split('+')[1]
// console.log('res', res);

// $('ul').attr('unique', unique)
// $('ul').html(res)
// console.log('hi', $('ul').html());
// console.log($.html('ul'));

let url = 'http://127.0.0.1:5500/index.html'

let restrictedElements = ['script', 'noscript', 'style', 'object', 'embed', 'svg'],
    allowedAttrs = ['placeholder', 'title']; // visible attributes 

let noAlpha = new RegExp('^[^\u0041-\u005A\u0061-\u007A]+$', 'g');

var $;
let mt_data = []
var rendered;

async function prerender(mainDomainURL, lang) {
    rendered = await requestPromise(mainDomainURL);
    console.log('typeof', typeof rendered);

    console.log("<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>")
    console.log(rendered)

    $ = cheerio.load(rendered, { ignoreWhitespace: true })
    let rootNode = $.root()[0]

    let case_insensitive_set = new Set()

    nodeTreeWalker(rootNode)

    // let target_lang = getTransCodeFromDomainCode(lang)
    // let tns = await fetch_transliteration(mt_data, target_lang)
    // console.log(tns);

    return 'test'
}

//div handler
function nodeTreeWalker(node, cb) {
    // console.log($(node).html());

    // recursively traverse the tree
    function rec(_node) {
        // console.log('test', $(_node.name).html());

        if (is_allowed(_node)) {
            if (_node.nodeType == 1 && _node.type == 'tag' && block(_node.name)) {
                let value = ''
                value = _node
                blockHandler(value)
            } else if (_node.nodeType == 1 && _node.type == 'tag' && (_node.name == 'a' || _node.name == 'span')) {
                inlineHandler(_node)
            }

        }

        //check for text
        // if (_node.type == 'text' && is_allowed(_node)) {
        //     console.log('text', _node.data);

        // }
        //

        //checking for inline elements
        // if (is_allowed(_node)) {
        //     if (_node.nodeType == 1 && _node.type == 'tag' && (_node.name == 'a' || _node.name == 'span')) {
        //         cb1($.html(_node))
        //     }
        // }
        // //
        // if (is_allowed(_node)) {
        //     if (_node.nodeType == 1 && _node.type == 'tag' && (_node.name == 'a' || _node.name == 'span')) {
        //         return
        //     }
        // }
        // check eligibility
        if (is_allowed(_node)) {
            // send back only the text nodes 
            if (_node.nodeType === 3) {
                // checkElement(_node)
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


//Block Handler
function blockHandler(node) {
    // console.log('block', $.html(node, this));
    let val = $.html(node, this)
    // console.log('val', $(val).html());
    val = $(val).html();
    let res = val.replace(/<\s*[a-z][^>]*>(.*?)<\s*\/\s*([a-z]*)>/g, "")
    // console.log('res', res.trim());

    // console.log('val', val);
    // console.log(typeof $);


    let i$ = cheerio.load(val)
    let root = i$.root()[0]

    for (let i = 0; i < root.childNodes.length; i++) {
        console.log('root......', root.childNodes[i]);


    }

    // function recBlock(_node) {
    //     if (is_allowed(_node)) {
    //         console.log('text', _node.name);
    //     }
    //     // process childrens 
    //     if (_node.childNodes) {
    //         _node.childNodes.forEach(n => is_allowed(n) && recBlock(n))
    //     }

    // }

    // recBlock(root)
}

//Inline Handler

function inlineHandler(node) {
    // console.log('inline', $.html(node, this));

}

function getTransCodeFromDomainCode(lang) {
    let targ_lang = trans_lang_map[lang]
    if (!targ_lang) {
        targ_lang = "tamil"
    }
    return targ_lang

}

async function fetch_transliteration(data, target_lang) {
    // data = Array.from(new Set(data))
    let post_url = "http://beta.auth.revup.reverieinc.com/apiman-gateway/Rev_app_devesh/transliteration/1.0?target_lang=" + target_lang + "&source_lang=english&domain=2&nmt=false&segmentation=false&ignoreRosettaForMt=true&mt=false"
    // let post_url = "http://beta.auth.revup.reverieinc.com/apiman-gateway/Rev_app_devesh/transliteration/1.0?target_lang="+target_lang+"&source_lang=english&domain=2&convert_number=true"
    let response = await axios.post(post_url,
        { "data": data },
        { headers: { 'REV-API-KEY': 'fc294a1cfe56761a9b46b6f259db31d5', 'REV-APP-ID': 'devesh_new_appid' } });

    let localized = {}
    let res = response.data.responseList.map(x => localized[x.inString.toLowerCase()] = x.outString)
    // let res = response.data.responseList.map( x => localized[x.inString.toLowerCase()] = x.outString[0])
    return localized
}

function extractHostURL(url) {
    let hostname;
    let protocol = ""
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
        protocol = url.split("//")[0];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    if (protocol) {
        hostname = protocol + "//" + hostname
    }
    return hostname;
}

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
    .then(res => console.log(res))
    .catch(err => console.log(err))

