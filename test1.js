// var uuid = require('uuid/v1')
// const cheerio = require('cheerio');
// const $ = cheerio.load('<ul id="fruits"><li>apple</li></ul>');

// var str = 'some sample';
// var res = `${str} + ${uuid()}`
// var unique = res.split('+')[1]

// $('ul').attr('unique', unique)
// console.log($('ul').html());
// console.log($.html('ul'));

const cheerio = require('cheerio')
var uuid = require('uuid/v1')
var axios = require('axios')
var request = require('request');
var requestPromise = require('request-promise-native')
var block = require('./block')

const url = 'http://127.0.0.1:5500/index.html'

let site = ""

let trans_lang_map = {
    "hi": "hindi",
    "od": "odia",
    "pa": "punjabi",
    "gu": "gujarati",
    "mr": "marathi",
    "te": "telugu",
    "ta": "tamil",
    "as": "assamese",
    "bn": "bengali",
    "en": "english",
    "ml": "malayalam",
    "kn": "kannada"
}

let restrictedElements = ['script', 'noscript', 'style', 'object', 'embed', 'svg'],
    allowedAttrs = ['placeholder', 'title']; // visible attributes 

let noAlpha = new RegExp('^[^\u0041-\u005A\u0061-\u007A]+$', 'g');

let $;
let mt_data = []
var rendered;

async function prerender(mainDomainURL, lang = '') {


    var i = 0

    rendered = await requestPromise(mainDomainURL);
    console.log('typeof', typeof rendered);

    console.log("<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>")
    console.log(rendered)

    // const browser = await puppeteer.launch({headless:true});
    // const page = await browser.newPage();
    // await page.goto(url);
    // let rendered = await page.content()
    // console.log(rendered)


    $ = cheerio.load(rendered, { ignoreWhitespace: true })
    // let root = HTMLParser.parse(rendered);
    let children = $('*').children()
    let rootNode = $.root()[0]
    // console.log(rootNode);


    let case_insensitive_set = new Set()
    //await browser.close()

    //previous code

    nodeTreeWalker(rootNode, function (node) {
        var text = $(node).text().replace(/^\s+|\s+$/gm, '')
        console.log("-------" + text + "--------")
        if (!case_insensitive_set.has(text.toLowerCase())) {
            mt_data.push(text)
            case_insensitive_set.add(text.toLowerCase())
        }
    })

    let target_lang = getTransCodeFromDomainCode(lang)
    let tns = await fetch_transliteration(mt_data, target_lang)
    console.log(tns);

    // nodeTreeWalker(rootNode, function (node) {
    //     var text = $(node).text().replace(/^\s+|\s+$/gm, '')
    //     if (tns[text.toLowerCase()]) {
    //         node.nodeValue = tns[text.toLowerCase()]
    //     }
    // })

    nodeTreeWalker1(rootNode, function (unique, node) {
        for (const key in tns) {
            if (tns.hasOwnProperty(key)) {
                if (key.split('+')[1] == unique) {
                    $(node).html(tns[key].split('+')[0])
                }
            }
        }
    })



    // children.each((c) => {
    //     if (children[c].name == "style" || children[c].name == "script" || children[c].name == "img" || children[c].name == "link") {

    //         let srcpath
    //         if (children[c].name == "link") {
    //             srcpath = $(children[c]).attr("href")
    //         } else {
    //             srcpath = $(children[c]).attr("src")
    //         }
    //         if (srcpath && srcpath.trim() !== "" && !isUrl(srcpath) && !srcpath.startsWith("#") && !srcpath.startsWith("//")) {
    //             let newsrcpath = getNewSrcPath(mainDomainUrl, srcpath)
    //             if (newsrcpath && newsrcpath.trim !== "") {
    //                 if (children[c].name == "link") {
    //                     $(children[c]).attr("href", newsrcpath)
    //                 } else {
    //                     $(children[c]).attr("src", newsrcpath)
    //                 }
    //             }
    //         }
    //     } else if (children[c].name == "a") {
    //         srcpath = $(children[c]).attr("href")
    //         if (srcpath && srcpath.trim() !== "" && isUrl(srcpath) && !srcpath.startsWith("#") && !srcpath.startsWith("//")) {
    //             mainDomainHostObject = extractHostURLObject(mainDomainUrl);
    //             if (mainDomainHostObject) {
    //                 let newsrcpath
    //                 if (srcpath.indexOf(mainDomainHostObject.http) != -1) {
    //                     newsrcpath = srcpath.replace(mainDomainHostObject.http, subDomainHost)
    //                 } else if (srcpath.indexOf(mainDomainHostObject.https) != -1) {
    //                     newsrcpath = srcpath.replace(mainDomainHostObject.https, subDomainHost)
    //                 }
    //                 if (newsrcpath && newsrcpath.trim !== "") {
    //                     $(children[c]).attr("href", newsrcpath)
    //                 }
    //             }
    //         }
    //     }
    // })
    // console.log($.html())
    return $.html()

}

