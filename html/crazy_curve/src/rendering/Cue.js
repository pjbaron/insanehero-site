import { CUE_LENGTH, BALL_RADIUS, CUE_BUTT_RAISE } from '../config.js';

/**
 * Visual cue stick for human player aiming.
 */
export class Cue {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;

        this._createMesh();
    }

    _createMesh() {
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("cue", {
            height: CUE_LENGTH,
            diameterTop: 0.3,
            diameterBottom: 0.8,
            tessellation: 16
        }, this.scene);

        // Set pivot at the tip (thin end)
        // Cylinder is vertical by default, tip is at +Y (half height)
        this.mesh.setPivotPoint(new BABYLON.Vector3(0, CUE_LENGTH / 2, 0));

        const material = new BABYLON.StandardMaterial("cueMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);  // Brown wood color
        material.specularColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        this.mesh.material = material;
        this.mesh.isVisible = false;
    }

    /**
     * Show the cue stick.
     */
    show() {
        this.mesh.isVisible = true;
    }

    /**
     * Hide the cue stick.
     */
    hide() {
        this.mesh.isVisible = false;
    }

    /**
     * Update cue position to point from below the camera toward white ball.
     * @param {BABYLON.Vector3} whiteBallPos - Position of white ball
     * @param {BABYLON.Vector3} cameraPos - Position of camera
     * @param {number} cueOffset - How far back the cue is pulled (0 = tip near ball)
     * @param {Object} strikeOffset - {x, y} offset for spin (-0.5 to 0.5)
     * @param {number} elevationAngle - Cue elevation in radians (0 = flat, up to ~1.22 = 70 degrees)
     */
    updatePosition(whiteBallPos, cameraPos, cueOffset, strikeOffset = { x: 0, y: 0 }, elevationAngle = 0) {
        // Direction from camera to ball in XZ plane (the aim direction)
        const dx = whiteBallPos.x - cameraPos.x;
        const dz = whiteBallPos.z - cameraPos.z;
        const xzDist = Math.sqrt(dx * dx + dz * dz);
        const dirX = dx / xzDist;
        const dirZ = dz / xzDist;

        // Calculate strike point on ball surface
        // strikeOffset.x is left/right (perpendicular to aim), strikeOffset.y is up/down
        // Perpendicular direction in XZ plane (right vector)
        const perpX = dirZ;
        const perpZ = -dirX;

        // Strike point relative to ball center
        const strikeX = whiteBallPos.x + perpX * strikeOffset.x * BALL_RADIUS * 2;
        const strikeY = whiteBallPos.y - strikeOffset.y * BALL_RADIUS * 2;
        const strikeZ = whiteBallPos.z + perpZ * strikeOffset.x * BALL_RADIUS * 2;

        // Cue tilt angle from horizontal: base tilt + player elevation
        const baseTilt = Math.atan2(CUE_BUTT_RAISE, Math.sqrt(CUE_LENGTH * CUE_LENGTH - CUE_BUTT_RAISE * CUE_BUTT_RAISE));
        const totalTilt = baseTilt + elevationAngle;

        // Derive butt raise and horizontal length from the total tilt
        const horizLength = Math.cos(totalTilt) * CUE_LENGTH;
        const buttRaise = Math.sin(totalTilt) * CUE_LENGTH;

        // Cue direction unit vector (from butt to tip)
        // Tip is forward (toward ball) and down relative to butt
        const cueDirX = dirX * Math.cos(totalTilt);
        const cueDirY = -Math.sin(totalTilt);
        const cueDirZ = dirZ * Math.cos(totalTilt);

        // Tip position: start at strike point, move back along cue axis
        // Pullback distance includes ball radius so tip doesn't penetrate ball
        const pullback = Math.max(BALL_RADIUS, BALL_RADIUS + cueOffset);
        const tipX = strikeX - cueDirX * pullback;
        const tipY = strikeY - cueDirY * pullback;
        const tipZ = strikeZ - cueDirZ * pullback;

        // Set cue position (pivot is at tip)
        this.mesh.position = new BABYLON.Vector3(tipX, tipY, tipZ);

        // Calculate rotation using Euler angles
        // Yaw: rotate around Y to face the aim direction
        const yaw = Math.atan2(dirX, dirZ);
        // Pitch: tilt from vertical past horizontal
        const pitch = Math.PI / 2 + totalTilt;

        this.mesh.rotation = new BABYLON.Vector3(pitch, yaw, 0);
    }
}
