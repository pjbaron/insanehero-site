import { createSimWorld, populateSimWorld, applyBallFriction, isBallStopped, isBallOnPocketPlatform } from './PhysicsWorld.js';
import { isNearPocket } from '../utils/pockets.js';
import {
    BALL_RADIUS,
    TABLE_LENGTH,
    FIXED_TIMESTEP,
    SIM_MAX_STEPS,
    SCORE_OWN_POT,
    SCORE_OPPONENT_POT,
    SCORE_BLACK_POT,
    SCORE_BLACK_EARLY,
    SCORE_FOUL,
    SCORE_MISS,
    SCORE_BREAK_BONUS,
    SCORE_NEAR_POCKET_OWN,
    SCORE_NEAR_POCKET_OPPONENT
} from '../config.js';

/**
 * Deterministic physics simulation for a pool shot.
 * Used for AI scoring (run to completion), trajectory preview (partial run),
 * and visual playback (stepped frame-by-frame with applyToMeshes).
 */
export class Simulation {
    /**
     * @param {CANNON.World} staticWorld - The static table world to clone from
     * @param {BABYLON.Mesh[]} ballMeshes - All ball meshes currently on table
     * @param {BABYLON.Mesh} whiteBall - The white ball mesh
     */
    constructor(staticWorld, ballMeshes, whiteBall) {
        this.world = createSimWorld(staticWorld);
        this.simBalls = populateSimWorld(this.world, ballMeshes, whiteBall);
        this.whiteBallSim = this.simBalls.find(b => b.isWhite);

        // Tracking state
        this.firstBallHitColor = null;
        this.firstBallHitBody = null;
        this.firstBallHitSpeed = 0;
        this.potted = { red: 0, blue: 0, black: 0, white: 0 };
        this.leftTable = { red: 0, blue: 0, black: 0, white: 0 };
        this.potHistory = [];
        this.currentStep = 0;
        this.complete = false;

        // Save initial positions for scoring proximity checks
        this.initialPositions = {};
        for (let i = 0; i < this.simBalls.length; i++) {
            const ball = this.simBalls[i];
            if (!ball.isWhite) {
                this.initialPositions[i] = {
                    x: ball.position.x,
                    z: ball.position.z,
                    color: ball.ballColor
                };
            }
        }
    }

    /**
     * Apply shot impulse to the white ball.
     * @param {Object} shot - { force: {x,y,z}, strikeOffset: {x,y} }
     */
    applyShot(shot) {
        if (!this.whiteBallSim) return;
        const impulse = new CANNON.Vec3(shot.force.x, shot.force.y, shot.force.z);
        const strikePoint = new CANNON.Vec3(
            this.whiteBallSim.position.x + shot.strikeOffset.x,
            this.whiteBallSim.position.y + shot.strikeOffset.y,
            this.whiteBallSim.position.z
        );
        this.whiteBallSim.applyImpulse(impulse, strikePoint);

        // Add natural forward roll to match linear velocity.
        // A cue-struck ball on cloth achieves rolling within centimeters;
        // without this, the sliding-to-rolling transition causes the velocity
        // angle to drift (ball curves) because lateral rolling is achieved
        // before forward rolling.
        const v = this.whiteBallSim.velocity;
        const av = this.whiteBallSim.angularVelocity;
        const R = BALL_RADIUS;
        av.x += v.z / R;
        av.z += -v.x / R;

        // Jump shot: directly set upward velocity from cue elevation.
        // Applying downward impulse into the table doesn't work well because
        // the contact solver absorbs most of it. Instead we bypass the
        // bounce and set v.y directly for graduated jump control.
        if (shot.jumpSpeed > 0) {
            v.y = shot.jumpSpeed;
        }
    }

