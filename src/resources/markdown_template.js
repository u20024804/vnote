var content;

// Current header index in all headers.
var currentHeaderIdx = -1;

// Pending keys for keydown.
var pendingKeys = [];

var VMermaidDivClass = 'mermaid-diagram';
var VFlowchartDivClass = 'flowchart-diagram';
if (typeof VEnableMermaid == 'undefined') {
    VEnableMermaid = false;
} else if (VEnableMermaid) {
    mermaidAPI.initialize({
        startOnLoad: false
    });
}

if (typeof VEnableFlowchart == 'undefined') {
    VEnableFlowchart = false;
}

if (typeof VEnableMathjax == 'undefined') {
    VEnableMathjax = false;
}

if (typeof VEnableHighlightLineNumber == 'undefined') {
    VEnableHighlightLineNumber = false;
}

if (typeof VStylesToInline == 'undefined') {
    VStylesToInline = '';
}

// Add a caption (using alt text) under the image.
var VImageCenterClass = 'img-center';
var VImageCaptionClass = 'img-caption';
var VImagePackageClass = 'img-package';
if (typeof VEnableImageCaption == 'undefined') {
    VEnableImageCaption = false;
}

var replaceCssUrl = function(baseUrl, match, p1, offset, str) {
    content.setLog(baseUrl + " " + p1);
    return "url(\"haha.svg\");";
};

