import { Simulation } from './physics/Simulation.js';
import {
    WHITE_BALL_SPAWN_X,
    WHITE_BALL_SPAWN_Y,
    WHITE_BALL_SPAWN_Z,
    BALL_RADIUS,
    TRIANGLE_APEX_Z
} from './config.js';

/**
 * Core game state management - tracks players, turns, colors, and win conditions.
 */
export class Game {
    constructor(physicsWorld, frictionList, whiteBall) {
        this.physicsWorld = physicsWorld;
        this.frictionList = frictionList;
        this.whiteBall = whiteBall;

        // Game state
        this.currentPlayer = 1;
        this.playerColors = { 1: null, 2: null };
        this.gameOver = false;
        this.gameWinner = null;

        // Players
        this.playerTypes = { 1: 'human', 2: 'ai' };
        this.players = { 1: null, 2: null };

        // Current shot tracking
        this.currentShot = null;

        // Active simulation for visual playback
        this.activeSim = null;
        this.gameReady = false;

        // Pause state for testing
        this.autoPaused = false;

        // Camera reference for positioning
        this.camera = null;
        this.cameraTarget = null;  // { radius, beta, alpha, target } - lerp toward this
        this.cameraLerpProgress = 0;
    }

    /**
     * Set the player instances.
     */
    setPlayers(player1, player2) {
        this.players[1] = player1;
        this.players[2] = player2;
    }

    /**
     * Set player types.
     */
    setPlayerTypes(type1, type2) {
        this.playerTypes[1] = type1;
        this.playerTypes[2] = type2;
    }

    /**
     * Mark game as ready to start.
     */
    setReady() {
        this.gameReady = true;
    }

    /**
     * Get current player info for AI/simulation scoring.
     */
    getPlayerInfo() {
        const myColor = this.playerColors[this.currentPlayer];
        const remaining = this.countBallsByColor();
        const canPotBlack = myColor && remaining[myColor] === 0;
        const isBreakShot = !myColor;

        return {
            color: myColor,
            canPotBlack,
            isBreakShot
        };
    }

    /**
     * Count remaining balls of each color on the table.
     */
    countBallsByColor() {
        const counts = { red: 0, blue: 0, black: 0 };
        for (const ball of this.frictionList) {
            if (ball !== this.whiteBall && ball.ballColor) {
                counts[ball.ballColor]++;
            }
        }
        return counts;
    }

    /**
     * Find a free position to re-spot a ball, starting at the foot spot
     * and searching along the center line toward the top cushion.
     */
    _findRespotPosition() {
        const minGap = BALL_RADIUS * 2.1;
        const candidates = [];
        // Foot spot first, then step toward top of table
        for (let z = TRIANGLE_APEX_Z; z < 30; z += BALL_RADIUS * 2.2) {
            candidates.push({ x: 0, z });
        }
        for (const pos of candidates) {
            let blocked = false;
            for (const ball of this.frictionList) {
                const dx = ball.position.x - pos.x;
                const dz = ball.position.z - pos.z;
                if (dx * dx + dz * dz < minGap * minGap) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) return pos;
        }
        // Fallback: foot spot regardless
        return { x: 0, z: TRIANGLE_APEX_Z };
    }

    /**
     * Check if all balls have stopped moving.
     */
    allBallsStopped() {
        return !this.activeSim;
    }

    /**
     * Set camera to smoothly move to a new position.
     */
    setCameraTarget(radius, beta, target) {
        this.cameraTarget = { radius, beta, target };
        this.cameraLerpProgress = 0;
    }

    /**
     * Execute a shot with visual playback via deterministic simulation.
     */
    executeShot(shot, playerInfo) {
        this.currentShot = {
            ...shot,
            playerInfo
        };

        this.activeSim = new Simulation(this.physicsWorld, this.frictionList, this.whiteBall);
        this.activeSim.applyShot(shot);
    }

