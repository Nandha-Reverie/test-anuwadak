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


var $;
let mt_data = [], totalData = [], tns
var rendered;
var bcheck = false

async function prerender(mainDomainURL, lang) {
    rendered = await requestPromise(mainDomainURL);
    console.log('typeof', typeof rendered);

    console.log("<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>")
    console.log(rendered)

    $ = cheerio.load(rendered, { ignoreWhitespace: true })

    let children = $('*').children()

    nodeTreeWalker()
    console.log('total data', totalData);

    //let target_lang = getTransCodeFromDomainCode(lang)
    tns = await fetch_transliteration(totalData, 'tamil')
    console.log('tns', tns);

    bcheck = true;
    nodeTreeWalker()

    //Changing Links

    children.each((c) => {
        if (children[c].name == "style" || children[c].name == "script" || children[c].name == "img" || children[c].name == "link") {

            let srcpath
            if (children[c].name == "link") {
                srcpath = $(children[c]).attr("href")
            } else {
                srcpath = $(children[c]).attr("src")
            }
            if (srcpath && srcpath.trim() !== "" && !isUrl(srcpath) && !srcpath.startsWith("#") && !srcpath.startsWith("//")) {
                let newsrcpath = getNewSrcPath(mainDomainUrl, srcpath)
                if (newsrcpath && newsrcpath.trim !== "") {
                    if (children[c].name == "link") {
                        $(children[c]).attr("href", newsrcpath)
                    } else {
                        $(children[c]).attr("src", newsrcpath)
                    }
                }
            }
        } else if (children[c].name == "a") {
            srcpath = $(children[c]).attr("href")
            if (srcpath && srcpath.trim() !== "" && isUrl(srcpath) && !srcpath.startsWith("#") && !srcpath.startsWith("//")) {
                mainDomainHostObject = extractHostURLObject(mainDomainUrl);
                if (mainDomainHostObject) {
                    let newsrcpath
                    if (srcpath.indexOf(mainDomainHostObject.http) != -1) {
                        newsrcpath = srcpath.replace(mainDomainHostObject.http, subDomainHost)
                    } else if (srcpath.indexOf(mainDomainHostObject.https) != -1) {
                        newsrcpath = srcpath.replace(mainDomainHostObject.https, subDomainHost)
                    }
                    if (newsrcpath && newsrcpath.trim !== "") {
                        $(children[c]).attr("href", newsrcpath)
                    }
                }
            }
        }
    })

    return $.html()
}

//HTML Parsing

function nodeTreeWalker() {
    let ind;
    $('body').children().each(function (i, ele) {

        if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            divHandler(ele, ind)
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
            ind = $(ele.name).index(this)
            blockHandler(ele, ind)
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            blockHandler(ele, ind)
        }
    })


}

//Div Handler

function divHandler(node, i) {
    let ind

    //Iterating the Elements using the index

    $($(node.name).eq(i)).children().each(function (i, ele) {
        if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
            ind = $(ele.name).index(this)
            blockHandler(ele, ind)
        } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            blockHandler(ele, ind)
        } else if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
            ind = $(ele.name).index(this)
            inlineHandler(ele, ind)
        } else if (is_allowed(ele) && ele.name == 'div' && ele.nodeType == 1 && ele.type == 'tag') {
            ind = $(ele.name).index(this)
            divHandler(ele, ind)
        }
    })
}

function blockHandler(node, i) {
    let value, arr = [], ind

    //getting only text values
    if ($($(node.name).eq(i)).children().length > 0) {
        if (!bcheck) {

            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            arr.push(e.data)
                        }
                    })
                }
            })
            console.log('array', arr);
            totalData.push(...arr)
        } else {
            console.log('cb1 exec...');
            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            let eD = []
                            eD.push(e.data)
                            e.data = tns[eD[0].toLowerCase()]
                            // console.log('----->tns<-------', eD);

                        }
                    })
                }
            })

        }
    }

    if ($($(node.name).eq(i)).children().length > 0) {
        $($(node.name).eq(i)).children().each(function (i, ele) {
            if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && $(this).hasClass('split')) {
                ind = $(ele.name).index(this)
                inlineHandler(ele, ind)

            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1) {
                console.log('Block Iner exec.....');
                ind = $(ele.name).index(this)
                blockHandler(ele, ind)

            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && $(this).hasClass('no-split')) {
                console.log('Block inner exec.....');
                ind = $(ele.name).index(this)
                blockHandler(ele, ind)
            }
            // else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && $(this).hasClass('split')) {
            //     ind = $(ele.name).index(this)
            //     inlineHandler(ele, ind)

            // } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1) {
            //     console.log('Block Iner exec.....');
            //     ind = $(ele.name).index(this)
            //     blockHandler(ele, ind)

            // } 
            else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1) {
                if (!bcheck) {

                    //Write logic separetely for replacing the element

                    value = $.html(this)
                    arr.push(value)
                    console.log('array', arr);
                    totalData.push(...arr)
                } else {
                    ind = $(ele.name).index(this)
                    value = $.html(this)
                    //replace the old html with new HTML
                    $($(ele.name).eq(ind)).replaceWith(tns[value])
                    // $($(ele.name).eq(ind)).replaceWith("<h2>New heading</h2>")

                }
            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1) {
                console.log('inside block handler....');

                if (!bcheck) {

                    //Write logic separetely for replacing the element

                    value = $.html(this)
                    arr.push(value)
                    console.log('array', arr);
                    totalData.push(...arr)
                } else {
                    ind = $(ele.name).index(this)
                    value = $.html(this)
                    //replace the old html with new HTML
                    $($(ele.name).eq(ind)).replaceWith(tns[value])
                    // $($(ele.name).eq(ind)).replaceWith("<h2>New heading</h2>")

                }

            }
        })
    } else {

        //write logic for taking the text value seperately

        if (!bcheck) {

            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            arr.push(e.data)
                        }
                    })
                }
            })
            console.log('array', arr);
            totalData.push(...arr)
        } else {
            console.log('cb1 exec...');
            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            let eD = []
                            eD.push(e.data)
                            e.data = tns[eD[0].toLowerCase()]
                        }
                    })

                }
            })


        }
    }
}

