import { BALL_RADIUS } from '../config.js';

/**
 * Renders trajectory ribbons for shot aiming visualization.
 * Uses ribbon meshes for visible width instead of 1px lines.
 */
export class ShotIndicator {
    constructor(scene) {
        this.scene = scene;
        this.whiteLine = null;
        this.targetLine = null;
        this.debugLines = [];
        this.lineWidth = BALL_RADIUS;

        // Reusable materials
        this.whiteMat = new BABYLON.StandardMaterial("shotWhiteMat", scene);
        this.whiteMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        this.whiteMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.whiteMat.backFaceCulling = false;

        // Light grey for valid target paths
        this.targetMat = new BABYLON.StandardMaterial("shotTargetMat", scene);
        this.targetMat.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75);
        this.targetMat.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        this.targetMat.backFaceCulling = false;

        // Red for opponent ball warning
        this.foulMat = new BABYLON.StandardMaterial("shotFoulMat", scene);
        this.foulMat.diffuseColor = new BABYLON.Color3(1, 0.15, 0.15);
        this.foulMat.emissiveColor = new BABYLON.Color3(0.6, 0.05, 0.05);
        this.foulMat.backFaceCulling = false;
    }

    /**
     * Update trajectory lines from simulation path data.
     * @param {Array} whitePath - White ball trajectory points {x, y, z}
     * @param {Array} targetPath - Target ball trajectory points {x, y, z}
     * @param {string|null} firstBallHitColor - Color of first ball hit
     * @param {string|null} playerColor - Current player's assigned color (null = open table)
     * @param {boolean} canPotBlack - Whether the player is allowed to pot the black
     * @param {Array} bounceData - Cushion bounce data for debug visualization
     */
    update(whitePath, targetPath, firstBallHitColor, playerColor, canPotBlack, bounceData) {
        this._dispose();

        if (whitePath.length >= 2) {
            const points = whitePath.map(p => new BABYLON.Vector3(p.x, p.y, p.z));
            this.whiteLine = this._buildRibbon("shotWhite", points, this.lineWidth, this.whiteMat);
        }

        if (firstBallHitColor && targetPath.length >= 1) {
            // Valid target: own color, open table, or black when allowed
            const isValid = !playerColor
                || firstBallHitColor === playerColor
                || (firstBallHitColor === 'black' && canPotBlack);

            if (isValid && targetPath.length >= 2) {
                const points = targetPath.map(p => new BABYLON.Vector3(p.x, p.y, p.z));
                this.targetLine = this._buildRibbon("shotTarget", points, this.lineWidth, this.targetMat);
            } else if (!isValid) {
                // Opponent ball: show red warning circle at hit point
                const hp = targetPath[0];
                this.targetLine = BABYLON.MeshBuilder.CreateDisc("shotFoul", {
                    radius: BALL_RADIUS * 1.5,
                    tessellation: 24
                }, this.scene);
                this.targetLine.position = new BABYLON.Vector3(hp.x, hp.y, hp.z);
                this.targetLine.rotation.x = Math.PI / 2;
                this.targetLine.material = this.foulMat;
                this.targetLine.isPickable = false;
            }
        }

        // Draw bounce angle debug lines
        if (bounceData && bounceData.length > 0) {
            this._drawBounceDebug(bounceData);
        }
    }

    _drawBounceDebug(bounceData) {
        const lineLen = 4;
        const normalLen = 2;

        for (const bounce of bounceData) {
            const by = bounce.point.y + 0.05;
            const p = new BABYLON.Vector3(bounce.point.x, by, bounce.point.z);

            // Normalize incident direction (horizontal)
            const iv = bounce.incidentVel;
            const iLen = Math.sqrt(iv.x * iv.x + iv.z * iv.z);
            if (iLen < 0.01) continue;
            const idx = iv.x / iLen, idz = iv.z / iLen;

            // Normalize reflected direction (horizontal)
            const rv = bounce.reflectedVel;
            const rLen = Math.sqrt(rv.x * rv.x + rv.z * rv.z);
            if (rLen < 0.01) continue;
            const rdx = rv.x / rLen, rdz = rv.z / rLen;

            // Normalize cushion normal (horizontal)
            const n = bounce.normal;
            const nLen = Math.sqrt(n.x * n.x + n.z * n.z);
            if (nLen < 0.01) continue;
            const nx = n.x / nLen, nz = n.z / nLen;

            // Incident line: backward from bounce point (yellow)
            const incEnd = new BABYLON.Vector3(p.x - idx * lineLen, by, p.z - idz * lineLen);
            const yellow = new BABYLON.Color4(1, 1, 0, 1);
            const incLine = BABYLON.MeshBuilder.CreateLines("dbgInc", {
                points: [incEnd, p],
                colors: [yellow, yellow]
            }, this.scene);
            incLine.isPickable = false;
            this.debugLines.push(incLine);

            // Reflected line: forward from bounce point (cyan)
            const refEnd = new BABYLON.Vector3(p.x + rdx * lineLen, by, p.z + rdz * lineLen);
            const cyan = new BABYLON.Color4(0, 1, 1, 1);
            const refLine = BABYLON.MeshBuilder.CreateLines("dbgRef", {
                points: [p, refEnd],
                colors: [cyan, cyan]
            }, this.scene);
            refLine.isPickable = false;
            this.debugLines.push(refLine);

            // Cushion normal: from bounce point (magenta)
            const nrmEnd = new BABYLON.Vector3(p.x + nx * normalLen, by, p.z + nz * normalLen);
            const magenta = new BABYLON.Color4(1, 0, 1, 1);
            const nrmLine = BABYLON.MeshBuilder.CreateLines("dbgNrm", {
                points: [p, nrmEnd],
                colors: [magenta, magenta]
            }, this.scene);
            nrmLine.isPickable = false;
            this.debugLines.push(nrmLine);
        }
    }

    /**
     * Build a continuous ribbon from a path with horizontal width.
     */
    _buildRibbon(name, points, width, material) {
        const leftPath = [];
        const rightPath = [];

        for (let j = 0; j < points.length; j++) {
            const p = points[j];
            let dir;
            if (j < points.length - 1) {
                dir = points[j + 1].subtract(p);
            } else {
                dir = p.subtract(points[j - 1]);
            }
            dir.y = 0;
            if (dir.lengthSquared() < 0.0001) continue;
            dir.normalize();

            const perp = new BABYLON.Vector3(-dir.z, 0, dir.x).scale(width / 2);
            leftPath.push(p.add(perp));
            rightPath.push(p.subtract(perp));
        }

        if (leftPath.length < 2) return null;

        const ribbon = BABYLON.MeshBuilder.CreateRibbon(name, {
            pathArray: [leftPath, rightPath],
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        ribbon.material = material;
        ribbon.isPickable = false;
        return ribbon;
    }

    hide() {
        this._dispose();
    }

    _dispose() {
        if (this.whiteLine) {
            this.whiteLine.dispose();
            this.whiteLine = null;
        }
        if (this.targetLine) {
            this.targetLine.dispose();
            this.targetLine = null;
        }
        for (const line of this.debugLines) {
            line.dispose();
        }
        this.debugLines = [];
    }
}