var translateCssUrlToAbsolute = function(baseUrl, css) {
    return css.replace(/\burl\(\"(.+)\"\);/g, replaceCssUrl.bind(undefined, baseUrl));
};

var styleContent = function() {
    var styles = "";
    for (var i = 0; i < document.styleSheets.length; ++i) {
        var styleSheet = document.styleSheets[i];
        if (styleSheet.cssRules) {
            var baseUrl = null;
            if (styleSheet.href) {
                baseUrl = styleSheet.href.substr(0, styleSheet.href.lastIndexOf('/'));
            }

            for (var j = 0; j < styleSheet.cssRules.length; ++j) {
                var css = styleSheet.cssRules[j].cssText;
                if (baseUrl) {
                    // Try to replace the url() with absolute path.
                    css = translateCssUrlToAbsolute(baseUrl, css);
                }

                styles = styles + css + "\n";
            }
        }
    }

    return styles;
};

var htmlContent = function() {
    content.htmlContentCB("", styleContent(), placeholder.innerHTML);
};

new QWebChannel(qt.webChannelTransport,
    function(channel) {
        content = channel.objects.content;
        if (typeof updateHtml == "function") {
            updateHtml(content.html);
            content.htmlChanged.connect(updateHtml);
        }
        if (typeof updateText == "function") {
            content.textChanged.connect(updateText);
            content.updateText();
        }
        content.requestScrollToAnchor.connect(scrollToAnchor);

        if (typeof highlightText == "function") {
            content.requestHighlightText.connect(highlightText);
            content.noticeReadyToHighlightText();
        }

        if (typeof textToHtml == "function") {
            content.requestTextToHtml.connect(textToHtml);
            content.noticeReadyToTextToHtml();
        }

        if (typeof htmlContent == "function") {
            content.requestHtmlContent.connect(htmlContent);
        }
    });

var VHighlightedAnchorClass = 'highlighted-anchor';

var clearHighlightedAnchor = function() {
    var headers = document.getElementsByClassName(VHighlightedAnchorClass);
    while (headers.length > 0) {
        headers[0].classList.remove(VHighlightedAnchorClass);
    }
};

var highlightAnchor = function(anchor) {
    clearHighlightedAnchor();
    anchor.classList.add(VHighlightedAnchorClass);
};

var g_muteScroll = false;

var scrollToAnchor = function(anchor) {
    g_muteScroll = true;
    currentHeaderIdx = -1;
    if (!anchor) {
        window.scrollTo(0, 0);
        g_muteScroll = false;
        return;
    }

    var anc = document.getElementById(anchor);
    if (anc != null) {
        anc.scrollIntoView();
        highlightAnchor(anc);

        var headers = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
        for (var i = 0; i < headers.length; ++i) {
            if (headers[i] == anc) {
                currentHeaderIdx = i;
                break;
            }
        }
    }

    // Disable scroll temporarily.
    setTimeout("g_muteScroll = false", 100);
};

window.onwheel = function(e) {
    e = e || window.event;
    var ctrl = !!e.ctrlKey;
    if (ctrl) {
        e.preventDefault();
    }
}

window.onscroll = function() {
    if (g_muteScroll) {
        return;
    }

    currentHeaderIdx = -1;
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset;
    var eles = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    if (eles.length == 0) {
        content.setHeader("");
        return;
    }

    var biaScrollTop = scrollTop + 50;
    for (var i = 0; i < eles.length; ++i) {
        if (biaScrollTop >= eles[i].offsetTop) {
            currentHeaderIdx = i;
        } else {
            break;
        }
    }

    var curHeader = null;
    if (currentHeaderIdx != -1) {
        curHeader = eles[currentHeaderIdx].getAttribute("id");
    }

    content.setHeader(curHeader ? curHeader : "");
};

// Used to record the repeat token of user input.
var repeatToken = 0;

document.onkeydown = function(e) {
    // Need to clear pending kyes.
    var clear = true;

    // This even has been handled completely. No need to call the default handler.
    var accept = true;

    e = e || window.event;
    var key;
    var shift;
    var ctrl;
    if (e.which) {
        key = e.which;
    } else {
        key = e.keyCode;
    }

    shift = !!e.shiftKey;
    ctrl = !!e.ctrlKey;
    switch (key) {
    // Skip Ctrl, Shift, Alt, Supper.
    case 16:
    case 17:
    case 18:
    case 91:
        clear = false;
        break;

    // 0 - 9.
    case 48:
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
    case 96:
    case 97:
    case 98:
    case 99:
    case 100:
    case 101:
    case 102:
    case 103:
    case 104:
    case 105:
    {
        if (pendingKeys.length != 0 || ctrl || shift) {
            accept = false;
            break;
        }

        var num = key >= 96 ? key - 96 : key - 48;
        repeatToken = repeatToken * 10 + num;
        clear = false;
        break;
    }

    case 74: // J
        if (!ctrl && !shift) {
            window.scrollBy(0, 100);
            break;
        }

        accept = false;
        break;

    case 75: // K
        if (!ctrl && !shift) {
            window.scrollBy(0, -100);
            break;
        }

        accept = false;
        break;

    case 72: // H
        if (!ctrl && !shift) {
            window.scrollBy(-100, 0);
            break;
        }

        accept = false;
        break;

    case 76: // L
        if (!ctrl && !shift) {
            window.scrollBy(100, 0);
            break;
        }

        accept = false;
        break;

    case 71: // G
        if (shift) {
            if (pendingKeys.length == 0) {
                var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft || window.pageXOffset;
                var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                window.scrollTo(scrollLeft, scrollHeight);
                break;
            }
        } else if (!ctrl) {
            if (pendingKeys.length == 0) {
                // First g, pend it.
                pendingKeys.push({
                    key: key,
                    ctrl: ctrl,
                    shift: shift
                });

                clear = false;
                break;
            } else if (pendingKeys.length == 1) {
                var pendKey = pendingKeys[0];
                if (pendKey.key == key && !pendKey.shift && !pendKey.ctrl) {
                    var scrollLeft = document.documentElement.scrollLeft
                                     || document.body.scrollLeft
                                     || window.pageXOffset;
                    window.scrollTo(scrollLeft, 0);
                    break;
                }
            }
        }

        accept = false;
        break;

    case 85: // U
        if (ctrl) {
            var clientHeight = document.documentElement.clientHeight;
            window.scrollBy(0, -clientHeight / 2);
            break;
        }

        accept = false;
        break;

    case 68: // D
        if (ctrl) {
            var clientHeight = document.documentElement.clientHeight;
            window.scrollBy(0, clientHeight / 2);
            break;
        }

        accept = false;
        break;

    case 219: // [ or {
    {
        var repeat = repeatToken < 1 ? 1 : repeatToken;
        if (shift) {
            // {
            if (pendingKeys.length == 1) {
                var pendKey = pendingKeys[0];
                if (pendKey.key == key && !pendKey.shift && !pendKey.ctrl) {
                    // [{, jump to previous title at a higher level.
                    jumpTitle(false, -1, repeat);
                    break;
                }
            }
        } else if (!ctrl) {
            // [
            if (pendingKeys.length == 0) {
                // First [, pend it.
                pendingKeys.push({
                    key: key,
                    ctrl: ctrl,
                    shift: shift
                });

                clear = false;
                break;
            } else if (pendingKeys.length == 1) {
                var pendKey = pendingKeys[0];
                if (pendKey.key == key && !pendKey.shift && !pendKey.ctrl) {
                    // [[, jump to previous title.
                    jumpTitle(false, 1, repeat);
                    break;
                } else if (pendKey.key == 221 && !pendKey.shift && !pendKey.ctrl) {
                    // ][, jump to next title at the same level.
                    jumpTitle(true, 0, repeat);
                    break;
                }
            }
        }

        accept = false;
        break;
    }

    case 221: // ] or }
    {
        var repeat = repeatToken < 1 ? 1 : repeatToken;
        if (shift) {
            // }
            if (pendingKeys.length == 1) {
                var pendKey = pendingKeys[0];
                if (pendKey.key == key && !pendKey.shift && !pendKey.ctrl) {
                    // ]}, jump to next title at a higher level.
                    jumpTitle(true, -1, repeat);
                    break;
                }
            }
        } else if (!ctrl) {
            // ]
            if (pendingKeys.length == 0) {
                // First ], pend it.
                pendingKeys.push({
                    key: key,
                    ctrl: ctrl,
                    shift: shift
                });

                clear = false;
                break;
            } else if (pendingKeys.length == 1) {
                var pendKey = pendingKeys[0];
                if (pendKey.key == key && !pendKey.shift && !pendKey.ctrl) {
                    // ]], jump to next title.
                    jumpTitle(true, 1, repeat);
                    break;
                } else if (pendKey.key == 219 && !pendKey.shift && !pendKey.ctrl) {
                    // [], jump to previous title at the same level.
                    jumpTitle(false, 0, repeat);
                    break;
                }
            }
        }

        accept = false;
        break;
    }

    default:
        accept = false;
        break;
    }

    if (clear) {
        repeatToken = 0;
        pendingKeys = [];
    }

    if (accept) {
        e.preventDefault();
    } else {
        content.keyPressEvent(key, ctrl, shift);
    }
};

var mermaidParserErr = false;
var mermaidIdx = 0;

if (VEnableMermaid) {
    mermaidAPI.parseError = function(err, hash) {
        content.setLog("err: " + err);
        mermaidParserErr = true;

        // Clean the container element, or mermaidAPI won't render the graph with
        // the same id.
        var errGraph = document.getElementById('mermaid-diagram-' + mermaidIdx);
        var parentNode = errGraph.parentElement;
        parentNode.outerHTML = '';
        delete parentNode;
    };
}

// @className, the class name of the mermaid code block, such as 'lang-mermaid'.
var renderMermaid = function(className) {
    if (!VEnableMermaid) {
        return;
    }

    var codes = document.getElementsByTagName('code');
    mermaidIdx = 0;
    for (var i = 0; i < codes.length; ++i) {
        var code = codes[i];
        if (code.classList.contains(className)) {
            if (renderMermaidOne(code)) {
                // replaceChild() will decrease codes.length.
                --i;
            }
        }
    }
};

// Render @code as Mermaid graph.
// Returns true if succeeded.
var renderMermaidOne = function(code) {
    // Mermaid code block.
    mermaidParserErr = false;
    mermaidIdx++;
    try {
        // Do not increment mermaidIdx here.
        var graph = mermaidAPI.render('mermaid-diagram-' + mermaidIdx, code.textContent, function(){});
    } catch (err) {
        content.setLog("err: " + err);
        return false;
    }

    if (mermaidParserErr || typeof graph == "undefined") {
        return false;
    }

    var graphDiv = document.createElement('div');
    graphDiv.classList.add(VMermaidDivClass);
    graphDiv.innerHTML = graph;
    var preNode = code.parentNode;
    preNode.classList.add(VMermaidDivClass);
    preNode.replaceChild(graphDiv, code);
    return true;
};

var flowchartIdx = 0;

// @className, the class name of the flowchart code block, such as 'lang-flowchart'.
var renderFlowchart = function(className) {
    if (!VEnableFlowchart) {
        return;
    }

    var codes = document.getElementsByTagName('code');
    flowchartIdx = 0;
    for (var i = 0; i < codes.length; ++i) {
        var code = codes[i];
        if (code.classList.contains(className)) {
            if (renderFlowchartOne(code, flowchartIdx)) {
                // replaceChild() will decrease codes.length.
                --i;
            }
        }
    }
};

// Render @code as Flowchart.js graph.
// Returns true if succeeded.
var renderFlowchartOne = function(code) {
    // Flowchart code block.
    flowchartIdx++;
    try {
        var graph = flowchart.parse(code.textContent);
    } catch (err) {
        content.setLog("err: " + err);
        return false;
    }

    if (typeof graph == "undefined") {
        return false;
    }

    var graphDiv = document.createElement('div');
    graphDiv.id = 'flowchart-diagram-' + flowchartIdx;
    graphDiv.classList.add(VFlowchartDivClass);
    var preNode = code.parentNode;
    preNode.replaceChild(graphDiv, code);

    // Draw on it after adding it to page.
    try {
        graph.drawSVG(graphDiv.id);
    } catch (err) {
        content.setLog("err: " + err);
        preNode.replaceChild(code, graphDiv);
        delete graphDiv;
        return false;
    }

    preNode.classList.add(VMermaidDivClass);
    return true;
};

var isImageBlock = function(img) {
    var pn = img.parentNode;
    return (pn.children.length == 1) && (pn.textContent == '');
};

var isImageWithBr = function(img) {
    var sibling = img.nextSibling;
    while (sibling) {
        if (sibling.nodeType == 8) {
            // Comment node.
            // Just continue.
            sibling = sibling.nextSibling;
            continue;
        } else if (sibling.nodeType == 1) {
            if (sibling.tagName == 'BR') {
                break;
            }
        }

        return false;
    }

    sibling = img.previousSibling;
    while (sibling) {
        if (sibling.nodeType == 8) {
            // Comment node.
            sibling = sibling.previousSibling;
            continue;
        } else if (sibling.nodeType == 1) {
            // Element node.
            if (sibling.tagName == 'BR') {
                break;
            }
        } else if (sibling.nodeType == 3) {
            // Text node.
            if (sibling.nodeValue == '\n') {
                var tmp = sibling.previousSibling;
                if (tmp && tmp.tagName == 'BR') {
                    break;
                }
            }
        }

        return false;
    }

    return true;
};

var getImageType = function(img) {
    var type = -1;
    if (isImageBlock(img)) {
        type = 0;
    } else if (isImageWithBr(img)) {
        type = 1;
    }

    return type;
};

// Center the image block and insert the alt text as caption.
var insertImageCaption = function() {
    if (!VEnableImageCaption) {
        return;
    }

    var imgs = document.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; ++i) {
        var img = imgs[i];

        var type = getImageType(img);

        if (type == -1) {
            continue;
        } else if (type == 1) {
            // Insert a div as the parent of the img.
            var imgPack = document.createElement('div');
            img.insertAdjacentElement('afterend', imgPack);
            imgPack.appendChild(img);
        }

        // Make the parent img-package.
        img.parentNode.classList.add(VImagePackageClass);

        // Make it center.
        img.classList.add(VImageCenterClass);

        if (img.alt == '') {
            continue;
        }

        // Add caption.
        var captionDiv = document.createElement('div');
        captionDiv.classList.add(VImageCaptionClass);
        captionDiv.textContent = img.alt;
        img.insertAdjacentElement('afterend', captionDiv);
    }
}

// The renderer specific code should call this function once thay have finished
// markdown-specifi handle logics, such as Mermaid, MathJax.
var finishLogics = function() {
    content.finishLogics();
};

// Escape @text to Html.
var escapeHtml = function(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
};

// Return the topest level of @toc, starting from 1.
var baseLevelOfToc = function(p_toc) {
    var level = -1;
    for (i in p_toc) {
        if (level == -1) {
            level = p_toc[i].level;
        } else if (level > p_toc[i].level) {
            level = p_toc[i].level;
        }
    }

    if (level == -1) {
        level = 1;
    }

    return level;
};

// Handle wrong title levels, such as '#' followed by '###'
var toPerfectToc = function(p_toc, p_baseLevel) {
    var i;
    var curLevel = p_baseLevel - 1;
    var perfToc = [];
    for (i in p_toc) {
        var item = p_toc[i];

        // Insert empty header.
        while (item.level > curLevel + 1) {
            curLevel += 1;
            var tmp = { level: curLevel,
                        anchor: '',
                        title: '[EMPTY]'
                      };
            perfToc.push(tmp);
        }

        perfToc.push(item);
        curLevel = item.level;
    }

    return perfToc;
};

var itemToHtml = function(item) {
    return '<a href="#' + item.anchor + '">' + item.title + '</a>';
};

// Turn a perfect toc to a tree using <ul>
var tocToTree = function(p_toc, p_baseLevel) {
    var i;
    var front = '<li>';
    var ending = ['</li>'];
    var curLevel = p_baseLevel;
    for (i in p_toc) {
        var item = p_toc[i];
        if (item.level == curLevel) {
            front += '</li>';
            front += '<li>';
            front += itemToHtml(item);
        } else if (item.level > curLevel) {
            // assert(item.level - curLevel == 1)
            front += '<ul>';
            ending.push('</ul>');
            front += '<li>';
            front += itemToHtml(item);
            ending.push('</li>');
            curLevel = item.level;
        } else {
            while (item.level < curLevel) {
                var ele = ending.pop();
                front += ele;
                if (ele == '</ul>') {
                    curLevel--;
                }
            }
            front += '</li>';
            front += '<li>';
            front += itemToHtml(item);
        }
    }
    while (ending.length > 0) {
        front += ending.pop();
    }
    front = front.replace("<li></li>", "");
    front = '<ul>' + front + '</ul>';
    return front;
};

var handleToc = function(needToc) {
    var baseLevel = baseLevelOfToc(toc);
    var tocTree = tocToTree(toPerfectToc(toc, baseLevel), baseLevel);
    content.setToc(tocTree, baseLevel);

    // Add it to html
    if (needToc) {
        var eles = document.getElementsByClassName('vnote-toc');
        for (var i = 0; i < eles.length; ++i) {
            eles[i].innerHTML = tocTree;
        }
    }
};

// Implement mouse drag with Ctrl and left button pressed to scroll.
var vds_oriMouseClientX = 0;
var vds_oriMouseClientY = 0;
var vds_readyToScroll = false;
var vds_scrolled = false;

window.onmousedown = function(e) {
    e = e || window.event;
    // Left button and Ctrl key.
    if (e.buttons == 1
        && e.ctrlKey
        && window.getSelection().rangeCount == 0) {
        vds_oriMouseClientX = e.clientX;
        vds_oriMouseClientY = e.clientY;
        vds_readyToScroll = true;
        vds_scrolled = false;
        e.preventDefault();
    } else {
        vds_readyToScroll = false;
        vds_scrolled = false;
    }
};

window.onmouseup = function(e) {
    e = e || window.event;
    if (vds_scrolled || vds_readyToScroll) {
        // Have been scrolled, restore the cursor style.
        document.body.style.cursor = "auto";
        e.preventDefault();
    }

    vds_readyToScroll = false;
    vds_scrolled = false;
};

window.onmousemove = function(e) {
    e = e || window.event;
    if (vds_readyToScroll) {
        deltaX = e.clientX - vds_oriMouseClientX;
        deltaY = e.clientY - vds_oriMouseClientY;

        var threshold = 5;
        if (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold) {
            vds_oriMouseClientX = e.clientX;
            vds_oriMouseClientY = e.clientY;

            if (!vds_scrolled) {
                vds_scrolled = true;
                document.body.style.cursor = "all-scroll";
            }

            var scrollX = -deltaX;
            var scrollY = -deltaY;
            window.scrollBy(scrollX, scrollY);
        }

        e.preventDefault();
    }
};

// @forward: jump forward or backward.
// @relativeLevel: 0 for the same level as current header;
//                 negative value for upper level;
//                 positive value is ignored.
var jumpTitle = function(forward, relativeLevel, repeat) {
    var headers = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headers.length == 0) {
        return;
    }

    if (currentHeaderIdx == -1) {
        // At the beginning, before any headers.
        if (relativeLevel < 0 || !forward) {
            return;
        }
    }

    var targetIdx = -1;
    // -1: skip level check.
    var targetLevel = 0;

    var delta = 1;
    if (!forward) {
        delta = -1;
    }

    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset;

    var firstHeader = true;
    for (targetIdx = (currentHeaderIdx == -1 ? 0 : currentHeaderIdx);
         targetIdx >= 0 && targetIdx < headers.length;
         targetIdx += delta) {
        var header = headers[targetIdx];
        var level = parseInt(header.tagName.substr(1));
        if (targetLevel == 0) {
            targetLevel = level;
            if (relativeLevel < 0) {
                targetLevel += relativeLevel;
                if (targetLevel < 1) {
                    // Invalid level.
                    return false;
                }
            } else if (relativeLevel > 0) {
                targetLevel = -1;
            }
        }

        if (targetLevel == -1 || level == targetLevel) {
            if (targetIdx == currentHeaderIdx) {
                // If current header is visible, skip it.
                // Minus 2 to tolerate some margin.
                if (forward || scrollTop  - 2 <= headers[targetIdx].offsetTop) {
                    continue;
                }
            }

            if (--repeat == 0) {
                break;
            }
        } else if (level < targetLevel) {
            return;
        }

        firstHeader = false;
    }

    if (targetIdx < 0 || targetIdx >= headers.length) {
        return;
    }

    // Disable scroll temporarily.
    g_muteScroll = true;
    headers[targetIdx].scrollIntoView();
    highlightAnchor(headers[targetIdx]);
    currentHeaderIdx = targetIdx;
    content.setHeader(headers[targetIdx].getAttribute("id"));
    setTimeout("g_muteScroll = false", 100);
};