    /**
     * Process end of turn - check fouls, assign colors, switch turns.
     */
    _processTurnEnd() {
        if (!this.currentShot || this.gameOver) return;

        const result = this.currentShot.result;
        const potted = result.potted;
        const myColor = this.playerColors[this.currentPlayer];
        const opponentColor = (myColor === "red") ? "blue" : (myColor === "blue") ? "red" : null;
        const opponent = (this.currentPlayer === 1) ? 2 : 1;

        // Check for potting black early (instant loss)
        if (potted.black > 0 && !this.currentShot.playerInfo.canPotBlack) {
            this.gameOver = true;
            this.gameWinner = opponent;
            console.log("GAME OVER: Player " + this.currentPlayer + " potted black early! Player " + opponent + " wins!");
            return;
        }

        // Check for winning by potting black when allowed
        if (potted.black > 0 && this.currentShot.playerInfo.canPotBlack) {
            const whiteFoul = potted.white > 0 || result.leftTable.white > 0;
            if (!whiteFoul) {
                this.gameOver = true;
                this.gameWinner = this.currentPlayer;
                console.log("GAME OVER: Player " + this.currentPlayer + " wins!");
                return;
            } else {
                this.gameOver = true;
                this.gameWinner = opponent;
                console.log("GAME OVER: Player " + this.currentPlayer + " potted black but scratched! Player " + opponent + " wins!");
                return;
            }
        }

        // Assign colors on first pot
        if (!myColor && (potted.red > 0 || potted.blue > 0)) {
            if (potted.red > 0 && potted.blue === 0) {
                this.playerColors[this.currentPlayer] = "red";
                this.playerColors[opponent] = "blue";
                console.log("Player " + this.currentPlayer + " is RED, Player " + opponent + " is BLUE");
            } else if (potted.blue > 0 && potted.red === 0) {
                this.playerColors[this.currentPlayer] = "blue";
                this.playerColors[opponent] = "red";
                console.log("Player " + this.currentPlayer + " is BLUE, Player " + opponent + " is RED");
            } else {
                // Potted both colors on break - assign based on remaining
                const remaining = this.countBallsByColor();
                if (remaining.red >= remaining.blue) {
                    this.playerColors[this.currentPlayer] = "red";
                    this.playerColors[opponent] = "blue";
                } else {
                    this.playerColors[this.currentPlayer] = "blue";
                    this.playerColors[opponent] = "red";
                }
                console.log("Player " + this.currentPlayer + " is " + this.playerColors[this.currentPlayer].toUpperCase() +
                    ", Player " + opponent + " is " + this.playerColors[opponent].toUpperCase());
            }
        }

        // Determine if turn should switch
        const colorAtStart = this.currentShot.playerInfo.color;
        const opponentColorAtStart = (colorAtStart === "red") ? "blue" : (colorAtStart === "blue") ? "red" : null;
        let switchTurn = false;
        let reason = "";

        // Foul: potted white or white left table
        if (potted.white > 0 || result.leftTable.white > 0) {
            switchTurn = true;
            reason = "white ball foul";
        }
        // Foul: missed all balls
        else if (result.firstBallHitColor === null) {
            switchTurn = true;
            reason = "missed";
        }
        // Foul: hit wrong ball first (only if colors were assigned before turn)
        else if (colorAtStart && result.firstBallHitColor !== colorAtStart) {
            const goingForBlack = result.firstBallHitColor === "black" && this.currentShot.playerInfo.canPotBlack;
            if (!goingForBlack) {
                switchTurn = true;
                reason = "hit " + result.firstBallHitColor + " first";
            }
        }

        // Foul: potted opponent's ball (and didn't pot own)
        if (!switchTurn && colorAtStart && potted[opponentColorAtStart] > 0 && potted[colorAtStart] === 0) {
            switchTurn = true;
            reason = "potted opponent's ball";
        }

        // No pot = switch turn (check separately, not in else-if chain)
        if (!switchTurn && potted.red === 0 && potted.blue === 0 && potted.black === 0) {
            switchTurn = true;
            reason = "no pot";
        }

        if (switchTurn) {
            this.currentPlayer = opponent;
            console.log("Turn -> Player " + this.currentPlayer + " (" + reason + ")");
        }

        this.currentShot = null;
    }

    /**
     * Main update loop - called each frame.
     */
    update(humanPlayer, aiPlayer, camera, cue) {
        // Store camera reference
        this.camera = camera;

        // Smoothly lerp camera toward target with ease-in
        if (this.cameraTarget) {
            this.cameraLerpProgress += 0.01;
            // Ease-in: t starts slow and speeds up (quadratic)
            const eased = this.cameraLerpProgress * this.cameraLerpProgress;
            const t = Math.min(eased * 0.03, 0.04);

            camera.radius += (this.cameraTarget.radius - camera.radius) * t;
            camera.beta += (this.cameraTarget.beta - camera.beta) * t;
            camera.target.x += (this.cameraTarget.target.x - camera.target.x) * t;
            camera.target.y += (this.cameraTarget.target.y - camera.target.y) * t;
            camera.target.z += (this.cameraTarget.target.z - camera.target.z) * t;

            // Clear target when close enough
            const radiusDiff = Math.abs(this.cameraTarget.radius - camera.radius);
            const betaDiff = Math.abs(this.cameraTarget.beta - camera.beta);
            if (radiusDiff < 0.1 && betaDiff < 0.01) {
                this.cameraTarget = null;
            }
        }

        // Step simulation playback if active
        if (this.activeSim) {
            const events = this.activeSim.step();

            // Handle pot events before updating visuals
            for (const evt of events) {
                if (evt.mesh === this.whiteBall) {
                    // Respawn white ball at spawn position
                    evt.mesh.position.x = WHITE_BALL_SPAWN_X;
                    evt.mesh.position.y = WHITE_BALL_SPAWN_Y;
                    evt.mesh.position.z = WHITE_BALL_SPAWN_Z;
                } else if (evt.type === 'potted') {
                    // Remove potted ball from game
                    evt.mesh.dispose();
                    const fi = this.frictionList.indexOf(evt.mesh);
                    if (fi >= 0) this.frictionList.splice(fi, 1);
                } else if (evt.type === 'leftTable') {
                    // Re-spot ball that left the table (foul)
                    const spot = this._findRespotPosition();
                    evt.mesh.position.x = spot.x;
                    evt.mesh.position.y = BALL_RADIUS;
                    evt.mesh.position.z = spot.z;
                }
            }

            // Copy simulation positions to meshes
            this.activeSim.applyToMeshes();

            if (this.activeSim.isComplete()) {
                this.activeSim = null;
                this._processTurnEnd();
            }
            return;
        }

        // Don't start new turns until ready
        if (!this.gameReady || !this.whiteBall || this.autoPaused || this.gameOver) {
            return;
        }

        // Check if we should start a new turn
        if (!this.allBallsStopped()) {
            return;
        }

        const playerType = this.playerTypes[this.currentPlayer];

        if (playerType === 'human') {
            if (!humanPlayer.isActive()) {
                humanPlayer.takeTurn(this, camera, cue, (shot) => {
                    const playerInfo = this.getPlayerInfo();
                    this.executeShot(shot, playerInfo);
                });
            }
        } else {
            // AI player
            if (!aiPlayer.isSimulating()) {
                aiPlayer.takeTurn(this, (shot) => {
                    const playerInfo = this.getPlayerInfo();
                    this.executeShot(shot, playerInfo);
                });
            }
        }
    }
}
