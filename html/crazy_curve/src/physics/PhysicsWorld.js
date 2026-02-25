import {
    TABLE_WIDTH,
    TABLE_LENGTH,
    BALL_RADIUS,
    POCKET_PLATFORM_Y,
    POCKET_PLATFORM_SIZE,
    POCKET_POSITIONS,
    BALL_BALL_RESTITUTION,
    BALL_BALL_FRICTION,
    BALL_TABLE_RESTITUTION,
    BALL_TABLE_FRICTION,
    BALL_CUSHION_RESTITUTION,
    BALL_CUSHION_FRICTION,
    POCKET_BACK_RESTITUTION,
    POCKET_BACK_FRICTION,
    POCKET_X,
    POCKET_Z,
    POCKET_M,
    CURVE_X,
    CURVE_Z,
    CUSHION_DEPTH,
    CUSHION_HEIGHT,
    WOOD_EDGE_HEIGHT
} from '../config.js';

/**
 * Build the static table geometry as Cannon.js bodies in a standalone world.
 * This replaces the Babylon physics plugin — no PhysicsImpostor needed.
 * @returns {CANNON.World} A world containing only static table/cushion/pocket bodies
 */
export function createStaticTableWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);

    const W = TABLE_WIDTH;
    const L = TABLE_LENGTH;
    const cH = CUSHION_HEIGHT;
    const cD = CUSHION_DEPTH;
    const wH = WOOD_EDGE_HEIGHT;
    const pX = POCKET_X;
    const pZ = POCKET_Z;
    const pM = POCKET_M;
    const cX = CURVE_X;
    const cZ = CURVE_Z;
    const curveLen = Math.sqrt(cX * cX + cZ * cZ);
    const side = L / 2 - pM / 2 - pZ;
    const midside = side / 2 + pM / 2;
    const wY = cH - 0.5 * wH + 0.2 * 0.25; // wood edge center y

    function addBox(w, h, d, x, y, z, rx, ry, rz) {
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
        body.position.set(x, y, z);
        if (rx || ry || rz) {
            body.quaternion.setFromEuler(rx || 0, ry || 0, rz || 0, 'YXZ');
        }
        world.addBody(body);
        return body;
    }

    function addGround(w, d, x, y, z, rx, ry, rz) {
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 0.001, d / 2)));
        body.position.set(x, y, z);
        if (rx || ry || rz) {
            body.quaternion.setFromEuler(rx || 0, ry || 0, rz || 0, 'YXZ');
        }
        body.bodyType = 'table';
        world.addBody(body);
    }

    // ── Cushions (y = CUSHION_HEIGHT) ──

    // Top / bottom cushions
    const cushW = W - pX * 2 - cX * 2;
    addBox(cushW, 0.2, cD, 0, cH, L / 2).bodyType = 'cushion';
    addBox(cushW, 0.2, cD, 0, cH, -L / 2).bodyType = 'cushion';

    // Side cushions
    const sideLen = side - cZ * 2;
    addBox(cD, 0.2, sideLen, -W / 2, cH, midside).bodyType = 'cushion';
    addBox(cD, 0.2, sideLen, W / 2, cH, midside).bodyType = 'cushion';
    addBox(cD, 0.2, sideLen, -W / 2, cH, -midside).bodyType = 'cushion';
    addBox(cD, 0.2, sideLen, W / 2, cH, -midside).bodyType = 'cushion';

    // Corner curves (all rotated -PI/4 around Y)
    const r45 = -Math.PI / 4;
    const halfCush = cushW / 2;
    const cvOff = cD / 2 - curveLen / 2; // offset from cushion face toward pocket

    // Top cushion corners
    addBox(cX, 0.2, cZ, -halfCush, cH, L / 2 - cvOff, 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, halfCush, cH, L / 2 - cvOff, 0, r45, 0).bodyType = 'cushion';
    // Top side-pocket corners
    addBox(cX, 0.2, cZ, -(W / 2 - cD / 2 + curveLen / 2), cH, side + pM / 2 - cZ, 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, (W / 2 - cD / 2 + curveLen / 2), cH, side + pM / 2 - cZ, 0, r45, 0).bodyType = 'cushion';

    // Bottom cushion corners
    addBox(cX, 0.2, cZ, -halfCush, cH, -(L / 2 - cvOff), 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, halfCush, cH, -(L / 2 - cvOff), 0, r45, 0).bodyType = 'cushion';
    // Bottom side-pocket corners
    addBox(cX, 0.2, cZ, -(W / 2 - cD / 2 + curveLen / 2), cH, -(side + pM / 2 - cZ), 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, (W / 2 - cD / 2 + curveLen / 2), cH, -(side + pM / 2 - cZ), 0, r45, 0).bodyType = 'cushion';

    // Middle pocket curves
    addBox(cX, 0.2, cZ, -(W / 2 - cD / 2 + curveLen / 2), cH, pM / 2 + cZ, 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, -(W / 2 - cD / 2 + curveLen / 2), cH, -(pM / 2 + cZ), 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, (W / 2 - cD / 2 + curveLen / 2), cH, pM / 2 + cZ, 0, r45, 0).bodyType = 'cushion';
    addBox(cX, 0.2, cZ, (W / 2 - cD / 2 + curveLen / 2), cH, -(pM / 2 + cZ), 0, r45, 0).bodyType = 'cushion';

    // ── Wood edges ──

    addBox(cushW, wH, 2.0, 0, wY, L / 2 + 0.75).bodyType = 'wood';
    addBox(cushW, wH, 2.0, 0, wY, -L / 2 - 0.75).bodyType = 'wood';
    addBox(2.0, wH, sideLen, -W / 2 - 0.75, wY, midside).bodyType = 'wood';
    addBox(2.0, wH, sideLen, W / 2 + 0.75, wY, midside).bodyType = 'wood';
    addBox(2.0, wH, sideLen, -W / 2 - 0.75, wY, -midside).bodyType = 'wood';
    addBox(2.0, wH, sideLen, W / 2 + 0.75, wY, -midside).bodyType = 'wood';

    // ── Pocket backs (y = -0.5) ──

    // Top-left
    addBox(0.5, wH, 3.0, -(W / 2 + pX * 0.17), -0.5, L / 2 + pZ * 0.17, 0, Math.PI / 4, -0.1).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, -(W / 2 + pX * 0.26 - 2.5), -0.5, L / 2 + pZ * 0.35, 0, Math.PI * 18 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, -(W / 2 + pX * 0.35), -0.5, L / 2 + pZ * 0.26 - 2.5, 0, -Math.PI * 2 / 32, 0).bodyType = 'pocket';

    // Top-right
    addBox(0.5, wH, 3.0, (W / 2 + pX * 0.17), -0.5, L / 2 + pZ * 0.17, 0, Math.PI / 4 + Math.PI / 2, -0.1).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, (W / 2 + pX * 0.26 - 2.5), -0.5, L / 2 + pZ * 0.35, 0, Math.PI * 14 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, (W / 2 + pX * 0.35), -0.5, L / 2 + pZ * 0.26 - 2.5, 0, Math.PI * 2 / 32, 0).bodyType = 'pocket';

    // Bottom-left
    addBox(0.5, wH, 3.0, -(W / 2 + pX * 0.17), -0.5, -(L / 2 + pZ * 0.17), 0, Math.PI / 4 + Math.PI / 2, 0.1).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, -(W / 2 + pX * 0.26 - 2.5), -0.5, -(L / 2 + pZ * 0.35), 0, Math.PI * 14 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, -(W / 2 + pX * 0.35), -0.5, -(L / 2 + pZ * 0.26 - 2.5), 0, Math.PI * 2 / 32, 0).bodyType = 'pocket';

    // Bottom-right
    addBox(0.5, wH, 3.0, (W / 2 + pX * 0.17), -0.5, -(L / 2 + pZ * 0.17), 0, Math.PI / 4, 0.1).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, (W / 2 + pX * 0.26 - 2.5), -0.5, -(L / 2 + pZ * 0.35), 0, Math.PI * 18 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 2.5, (W / 2 + pX * 0.35), -0.5, -(L / 2 + pZ * 0.26 - 2.5), 0, -Math.PI * 2 / 32, 0).bodyType = 'pocket';

    // Middle-left
    addBox(0.5, wH, 3.0, -(W / 2 + pX * 1.3), -0.5, 0, 0, Math.PI, 0.1).bodyType = 'pocket';
    addBox(0.5, wH, 1.5, -(W / 2 + pX * 1.0), -0.5, -(pZ * 0.7), 0, Math.PI * 20 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 1.5, -(W / 2 + pX * 1.0), -0.5, pZ * 0.7, 0, Math.PI * 12 / 32, 0).bodyType = 'pocket';

    // Middle-right
    addBox(0.5, wH, 3.0, (W / 2 + pX * 1.3), -0.5, 0, 0, 0, 0.1).bodyType = 'pocket';
    addBox(0.5, wH, 1.5, (W / 2 + pX * 1.0), -0.5, -(pZ * 0.7), 0, Math.PI * 12 / 32, 0).bodyType = 'pocket';
    addBox(0.5, wH, 1.5, (W / 2 + pX * 1.0), -0.5, pZ * 0.7, 0, Math.PI * 20 / 32, 0).bodyType = 'pocket';

    // ── Ground surfaces (y = 0) ──

    // Main base
    addGround(W - pX * 2, L - pZ * 2, 0, 0, 0);

    // Top / bottom edges
    addGround(W - pX * 2, pZ, 0, 0, L / 2 - 1.5);
    addGround(W - pX * 2, 3, 0, 0, -L / 2 + 1.5);

    // Side edges
    addGround(pX, side, W / 2 - pX / 2, 0, midside);
    addGround(pX, side, -(W / 2 - pX / 2), 0, midside);
    addGround(pX, side, W / 2 - pX / 2, 0, -midside);
    addGround(pX, side, -(W / 2 - pX / 2), 0, -midside);

    // Corner angles (rotated PI/4)
    addGround(2, 2, -(W / 2 - pX * 1.1), 0, L / 2 - pZ * 1.1, 0, Math.PI / 4, 0);
    addGround(2, 2, (W / 2 - pX * 1.1), 0, L / 2 - pZ * 1.1, 0, Math.PI / 4, 0);
    addGround(2, 2, (W / 2 - pX * 1.1), 0, -(L / 2 - pZ * 1.1), 0, Math.PI / 4, 0);
    addGround(2, 2, -(W / 2 - pX * 1.1), 0, -(L / 2 - pZ * 1.1), 0, Math.PI / 4, 0);

    // Middle pocket angles
    addGround(4, 4, -(W / 2 - pX * 0.8), 0, pZ / 4 * 3, 0, Math.PI / 3, 0);
    addGround(4, 4, -(W / 2 - pX * 0.8), 0, -pZ / 4 * 3, 0, -Math.PI / 3, 0);
    addGround(4, 4, (W / 2 - pX * 0.8), 0, pZ / 4 * 3, 0, -Math.PI / 3, 0);
    addGround(4, 4, (W / 2 - pX * 0.8), 0, -pZ / 4 * 3, 0, Math.PI / 3, 0);

    return world;
}

