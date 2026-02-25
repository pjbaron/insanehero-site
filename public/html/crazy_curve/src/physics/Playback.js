import { createSimWorld, applyBallFriction, isBallStopped } from './PhysicsWorld.js';
import {
    FIXED_TIMESTEP,
    BALL_RADIUS,
    WHITE_BALL_SPAWN_X,
    WHITE_BALL_SPAWN_Y,
    WHITE_BALL_SPAWN_Z
} from '../config.js';

/**
 * Manages visual playback of shots by running physics simulation
 * and copying positions to meshes.
 */
export class Playback {
    constructor() {
        this.active = false;
        this.world = null;
        this.balls = null;  // Array of { simBody, mesh }
        this.whiteBall = null;
        this.frictionList = null;  // Reference to track removed balls
        this.onComplete = null;
        this.pottedEvents = null;  // Events from simulation
        this.currentStep = 0;
    }

    /**
     * Start playback of a shot.
     * @param {Object} shot - Shot parameters { force: {x,y,z}, strikeOffset: {x,y} }
     * @param {CANNON.World} realPhysicsWorld - The real physics world to clone
     * @param {BABYLON.Mesh[]} frictionList - All ball meshes (will be modified on pot)
     * @param {BABYLON.Mesh} whiteBall - The white ball mesh
     * @param {Function} onComplete - Called when playback finishes
     */
    start(shot, realPhysicsWorld, frictionList, whiteBall, onComplete) {
        this.world = createSimWorld(realPhysicsWorld);
        this.whiteBall = whiteBall;
        this.frictionList = frictionList;
        this.onComplete = onComplete;
        this.pottedEvents = shot.result ? shot.result.pottedEvents : [];
        this.currentStep = 0;

        // Create simulation balls linked to meshes
        this.balls = [];
        for (const mesh of frictionList) {
            const simBody = new CANNON.Body({
                mass: 1.0,
                angularDamping: 0.04,
                material: this.world.ballMaterial
            });

            simBody.addShape(new CANNON.Sphere(BALL_RADIUS));

            // Copy current position/rotation from mesh
            const pos = mesh.getAbsolutePosition();
            simBody.position.set(pos.x, pos.y, pos.z);
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

            this.world.addBody(simBody);
            this.balls.push({ simBody, mesh });
        }

        // Find white ball and apply shot
        const whitePlayback = this.balls.find(pb => pb.mesh === whiteBall);
        if (whitePlayback) {
            const impulse = new CANNON.Vec3(shot.force.x, shot.force.y, shot.force.z);
            const strikePoint = new CANNON.Vec3(
                whitePlayback.simBody.position.x + shot.strikeOffset.x,
                whitePlayback.simBody.position.y + shot.strikeOffset.y,
                whitePlayback.simBody.position.z
            );
            whitePlayback.simBody.applyImpulse(impulse, strikePoint);
        }

        this.active = true;
    }

    /**
     * Step the playback simulation one frame.
     * Call this from the render loop.
     * @returns {boolean} True if playback is still active
     */
    step() {
        if (!this.active || !this.world || !this.balls) {
            return false;
        }

        // Step physics
        this.world.step(FIXED_TIMESTEP);

        // Process any potted events for this step
        for (const event of this.pottedEvents) {
            if (event.step === this.currentStep) {
                const pb = this.balls.find(b => b.mesh === event.mesh);
                if (pb) {
                    if (event.mesh === this.whiteBall) {
                        // Respawn white ball
                        pb.simBody.position.set(WHITE_BALL_SPAWN_X, WHITE_BALL_SPAWN_Y, WHITE_BALL_SPAWN_Z);
                        pb.simBody.velocity.set(0, 0, 0);
                        pb.simBody.angularVelocity.set(0, 0, 0);
                        event.mesh.position.x = WHITE_BALL_SPAWN_X;
                        event.mesh.position.y = WHITE_BALL_SPAWN_Y;
                        event.mesh.position.z = WHITE_BALL_SPAWN_Z;
                    } else {
                        // Remove ball
                        this.world.removeBody(pb.simBody);
                        event.mesh.dispose();
                        const fi = this.frictionList.indexOf(event.mesh);
                        if (fi >= 0) {
                            this.frictionList.splice(fi, 1);
                        }
                        const bi = this.balls.indexOf(pb);
                        if (bi >= 0) {
                            this.balls.splice(bi, 1);
                        }
                    }
                }
            }
        }

        // Apply friction and update meshes
        let allStopped = true;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            const pb = this.balls[i];
            const body = pb.simBody;
            const mesh = pb.mesh;

            // Copy position/rotation to mesh
            mesh.position.x = body.position.x;
            mesh.position.y = body.position.y;
            mesh.position.z = body.position.z;

            if (mesh.rotationQuaternion) {
                mesh.rotationQuaternion.x = body.quaternion.x;
                mesh.rotationQuaternion.y = body.quaternion.y;
                mesh.rotationQuaternion.z = body.quaternion.z;
                mesh.rotationQuaternion.w = body.quaternion.w;
            }

            // Apply friction
            const vLen = applyBallFriction(body);
            if (!isBallStopped(body, vLen)) allStopped = false;
        }

        this.currentStep++;

        // Check if playback is done
        if (allStopped) {
            this.active = false;
            this.world = null;
            this.balls = null;

            if (this.onComplete) {
                this.onComplete();
            }
        }

        return this.active;
    }

    /**
     * Check if playback is currently active.
     */
    isActive() {
        return this.active;
    }
}
