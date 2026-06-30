// input.js - keyboard state by keyCode (matches AS3 Input.isKeyDown usage) plus
// virtual buttons for the on-screen touch controls. The game asks for ACTIONS
// (brake / faster / restart); each action is satisfied by either a physical key
// or a held virtual button, so touch and keyboard drive the game identically.
(function (global) {
  "use strict";
  const down = {};
  // Virtual (on-screen button) action state, set by main.js pointer handlers.
  const virtual = { brake: false, faster: false };

  window.addEventListener("keydown", (e) => {
    down[e.keyCode] = true;
    // Stop the page from scrolling/zooming on the keys the game owns.
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { down[e.keyCode] = false; });

  global.Input = {
    isKeyDown(code) { return !!down[code]; },
    // Held controls combine physical keys with the on-screen buttons.
    brake() { return virtual.brake || !!down[65] || !!down[37]; },   // A / Left
    faster() { return virtual.faster || !!down[68] || !!down[39]; }, // D / Right
    setVirtual(action, isDown) {
      if (action in virtual) virtual[action] = !!isDown;
    },
    clear() {
      for (const k in down) down[k] = false;
      virtual.brake = virtual.faster = false;
    },
  };
})(window);