var renderCodeBlockLineNumber = function() {
    if (!VEnableHighlightLineNumber) {
        return;
    }

    var codes = document.getElementsByTagName('code');
    for (var i = 0; i < codes.length; ++i) {
        var code = codes[i];
        var pare = code.parentElement;
        if (pare.tagName.toLowerCase() == 'pre') {
            if (VEnableMathjax && pare.classList.contains("lang-mathjax")) {
                continue;
            }

            hljs.lineNumbersBlock(code);
        }
    }

    // Delete the last extra row.
    var tables = document.getElementsByTagName('table');
    for (var i = 0; i < tables.length; ++i) {
        var table = tables[i];
        if (table.classList.contains("hljs-ln")) {
            var rowCount = table.rows.length;
            table.deleteRow(rowCount - 1);
        }
    }
};

var addClassToCodeBlock = function() {
    var hljsClass = 'hljs';
    var codes = document.getElementsByTagName('code');
    for (var i = 0; i < codes.length; ++i) {
        var code = codes[i];
        var pare = code.parentElement;
        if (pare.tagName.toLowerCase() == 'pre') {
            code.classList.add(hljsClass);

            if (VEnableMathjax
                && (code.classList.contains("lang-mathjax")
                    || code.classList.contains("language-mathjax"))) {
                // Add the class to pre.
                pare.classList.add("lang-mathjax");
                pare.classList.add("language-mathjax");
            }
        }
    }
};

