import {
    BALL_RADIUS,
    BALL_DIAMETER,
    TRIANGLE_APEX_Z,
    TRIANGLE_TEXTURES,
    BALL_COLORS,
    WHITE_BALL_SPAWN_X,
    WHITE_BALL_SPAWN_Y,
    WHITE_BALL_SPAWN_Z
} from '../config.js';

/**
 * Manage ball creation and tracking.
 */
export class Balls {
    constructor(scene) {
        this.scene = scene;
        this.balls = [];
        this.whiteBall = null;

        this._createTriangle();
        this._createWhiteBall();
    }

    _createTriangle() {
        const gap = 0.001;
        const spacing = BALL_DIAMETER + gap;
        const xoff = spacing * Math.cos(60 * Math.PI / 180);
        const yoff = spacing * Math.sin(60 * Math.PI / 180);

        // Triangle layout positions
        const triangle = [
            { x: 0, y: TRIANGLE_APEX_Z },
            { x: -xoff, y: TRIANGLE_APEX_Z + yoff * 1 }, { x: xoff, y: TRIANGLE_APEX_Z + yoff * 1 },
            { x: -spacing, y: TRIANGLE_APEX_Z + yoff * 2 }, { x: 0, y: TRIANGLE_APEX_Z + yoff * 2 }, { x: spacing, y: TRIANGLE_APEX_Z + yoff * 2 },
            { x: -xoff - spacing, y: TRIANGLE_APEX_Z + yoff * 3 }, { x: -xoff, y: TRIANGLE_APEX_Z + yoff * 3 }, { x: xoff, y: TRIANGLE_APEX_Z + yoff * 3 }, { x: xoff + spacing, y: TRIANGLE_APEX_Z + yoff * 3 },
            { x: -spacing * 2, y: TRIANGLE_APEX_Z + yoff * 4 }, { x: -spacing, y: TRIANGLE_APEX_Z + yoff * 4 }, { x: 0, y: TRIANGLE_APEX_Z + yoff * 4 }, { x: spacing, y: TRIANGLE_APEX_Z + yoff * 4 }, { x: spacing * 2, y: TRIANGLE_APEX_Z + yoff * 4 }
        ];

        const jitter = gap * 0.5;
        for (let i = 0; i < triangle.length; i++) {
            const ball = BABYLON.Mesh.CreateSphere('ball' + i, 16, BALL_DIAMETER, this.scene);
            ball.position.x = triangle[i].x + (Math.random() - 0.5) * jitter;
            ball.position.y = 1;
            ball.position.z = triangle[i].y + (Math.random() - 0.5) * jitter;
            ball.rotationQuaternion = new BABYLON.Quaternion(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();

            ball.material = new BABYLON.StandardMaterial("ball" + i, this.scene);
            ball.material.specularColor = new BABYLON.Color3(1, 1, 1);
            ball.material.diffuseTexture = new BABYLON.Texture("textures/" + TRIANGLE_TEXTURES[i] + ".png", this.scene);

            // Tag ball with color type
            ball.ballColor = BALL_COLORS[TRIANGLE_TEXTURES[i]] || "unknown";

            this.balls.push(ball);
        }
    }

    _createWhiteBall() {
        this.whiteBall = BABYLON.Mesh.CreateSphere('whiteBall', 16, BALL_DIAMETER, this.scene);
        this.whiteBall.material = new BABYLON.StandardMaterial("whiteBall", this.scene);
        this.whiteBall.material.diffuseTexture = new BABYLON.Texture("textures/ball_dots.png", this.scene);
        this.whiteBall.material.specularColor = new BABYLON.Color3(1, 1, 1);
        this.whiteBall.rotationQuaternion = new BABYLON.Quaternion();
        this.whiteBall.ballColor = "white";

        this.spotWhiteBall();
    }

    /**
     * Place white ball at spawn position.
     */
    spotWhiteBall() {
        this.whiteBall.position.x = WHITE_BALL_SPAWN_X;
        this.whiteBall.position.y = WHITE_BALL_SPAWN_Y;
        this.whiteBall.position.z = WHITE_BALL_SPAWN_Z;

        if (this.whiteBall.rotationQuaternion) {
            const q = new BABYLON.Quaternion(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            this.whiteBall.rotationQuaternion.copyFrom(q);
        }
    }

    /**
     * Get all balls (triangle + white).
     */
    getAllBalls() {
        return [...this.balls, this.whiteBall];
    }

    /**
     * Get just the triangle balls.
     */
    getTriangleBalls() {
        return this.balls;
    }

    /**
     * Get the white ball.
     */
    getWhiteBall() {
        return this.whiteBall;
    }

    /**
     * Remove a ball from tracking (when potted).
     */
    removeBall(ball) {
        const idx = this.balls.indexOf(ball);
        if (idx >= 0) {
            this.balls.splice(idx, 1);
        }
    }
}