    /**
     * Advance the simulation by one physics frame.
     * @returns {Array} Events for balls potted/lost this step: [{ mesh, color, type }]
     */
    step() {
        if (this.complete) return [];

        // Higher solver precision for first 100ms (6 steps at 60Hz) to handle
        // the initial impulse cleanly, then drop to default for performance
        this.world.solver.iterations = (this.currentStep < 6) ? 30 : 10;

        this.world.step(FIXED_TIMESTEP);

        // Check contacts for first ball hit by white
        if (this.firstBallHitColor === null) {
            for (const contact of this.world.contacts) {
                let otherBody = null;
                if (contact.bi === this.whiteBallSim && contact.bj.isBall && !contact.bj.isWhite) {
                    otherBody = contact.bj;
                } else if (contact.bj === this.whiteBallSim && contact.bi.isBall && !contact.bi.isWhite) {
                    otherBody = contact.bi;
                }
                if (otherBody) {
                    this.firstBallHitColor = otherBody.ballColor;
                    this.firstBallHitBody = otherBody;
                    const vel = otherBody.velocity;
                    this.firstBallHitSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
                    break;
                }
            }
        }

        const events = [];
        let allStopped = true;

        for (let i = this.simBalls.length - 1; i >= 0; i--) {
            const body = this.simBalls[i];

            // Check if ball landed on pocket platform (only way to pot)
            if (isBallOnPocketPlatform(body, this.world)) {
                this.potted[body.ballColor]++;
                this.potHistory.push({ step: this.currentStep, color: body.ballColor });
                events.push({ mesh: body.mesh, color: body.ballColor, type: 'potted' });
                this.world.removeBody(body);
                this.simBalls.splice(i, 1);
                continue;
            }

            // Ball fell off table — treat as foul, respawn later
            if (body.position.y < -6) {
                this.leftTable[body.ballColor]++;
                events.push({ mesh: body.mesh, color: body.ballColor, type: 'leftTable' });
                this.world.removeBody(body);
                this.simBalls.splice(i, 1);
                continue;
            }

            const vLen = applyBallFriction(body);
            if (!isBallStopped(body, vLen)) allStopped = false;
        }

        this.currentStep++;

        // Check for completion: all balls stopped or max steps reached
        if ((allStopped && this.currentStep > 30) || this.currentStep >= SIM_MAX_STEPS) {
            // Final check: balls on cushion tops count as left table
            for (let i = this.simBalls.length - 1; i >= 0; i--) {
                const body = this.simBalls[i];
                if (body.position.y > 2.0) {
                    this.leftTable[body.ballColor]++;
                    events.push({ mesh: body.mesh, color: body.ballColor, type: 'leftTable' });
                    this.world.removeBody(body);
                    this.simBalls.splice(i, 1);
                }
            }
            this.complete = true;
        }

        return events;
    }

    /**
     * Copy simulation body positions/rotations to their linked meshes.
     * Only updates balls still alive in the simulation.
     */
    applyToMeshes() {
        for (const body of this.simBalls) {
            const mesh = body.mesh;
            mesh.position.x = body.position.x;
            mesh.position.y = body.position.y;
            mesh.position.z = body.position.z;
            if (mesh.rotationQuaternion) {
                mesh.rotationQuaternion.x = body.quaternion.x;
                mesh.rotationQuaternion.y = body.quaternion.y;
                mesh.rotationQuaternion.z = body.quaternion.z;
                mesh.rotationQuaternion.w = body.quaternion.w;
            }
        }
    }

    /**
     * Check if the simulation has finished (all balls stopped or max steps reached).
     */
    isComplete() {
        return this.complete;
    }
}

/**
 * Run a complete shot simulation and return the scored result.
 * @param {Object} shot - Shot parameters { force: {x,y,z}, strikeOffset: {x,y} }
 * @param {Object} playerInfo - { color, canPotBlack, isBreakShot }
 * @param {CANNON.World} staticWorld - The static table world
 * @param {BABYLON.Mesh[]} ballMeshes - All ball meshes
 * @param {BABYLON.Mesh} whiteBall - The white ball mesh
 * @returns {Object} Simulation result with score, potted balls, etc.
 */
export function simulateShot(shot, playerInfo, staticWorld, ballMeshes, whiteBall) {
    const sim = new Simulation(staticWorld, ballMeshes, whiteBall);

    if (!sim.whiteBallSim) {
        return { score: -1000 };
    }

    sim.applyShot(shot);

    for (let step = 0; step < SIM_MAX_STEPS; step++) {
        sim.step();
        if (sim.isComplete()) break;
    }

    return scoreResult(sim, playerInfo);
}

/**
 * Run a lightweight trajectory simulation for shot indicator visualization.
 * Records white ball path and first-hit ball path.
 * @param {Object} shot - Shot parameters { force: {x,y,z}, strikeOffset: {x,y} }
 * @param {CANNON.World} staticWorld - The static table world
 * @param {BABYLON.Mesh[]} ballMeshes - All ball meshes
 * @param {BABYLON.Mesh} whiteBall - The white ball mesh
 * @returns {Object} { whitePath: [{x,y,z}...], targetPath: [{x,y,z}...], firstBallHitColor: string|null }
 */