/**
 * Create a Cannon.js simulation world by cloning static bodies from the
 * static table world and setting up materials / contact properties.
 * @param {CANNON.World} staticWorld - The static table world to clone from
 * @returns {CANNON.World} A new simulation world
 */
export function createSimWorld(staticWorld) {
    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Set up materials and contact properties
    const ballMaterial = new CANNON.Material('ball');
    const tableMaterial = new CANNON.Material('table');
    const cushionMaterial = new CANNON.Material('cushion');

    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, ballMaterial, {
        restitution: BALL_BALL_RESTITUTION,
        friction: BALL_BALL_FRICTION
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, tableMaterial, {
        restitution: BALL_TABLE_RESTITUTION,
        friction: BALL_TABLE_FRICTION
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, cushionMaterial, {
        restitution: BALL_CUSHION_RESTITUTION,
        friction: BALL_CUSHION_FRICTION
    }));

    const pocketMaterial = new CANNON.Material('pocket');
    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, pocketMaterial, {
        restitution: POCKET_BACK_RESTITUTION,
        friction: POCKET_BACK_FRICTION
    }));

    world.ballMaterial = ballMaterial;
    world.tableMaterial = tableMaterial;
    world.cushionMaterial = cushionMaterial;
    world.pocketMaterial = pocketMaterial;

    // Copy static bodies from the pre-built static world
    for (let i = 0; i < staticWorld.bodies.length; i++) {
        const src = staticWorld.bodies[i];
        if (src.mass !== 0) continue;

        // Assign material based on body purpose
        let mat = tableMaterial;
        if (src.bodyType === 'cushion') mat = cushionMaterial;
        else if (src.bodyType === 'pocket') mat = pocketMaterial;
        else if (src.bodyType === 'wood') mat = cushionMaterial;
        const body = new CANNON.Body({ mass: 0, material: mat });

        for (let s = 0; s < src.shapes.length; s++) {
            body.addShape(src.shapes[s], src.shapeOffsets[s], src.shapeOrientations[s]);
        }
        body.position.copy(src.position);
        body.quaternion.copy(src.quaternion);
        world.addBody(body);
    }

    // Pocket catch platforms — solid sensor with dead material.
    // Ball contacts platform, gets detected as potted, removed same step.
    const platformMaterial = new CANNON.Material('platform');
    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, platformMaterial, {
        restitution: 0,
        friction: 1.0
    }));

    world.pocketPlatforms = [];
    for (const pos of POCKET_POSITIONS) {
        const platform = new CANNON.Body({ mass: 0, material: platformMaterial });
        platform.addShape(new CANNON.Box(new CANNON.Vec3(POCKET_PLATFORM_SIZE, 0.5, POCKET_PLATFORM_SIZE)));
        platform.position.set(pos.x, POCKET_PLATFORM_Y, pos.z);
        platform.isPocketPlatform = true;
        world.addBody(platform);
        world.pocketPlatforms.push(platform);
    }

    return world;
}

