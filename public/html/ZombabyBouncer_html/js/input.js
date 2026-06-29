// input.js - keyboard state by keyCode (matches AS3 Input.isKeyDown usage).
(function (global) {
  "use strict";
  const down = {};
  window.addEventListener("keydown", (e) => {
    down[e.keyCode] = true;
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { down[e.keyCode] = false; });
  global.Input = {
    isKeyDown(code) { return !!down[code]; },
    clear() { for (const k in down) down[k] = false; },
  };
})(window);