export function simulateTrajectory(shot, staticWorld, ballMeshes, whiteBall) {
    const sim = new Simulation(staticWorld, ballMeshes, whiteBall);

    if (!sim.whiteBallSim) {
        return { whitePath: [], targetPath: [], firstBallHitColor: null, bounceData: [] };
    }

    sim.applyShot(shot);

    const whitePath = [];
    const targetPath = [];
    const bounceData = [];
    let hitBallBody = null;
    let whiteStopped = false;
    let whitePathLen = 0;
    const maxSteps = 300;
    const recordInterval = 2;
    const lastBounceStep = new Map();

    for (let step = 0; step < maxSteps; step++) {
        // Save pre-step velocities for bounce detection
        const preVelocities = new Map();
        if (sim.simBalls.includes(sim.whiteBallSim)) {
            const v = sim.whiteBallSim.velocity;
            preVelocities.set(sim.whiteBallSim, { x: v.x, y: v.y, z: v.z });
        }
        if (hitBallBody && sim.simBalls.includes(hitBallBody)) {
            const v = hitBallBody.velocity;
            preVelocities.set(hitBallBody, { x: v.x, y: v.y, z: v.z });
        }

        sim.step();

        // Detect cushion bounces
        for (const contact of sim.world.contacts) {
            let ballBody = null;
            let normal = null;
            if (contact.bi.isBall && !contact.bj.isBall && contact.bj.mass === 0) {
                ballBody = contact.bi;
                normal = { x: -contact.ni.x, y: -contact.ni.y, z: -contact.ni.z };
            } else if (contact.bj.isBall && !contact.bi.isBall && contact.bi.mass === 0) {
                ballBody = contact.bj;
                normal = { x: contact.ni.x, y: contact.ni.y, z: contact.ni.z };
            }
            if (!ballBody || !preVelocities.has(ballBody)) continue;
            const horizNorm = Math.sqrt(normal.x * normal.x + normal.z * normal.z);
            if (horizNorm < 0.5) continue;
            const prevStep = lastBounceStep.get(ballBody) || -10;
            if (step - prevStep < 5) continue;
            lastBounceStep.set(ballBody, step);
            const bPos = { x: ballBody.position.x, y: ballBody.position.y, z: ballBody.position.z };
            bounceData.push({
                point: bPos,
                incidentVel: preVelocities.get(ballBody),
                reflectedVel: { x: ballBody.velocity.x, y: ballBody.velocity.y, z: ballBody.velocity.z },
                normal: normal,
                step: step,
                isWhite: !!ballBody.isWhite
            });

            // Inject bounce point into trajectory path so the ribbon
            // doesn't interpolate through the cushion
            if (ballBody === sim.whiteBallSim && !whiteStopped) {
                if (whitePath.length > 0) {
                    const prev = whitePath[whitePath.length - 1];
                    whitePathLen += Math.sqrt((bPos.x - prev.x) ** 2 + (bPos.z - prev.z) ** 2);
                }
                whitePath.push(bPos);
            }
            if (ballBody === hitBallBody && sim.simBalls.includes(hitBallBody)) {
                targetPath.push({ x: hitBallBody.position.x, y: hitBallBody.position.y, z: hitBallBody.position.z });
            }
        }

        if (!hitBallBody && sim.firstBallHitBody !== null) {
            hitBallBody = sim.firstBallHitBody;
        }

        if (step % recordInterval === 0) {
            if (!whiteStopped && sim.simBalls.includes(sim.whiteBallSim)) {
                const wv = sim.whiteBallSim.velocity;
                const wSpeed = Math.sqrt(wv.x * wv.x + wv.y * wv.y + wv.z * wv.z);
                if (wSpeed < 0.05 && step > 10) {
                    whiteStopped = true;
                } else {
                    const pos = sim.whiteBallSim.position;
                    if (whitePath.length > 0) {
                        const prev = whitePath[whitePath.length - 1];
                        const dx = pos.x - prev.x;
                        const dz = pos.z - prev.z;
                        whitePathLen += Math.sqrt(dx * dx + dz * dz);
                    }
                    if (whitePathLen > TABLE_LENGTH) {
                        whiteStopped = true;
                    } else {
                        whitePath.push({ x: pos.x, y: pos.y, z: pos.z });
                    }
                }
            }
            if (hitBallBody && sim.simBalls.includes(hitBallBody)) {
                targetPath.push({ x: hitBallBody.position.x, y: hitBallBody.position.y, z: hitBallBody.position.z });
            }
        }
    }

    return { whitePath, targetPath, firstBallHitColor: sim.firstBallHitColor, bounceData };
}