/**
 * Apply friction forces to a ball body during simulation.
 * @param {CANNON.Body} body - The ball body
 * @returns {number} Current velocity magnitude
 */
export function applyBallFriction(body) {
    const v = body.velocity;
    const vLen = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const onTable = body.position.y < BALL_RADIUS + 0.01;

    // Air friction on vertical component
    v.y *= 0.999;

    // Ground friction - only when on the table
    if (onTable && vLen > 0.01) {
        const fx = -v.x / vLen;
        const fz = -v.z / vLen;
        body.applyForce(new CANNON.Vec3(fx, 0, fz), body.position);
    }

    // Stop when slow enough
    if (vLen < 0.05) {
        v.x = 0;
        v.z = 0;
        if (onTable) v.y = 0;
    }

    // Angular velocity friction - stronger when ball is nearly stationary
    const av = body.angularVelocity;
    if (onTable) {
        const angularFriction = (vLen < 0.5) ? 0.98 : 0.991;
        av.x *= angularFriction;
        av.y *= angularFriction;
        av.z *= angularFriction;
    }

    // Stop angular when slow enough
    if (Math.abs(av.x) < 0.02) av.x = 0;
    if (Math.abs(av.y) < 0.02) av.y = 0;
    if (Math.abs(av.z) < 0.02) av.z = 0;

    // Swerve - perpendicular force based on angular velocity (side spin)
    // Only on table - a spinning ball in flight doesn't swerve
    if (onTable && Math.abs(av.y) > 1 && vLen > 0.01) {
        const nx = v.x / vLen;
        const nz = v.z / vLen;
        const horizLen = Math.sqrt(nx * nx + nz * nz);
        if (horizLen > 0.001) {
            const px = -nz / horizLen;
            const pz = nx / horizLen;
            const swerveForce = av.y * -0.5;
            body.applyForce(new CANNON.Vec3(px * swerveForce, 0, pz * swerveForce), body.position);
        }
    }

    return vLen;
}

