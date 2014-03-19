//require("codemirror");

// closebrackets.js
// ------------------------------------------------------------------------


var DEFAULT_BRACKETS = "()[]\"\"";
var DEFAULT_EXPLODE_ON_ENTER = "[]{}";
var SPACE_CHAR_REGEX = /\s/;

CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
  if (old != CodeMirror.Init && old)
    cm.removeKeyMap("autoCloseBrackets");
  if (!val) return;
  var pairs = DEFAULT_BRACKETS, explode = DEFAULT_EXPLODE_ON_ENTER;
  if (typeof val == "string") pairs = val;
  else if (typeof val == "object") {
    if (val.pairs != null) pairs = val.pairs;
    if (val.explode != null) explode = val.explode;
  }
  var map = buildKeymap(pairs);
  if (explode) map.Enter = buildExplodeHandler(explode);
  cm.addKeyMap(map);
});

function charsAround(cm, pos) {
  var str = cm.getRange(CodeMirror.Pos(pos.line, pos.ch - 1),
                        CodeMirror.Pos(pos.line, pos.ch + 1));
  return str.length == 2 ? str : null;
}

function buildKeymap(pairs) {
  var map = {
    name : "autoCloseBrackets",
    Backspace: function(cm) {
      if (cm.somethingSelected()) return CodeMirror.Pass;
      var cur = cm.getCursor(), around = charsAround(cm, cur);
      if (around && pairs.indexOf(around) % 2 == 0)
        cm.replaceRange("", CodeMirror.Pos(cur.line, cur.ch - 1), CodeMirror.Pos(cur.line, cur.ch + 1));
      else
        return CodeMirror.Pass;
    }
  };
  var closingBrackets = "";
  for (var i = 0; i < pairs.length; i += 2) (function(left, right) {
    if (left != right) closingBrackets += right;
    function surround(cm) {
      var selection = cm.getSelection();
      cm.replaceSelection(left + selection + right);
    }
    function maybeOverwrite(cm) {
      var cur = cm.getCursor(), ahead = cm.getRange(cur, CodeMirror.Pos(cur.line, cur.ch + 1));
      if (ahead != right || cm.somethingSelected()) return CodeMirror.Pass;
      else cm.execCommand("goCharRight");
    }
    map["'" + left + "'"] = function(cm) {
      if (left == "'" && cm.getTokenAt(cm.getCursor()).type == "comment")
        return CodeMirror.Pass;
      if (cm.somethingSelected()) return surround(cm);
      if (left == right && maybeOverwrite(cm) != CodeMirror.Pass) return;
      var cur = cm.getCursor(), ahead = CodeMirror.Pos(cur.line, cur.ch + 1);
      var line = cm.getLine(cur.line), nextChar = line.charAt(cur.ch), curChar = cur.ch > 0 ? line.charAt(cur.ch - 1) : "";
      if (left == right && CodeMirror.isWordChar(curChar))
        return CodeMirror.Pass;
      if (line.length == cur.ch || closingBrackets.indexOf(nextChar) >= 0 || SPACE_CHAR_REGEX.test(nextChar))
        cm.replaceSelection(left + right, {head: ahead, anchor: ahead});
      else
        return CodeMirror.Pass;
    };
    if (left != right) map["'" + right + "'"] = maybeOverwrite;
  })(pairs.charAt(i), pairs.charAt(i + 1));
  return map;
}

function buildExplodeHandler(pairs) {
  return function(cm) {
    var cur = cm.getCursor(), around = charsAround(cm, cur);
    if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    cm.operation(function() {
      var newPos = CodeMirror.Pos(cur.line + 1, 0);
      cm.replaceSelection("\n\n", {anchor: newPos, head: newPos}, "+input");
      cm.indentLine(cur.line + 1, null, true);
      cm.indentLine(cur.line + 2, null, true);
    });
  };
}

// matchbrackets.js
// ------------------------------------------------------------------------

(function() {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<"};
  function findMatchingBracket(cm) {
    var maxScanLen = cm.state._matchBrackets.maxScanLineLength || 10000;

    var cur = cm.getCursor(), line = cm.getLineHandle(cur.line), pos = cur.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var forward = match.charAt(1) == ">", d = forward ? 1 : -1;
    var style = cm.getTokenAt(Pos(cur.line, pos + 1)).type;

    var stack = [line.text.charAt(pos)], re = /[()]/;
    function scan(line, lineNo, start) {
      if (!line.text) return;
      var pos = forward ? 0 : line.text.length - 1, end = forward ? line.text.length : -1;
      if (line.text.length > maxScanLen) return null;
      var checkTokenStyles = line.text.length < 1000;
      if (start != null) pos = start + d;
      for (; pos != end; pos += d) {
        var ch = line.text.charAt(pos);
        if (re.test(ch) && (!checkTokenStyles || cm.getTokenAt(Pos(lineNo, pos + 1)).type == style)) {
          var match = matching[ch];
          if (match.charAt(1) == ">" == forward) stack.push(ch);
          else if (stack.pop() != match.charAt(0)) return {pos: pos, match: false};
          else if (!stack.length) return {pos: pos, match: true};
        }
      }
    }
    for (var i = cur.line, found, e = forward ? Math.min(i + 100, cm.lineCount()) : Math.max(-1, i - 100); i != e; i+=d) {
      if (i == cur.line) found = scan(line, i, pos);
      else found = scan(cm.getLineHandle(i), i);
      if (found) break;
    }
    return {from: Pos(cur.line, pos), to: found && Pos(i, found.pos), match: found && found.match};
  }

  function matchBrackets(cm, autoclear) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state._matchBrackets.maxHighlightLineLength || 1000;
    var found = findMatchingBracket(cm);
    if (!found || cm.getLine(found.from.line).length > maxHighlightLen ||
       found.to && cm.getLine(found.to.line).length > maxHighlightLen)
      return;

    var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
    var one = cm.markText(found.from, Pos(found.from.line, found.from.ch + 1), {className: style});
    var two = found.to && cm.markText(found.to, Pos(found.to.line, found.to.ch + 1), {className: style});
    // Kludge to work around the IE bug from issue #1193, where text
    // input stops going to the textare whever this fires.
    if (ie_lt8 && cm.state.focused) cm.display.input.focus();
    var clear = function() {
      cm.operation(function() { one.clear(); two && two.clear(); });
    };
    if (autoclear) setTimeout(clear, 800);
    else return clear;
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      if (!cm.somethingSelected()) currentlyHighlighted = matchBrackets(cm, false);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state._matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(){return findMatchingBracket(this);});
})();