/**
 * Run a trajectory simulation recording full per-step state for debug analysis.
 * Triggered by 'D' keypress — downloads as JSON.
 */
export function simulateTrajectoryDebug(shot, staticWorld, ballMeshes, whiteBall) {
    const sim = new Simulation(staticWorld, ballMeshes, whiteBall);
    if (!sim.whiteBallSim) return { shot, frames: [], bounceData: [] };

    sim.applyShot(shot);

    const frames = [];
    const bounceData = [];
    const lastBounceStep = new Map();
    const maxSteps = 300;

    for (let step = 0; step < maxSteps; step++) {
        const preVelocities = new Map();
        for (const ball of sim.simBalls) {
            preVelocities.set(ball, { x: ball.velocity.x, y: ball.velocity.y, z: ball.velocity.z });
        }

        sim.step();

        // Record full state for every ball
        const frame = { step, balls: [] };
        for (const ball of sim.simBalls) {
            frame.balls.push({
                color: ball.ballColor,
                isWhite: !!ball.isWhite,
                pos: { x: +ball.position.x.toFixed(4), y: +ball.position.y.toFixed(4), z: +ball.position.z.toFixed(4) },
                vel: { x: +ball.velocity.x.toFixed(4), y: +ball.velocity.y.toFixed(4), z: +ball.velocity.z.toFixed(4) },
                angVel: { x: +ball.angularVelocity.x.toFixed(4), y: +ball.angularVelocity.y.toFixed(4), z: +ball.angularVelocity.z.toFixed(4) },
                rot: { x: +ball.quaternion.x.toFixed(4), y: +ball.quaternion.y.toFixed(4), z: +ball.quaternion.z.toFixed(4), w: +ball.quaternion.w.toFixed(4) }
            });
        }
        frames.push(frame);

        // Detect cushion bounces
        for (const contact of sim.world.contacts) {
            let ballBody = null;
            let normal = null;
            if (contact.bi.isBall && !contact.bj.isBall && contact.bj.mass === 0) {
                ballBody = contact.bi;
                normal = { x: -contact.ni.x, y: -contact.ni.y, z: -contact.ni.z };
            } else if (contact.bj.isBall && !contact.bi.isBall && contact.bi.mass === 0) {
                ballBody = contact.bj;
                normal = { x: contact.ni.x, y: contact.ni.y, z: contact.ni.z };
            }
            if (!ballBody || !preVelocities.has(ballBody)) continue;
            const horizNorm = Math.sqrt(normal.x * normal.x + normal.z * normal.z);
            if (horizNorm < 0.5) continue;
            const prevStep = lastBounceStep.get(ballBody) || -10;
            if (step - prevStep < 5) continue;
            lastBounceStep.set(ballBody, step);

            const preVel = preVelocities.get(ballBody);
            const iLen = Math.sqrt(preVel.x * preVel.x + preVel.z * preVel.z);
            const rLen = Math.sqrt(ballBody.velocity.x * ballBody.velocity.x + ballBody.velocity.z * ballBody.velocity.z);
            const nLen = Math.sqrt(normal.x * normal.x + normal.z * normal.z);
            let incAngleDeg = 0, refAngleDeg = 0;
            if (iLen > 0.01 && rLen > 0.01 && nLen > 0.01) {
                const nx = normal.x / nLen, nz = normal.z / nLen;
                const dotI = (-preVel.x / iLen) * nx + (-preVel.z / iLen) * nz;
                const dotR = (ballBody.velocity.x / rLen) * nx + (ballBody.velocity.z / rLen) * nz;
                incAngleDeg = Math.acos(Math.min(1, Math.max(-1, dotI))) * 180 / Math.PI;
                refAngleDeg = Math.acos(Math.min(1, Math.max(-1, dotR))) * 180 / Math.PI;
            }

            bounceData.push({
                step,
                ballColor: ballBody.ballColor,
                isWhite: !!ballBody.isWhite,
                point: { x: +ballBody.position.x.toFixed(4), y: +ballBody.position.y.toFixed(4), z: +ballBody.position.z.toFixed(4) },
                normal: { x: +normal.x.toFixed(4), y: +normal.y.toFixed(4), z: +normal.z.toFixed(4) },
                incidentVel: { x: +preVel.x.toFixed(4), y: +preVel.y.toFixed(4), z: +preVel.z.toFixed(4) },
                reflectedVel: { x: +ballBody.velocity.x.toFixed(4), y: +ballBody.velocity.y.toFixed(4), z: +ballBody.velocity.z.toFixed(4) },
                incidentSpeed: +iLen.toFixed(4),
                reflectedSpeed: +rLen.toFixed(4),
                incAngleDeg: +incAngleDeg.toFixed(2),
                refAngleDeg: +refAngleDeg.toFixed(2),
                angleDiffDeg: +Math.abs(incAngleDeg - refAngleDeg).toFixed(2)
            });
        }

        // Stop early if all balls stopped
        let allStopped = true;
        for (const ball of sim.simBalls) {
            const v = ball.velocity;
            if (Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) > 0.05) {
                allStopped = false;
                break;
            }
        }
        if (allStopped && step > 30) break;
    }

    return { shot, frames, bounceData };
}