/**
 * Check if a ball should be considered stopped.
 * @param {CANNON.Body} body - The ball body
 * @param {number} vLen - Current velocity magnitude
 * @returns {boolean} True if ball is stopped
 */
export function isBallStopped(body, vLen) {
    if (vLen > 0.05) return false;
    const av = body.angularVelocity;
    if (Math.abs(av.x) > 0.02 || Math.abs(av.y) > 0.02 || Math.abs(av.z) > 0.02) return false;
    return true;
}

/**
 * Check if a ball is in contact with a pocket platform.
 * @param {CANNON.Body} ballBody - The ball body to check
 * @param {CANNON.World} world - The physics world
 * @returns {boolean} True if ball is touching a pocket platform
 */
export function isBallOnPocketPlatform(ballBody, world) {
    for (const contact of world.contacts) {
        const other = (contact.bi === ballBody) ? contact.bj :
                      (contact.bj === ballBody) ? contact.bi : null;
        if (other && other.isPocketPlatform) {
            return true;
        }
    }
    return false;
}

export function populateSimWorld(world, ballMeshes, whiteBall) {
    const simBalls = [];

    for (const mesh of ballMeshes) {
        const simBody = new CANNON.Body({
            mass: 1.0,
            angularDamping: 0.04,
            material: world.ballMaterial
        });
        simBody.addShape(new CANNON.Sphere(BALL_RADIUS));

        // Copy position from mesh, snap y to table surface to prevent drift/hop
        const pos = mesh.getAbsolutePosition();
        const y = (Math.abs(pos.y - BALL_RADIUS) < 0.5) ? BALL_RADIUS : pos.y;
        simBody.position.set(pos.x, y, pos.z);

        if (mesh.rotationQuaternion) {
            simBody.quaternion.set(
                mesh.rotationQuaternion.x,
                mesh.rotationQuaternion.y,
                mesh.rotationQuaternion.z,
                mesh.rotationQuaternion.w
            );
        }

        simBody.velocity.set(0, 0, 0);
        simBody.angularVelocity.set(0, 0, 0);

        simBody.isWhite = (mesh === whiteBall);
        simBody.isBall = true;
        simBody.ballColor = mesh.ballColor || "white";
        simBody.mesh = mesh;

        world.addBody(simBody);
        simBalls.push(simBody);
    }

    return simBalls;
}