var listContainsRegex = function(strs, exp) {
    for (var i = 0, len = strs.length; i < len; ++i) {
        if (exp.test(strs[i])) {
            return true;
        }
    }

    return false;
};

var StylesToInline = null;

var initStylesToInline = function() {
    console.log('initStylesToInline');
    StylesToInline = new Map();

    if (VStylesToInline.length == 0) {
        return;
    }

    var rules = VStylesToInline.split(',');
    for (var i = 0; i < rules.length; ++i) {
        var vals = rules[i].split('$');
        if (vals.length != 2) {
            continue;
        }

        var tags = vals[0].split(':');
        var pros = vals[1].split(':');
        for (var j = 0; j < tags.length; ++j) {
            StylesToInline.set(tags[j].toLowerCase(), pros);
        }
    }
};

// Embed the CSS styles of @ele and all its children.
var embedInlineStyles = function(ele) {
    var tagName = ele.tagName.toLowerCase();
    var props = StylesToInline.get(tagName);
    if (!props) {
        props = StylesToInline.get('all');

        if (!props) {
            return;
        }
    }

    // Embed itself.
    var style = window.getComputedStyle(ele, null);
    for (var i = 0; i < props.length; ++i) {
        var pro = props[i];
        ele.style.setProperty(pro, style.getPropertyValue(pro));
    }

    // Embed children.
    var children = ele.children;
    for (var i = 0; i < children.length; ++i) {
        embedInlineStyles(children[i]);
    }
};

var getHtmlWithInlineStyles = function(container) {
    if (!StylesToInline) {
        initStylesToInline();
    }

    var children = container.children;
    for (var i = 0; i < children.length; ++i) {
        embedInlineStyles(children[i]);
    }

    return container.innerHTML;
};

// Will be called after MathJax rendering finished.
var postProcessMathJax = function() {
    var all = MathJax.Hub.getAllJax();
    for (var i = 0; i < all.length; ++i) {
        var node = all[i].SourceElement().parentNode;
        if (node.tagName.toLowerCase() == 'code') {
            node.classList.remove('hljs');
            node.classList.add('mathjax-code');
        }
    }

    finishLogics();
};