function inlineHandler(node, i) {
    let case_insensitive_set = new Set()

    let ind

    //getting only text values
    if ($($(node.name).eq(i)).children().length > 0) {
        if (!bcheck) {

            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            mt_data.push(e.data)
                        }
                    })
                }
            })
            console.log('mt_data', mt_data);
            totalData.push(...mt_data)
        } else {
            console.log('cb1 exec...');
            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            let eD = []
                            eD.push(e.data)
                            e.data = tns[eD[0].toLowerCase()]
                            // console.log('----->tns<-------', eD);

                        }
                    })
                }
            })

        }
    }

    if ($($(node.name).eq(i)).children().length > 0) {
        $($(node.name).eq(i)).children().each(function (i, ele) {
            if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('split')) {
                // inlineParser(ele)
                ind = $(ele.name).index(this)
                inlineHandler(ele, ind)
            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag' && $(this).hasClass('no-split')) {
                ind = $(ele.name).index(this)
                blockHandler(ele, ind)
                // blockParser(ele)
            } else if (is_allowed(ele) && block(ele.name) && ele.nodeType == 1 && ele.type == 'tag') {
                ind = $(ele.name).index(this)
                blockHandler(ele, ind)
            } else if (is_allowed(ele) && (ele.name == 'a' || ele.name == 'span') && ele.nodeType == 1 && ele.type == 'tag') {
                ind = $(ele.name).index(this)
                // inlineParser(ele, ind)
                inlineHandler(ele, ind)
            }
        })
    } else {

        //Write logic separetly for taking txt value

        console.log('inline exec 0...');

        if (!bcheck) {
            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            mt_data.push(e.data)
                        }
                    })
                }
            })
            totalData.push(...mt_data)
            console.log('mt_data', mt_data);
        } else {
            console.log('cb1 exec...');
            $($(node.name).eq(i)).each(function (i, ele) {
                if (ele.name == node.name) {
                    let temp = ele.children
                    temp.forEach(e => {
                        if (e.type == 'text') {
                            let eD = []
                            eD.push(e.data)
                            e.data = tns[eD[0].toLowerCase()]

                        }
                    })

                }
            })

        }

    }

}

async function fetch_transliteration(data, target_lang) {
    // data = Array.from(new Set(data))
    let post_url = "http://beta.auth.revup.reverieinc.com/apiman-gateway/Rev_app_devesh/transliteration/1.0?target_lang=" + target_lang + "&source_lang=english&domain=2&nmt=false&segmentation=false&ignoreRosettaForMt=true&mt=false"
    // let post_url = "http://beta.auth.revup.reverieinc.com/apiman-gateway/Rev_app_devesh/transliteration/1.0?target_lang="+target_lang+"&source_lang=english&domain=2&convert_number=true"
    let response = await axios.post(post_url,
        { "data": data },
        { headers: { 'REV-API-KEY': 'fc294a1cfe56761a9b46b6f259db31d5', 'REV-APP-ID': 'devesh_new_appid' } });

    let localized = {}
    let res = response.data.responseList.map(x => localized[x.inString.toLowerCase()] = x.outString[0])
    // let res = response.data.responseList.map( x => localized[x.inString.toLowerCase()] = x.outString[0])
    return localized
}

//Old Logic
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
//----------------------------------
function cb(node, i) {
    let case_insensitive_set = new Set()

    var text = $($(node.name).eq(i)).text().replace(/^\s+|\s+$/gm, '')
    console.log("-------" + text + "--------")
    if (!bcheck) {
        if (!case_insensitive_set.has(text.toLowerCase())) {
            mt_data.push(text)
            case_insensitive_set.add(text.toLowerCase())
            totalData.push(...mt_data)
        }
    }
    else {
        node.nodeValue = tns[text.toLowerCase()]
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