function cb1(data) {
    let case_insensitive_set = new Set()
    console.log("-------" + data + "--------")
    if (!case_insensitive_set.has(data.toLowerCase())) {
        mt_data.push(data)
        case_insensitive_set.add(data.toLowerCase())
    }
}

function getTransCodeFromDomainCode(lang) {
    let targ_lang = trans_lang_map[lang]
    if (!targ_lang) {
        targ_lang = "tamil"
    }
    return targ_lang

}

function isUrl(s) {
    var regexp = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/
    return regexp.test(s);
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

function getNewSrcPath(url, oldsrcPath) {
    let lastChar = url.substr(-1);
    let newsrcpath = ""
    if (lastChar == '/') {
        url = url.substring(0, url.length - 1)
    }
    if (oldsrcPath.startsWith("/")) {
        oldsrcPath = oldsrcPath.substring(1, oldsrcPath.length)
        url = extractHostURL(url)
    }
    if (url.split("/").length <= 3) {
        if (url.indexOf("#") != -1) {
            newsrcpath = url.substring(0, url.indexOf("#")) + "/" + oldsrcPath
        } else {
            newsrcpath = url + "/" + oldsrcPath
        }
    } else if (url.indexOf("#") != -1) {
        newsrcpath = url.substring(0, url.indexOf("#")) + oldsrcPath
    } else {
        newsrcpath = url.substring(0, url.lastIndexOf("/") + 1) + oldsrcPath
    }

    return newsrcpath

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

function extractHostURLObject(url) {
    let hostname
    let httpHost;
    let httpsHost;
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


    httpHost = "http://" + hostname;
    httpsHost = "https://" + hostname
    return { "http": httpHost, "https": httpsHost };
}

function nodeTreeWalker(node, cb) {
    let value = ''
    // console.log($(node).html());

    // recursively traverse the tree
    function rec(_node) {
        // console.log('test', $.html(_node));

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
        //checking for block elements
        if (is_allowed(_node)) {
            if (_node.nodeType == 1 && _node.type == 'tag' && block(_node.name)) {
                value = $(_node.name).html()
                let res = `${value} +${uuid()}`
                let unique = res.split('+')[1]
                $(_node.name).attr('unique', unique);
                cb1(res)
            }
        }
        // check eligibility
        // if (is_allowed(_node)) {
        //     // send back only the text nodes 
        //     if (_node.nodeType === 3) {
        //         cb(_node)
        //     }
        // }
        // else return

        // process attributes if the node is an element node here 
        // if (_node.nodeType === 1 && _node.attribs && _node.attribs.length > 0) {
        //     let attrs = _node.attribs

        //     for (let i = 0; i < attrs.length; i++)
        //         if (is_allowed(attrs[i])) {
        //             cb(attrs[i])
        //         }
        // }

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

function nodeTreeWalker1(node, cb) {
    let value = ''
    function rec1(_node) {
        //checking for block elements
        if (is_allowed(_node)) {
            if (_node.nodeType == 1 && _node.type == 'tag' && block(_node.name)) {
                value = $(_node.name).attr('unique')
                // value = $(_node.name).html()
                // let res = `${value} +${uuid()}`
                // let unique = res.split('+')[1]
                // $(_node.name).attr('unique', unique);
                cb(value, _node.name)
            }
        }

        // process childrens 
        if (_node.childNodes) {
            _node.childNodes.forEach(n => is_allowed(n) && rec1(n))
        }

        // process attributes 
        if (_node.attribs)
            for (let i = 0; i < _node.attribs.length; i++) {
                if (allowedAttrs.indexOf(_node.attribs[i].name.toLowerCase()) !== -1)
                    rec1(_node.attribs[i])
            }
    }
    rec1(node)
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
    .then(res => console.log('res', res))
    // .catch(err => console.log('err', err))