/**
 * Calculate score for a completed simulation.
 */
function scoreResult(sim, playerInfo) {
    const myColor = playerInfo ? playerInfo.color : null;
    const canPotBlack = playerInfo ? playerInfo.canPotBlack : false;
    const isBreakShot = playerInfo ? playerInfo.isBreakShot : false;
    const opponentColor = (myColor === "red") ? "blue" : (myColor === "blue") ? "red" : null;

    let score = 0;
    let isFoul = false;

    // Potting black early = instant loss
    if (sim.potted.black > 0 && !canPotBlack) {
        score = SCORE_BLACK_EARLY;
    } else {
        // Check for fouls
        const ballsLeftTable = sim.leftTable.red + sim.leftTable.blue + sim.leftTable.black + sim.leftTable.white;

        if (sim.potted.white > 0 || sim.leftTable.white > 0) {
            isFoul = true;
        } else if (ballsLeftTable > 0) {
            isFoul = true;
        } else if (sim.firstBallHitColor === null) {
            isFoul = true;
        } else if (myColor && sim.firstBallHitColor !== myColor) {
            if (!(sim.firstBallHitColor === "black" && canPotBlack)) {
                isFoul = true;
            }
        }

        if (isFoul) {
            score += SCORE_FOUL;
        }

        if (sim.firstBallHitColor === null) {
            score += SCORE_MISS;
        }

        // Valid pots
        if (myColor) {
            score += sim.potted[myColor] * SCORE_OWN_POT;
            score += sim.potted[opponentColor] * SCORE_OPPONENT_POT;
        } else {
            score += (sim.potted.red + sim.potted.blue) * SCORE_OWN_POT;
        }

        // Potting black when allowed
        if (sim.potted.black > 0 && canPotBlack) {
            score += SCORE_BLACK_POT;
        }

        // Break shot bonus
        if (isBreakShot && !isFoul && sim.firstBallHitColor !== null && sim.firstBallHitSpeed > 15) {
            score += SCORE_BREAK_BONUS;
        }

        // Check balls that moved near pockets
        for (const idx in sim.initialPositions) {
            const init = sim.initialPositions[idx];
            const ball = sim.simBalls.find(b =>
                b.ballColor === init.color &&
                !b.isWhite &&
                Math.abs(b.position.x - init.x) < 20 &&
                Math.abs(b.position.z - init.z) < 20
            );

            if (ball) {
                const wasNear = isNearPocket(init.x, init.z, 3.0);
                const nowNear = isNearPocket(ball.position.x, ball.position.z, 3.0);

                if (!wasNear && nowNear) {
                    if (myColor && ball.ballColor === myColor) {
                        score += SCORE_NEAR_POCKET_OWN;
                    } else if (myColor && ball.ballColor === opponentColor) {
                        score += SCORE_NEAR_POCKET_OPPONENT;
                    }
                }
            }
        }
    }

    return {
        score,
        potted: sim.potted,
        leftTable: sim.leftTable,
        firstBallHitColor: sim.firstBallHitColor,
        isFoul
    };
}
