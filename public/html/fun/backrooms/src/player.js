export function createPlayer(camera, config) {
  const { PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_SPRINT, MOUSE_SENSITIVITY } = config;

  const position = new THREE.Vector3(0, PLAYER_HEIGHT, 0);
  let yaw   = 0;
  let pitch = 0;
  const velocity     = new THREE.Vector3();
  const keys         = new Set();
  let pointerLocked  = false;

  // Overlay
  let overlay = document.getElementById('overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.style.position   = 'fixed';
    overlay.style.top        = '50%';
    overlay.style.left       = '50%';
    overlay.style.transform  = 'translate(-50%,-50%)';
    overlay.style.color      = '#fff';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize   = '1.5rem';
    overlay.style.letterSpacing  = '0.2em';
    overlay.style.pointerEvents  = 'none';
    overlay.style.userSelect     = 'none';
    overlay.style.zIndex         = '10';
    overlay.textContent = 'CLICK TO EXPLORE';
    document.body.appendChild(overlay);
  }

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = !!document.pointerLockElement;
    overlay.style.display = pointerLocked ? 'none' : '';
  });

  window.addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    yaw   -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    pitch  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
  });

  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });

  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _move  = new THREE.Vector3();

  function update(dt, collisionFn) {
    // Forward: -sin(yaw), 0, -cos(yaw)  (camera looks down -Z when yaw=0)
    _fwd.x = -Math.sin(yaw); _fwd.y = 0; _fwd.z = -Math.cos(yaw);
    _right.x = Math.cos(yaw); _right.y = 0; _right.z = -Math.sin(yaw);
    _move.x = 0; _move.y = 0; _move.z = 0;

    if (keys.has('w') || keys.has('arrowup'))    { _move.x += _fwd.x;   _move.z += _fwd.z; }
    if (keys.has('s') || keys.has('arrowdown'))  { _move.x -= _fwd.x;   _move.z -= _fwd.z; }
    if (keys.has('d') || keys.has('arrowright')) { _move.x += _right.x; _move.z += _right.z; }
    if (keys.has('a') || keys.has('arrowleft'))  { _move.x -= _right.x; _move.z -= _right.z; }

    const len = Math.sqrt(_move.x * _move.x + _move.z * _move.z);
    if (len > 0) { _move.x /= len; _move.z /= len; }

    const speed = keys.has('shift') ? PLAYER_SPRINT : PLAYER_SPEED;
    position.x += _move.x * speed * dt;
    position.z += _move.z * speed * dt;

    const corrected = collisionFn(position);
    position.copy(corrected);
    position.y = PLAYER_HEIGHT;

    camera.rotation.order = 'YXZ';
    camera.rotation.y     = yaw;
    camera.rotation.x     = pitch;
    camera.position.copy(position);
  }

  function getPosition() { return position.clone(); }
  function getYaw()      { return yaw; }
  function setPosition(x, y, z) { position.x = x; position.y = y; position.z = z; }

  return { update, getPosition, getYaw, setPosition };
}

export function requestPointerLock(canvas) {
  canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
  });
}
