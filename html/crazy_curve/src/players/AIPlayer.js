import { simulateShot } from '../physics/Simulation.js';
import { SIM_SHOT_COUNT, SIM_BATCH_SIZE } from '../config.js';

/**
 * AI player that finds the best shot through simulation.
 */
export class AIPlayer {
    constructor() {
        this.simulatingShots = false;
    }

    /**
     * Take a turn by finding and executing the best shot.
     * @param {Object} game - The game instance
     * @param {Function} onComplete - Called with the best shot when found
     */
    takeTurn(game, onComplete) {
        if (this.simulatingShots) return;

        const playerInfo = game.getPlayerInfo();
        this.simulatingShots = true;
        const simStartTime = performance.now();

        this._findBestShotAsync(
            SIM_SHOT_COUNT,
            SIM_BATCH_SIZE,
            playerInfo,
            game,
            (bestShot) => {
                this.simulatingShots = false;
                const thinkTime = Math.round(performance.now() - simStartTime);

                if (!bestShot) {
                    // Fallback to random shot
                    bestShot = {
                        force: { x: Math.random() * 10 - 5, y: 0, z: Math.random() * 20 + 30 },
                        strikeOffset: { x: 0, y: 0 },
                        result: {
                            potted: { red: 0, blue: 0, black: 0, white: 0 },
                            leftTable: { red: 0, blue: 0, black: 0, white: 0 },
                            firstBallHitColor: null,
                            isFoul: true
                        }
                    };
                }

                // Refinement: if best shot has no pot, try variations
                const totalPotted = bestShot.result.potted.red + bestShot.result.potted.blue + bestShot.result.potted.black;
                if (totalPotted === 0 && bestShot.result.score > -100 && bestShot.result.score < 200) {
                    const variations = [
                        // Harder shot (20% more power)
                        {
                            force: { x: bestShot.force.x * 1.2, y: bestShot.force.y, z: bestShot.force.z * 1.2 },
                            strikeOffset: bestShot.strikeOffset
                        },
                        // Backspin
                        {
                            force: bestShot.force,
                            strikeOffset: { x: bestShot.strikeOffset.x, y: -0.4 }
                        },
                        // Slight angle change
                        {
                            force: { x: bestShot.force.x + (Math.random() - 0.5) * 3, y: bestShot.force.y, z: bestShot.force.z + (Math.random() - 0.5) * 3 },
                            strikeOffset: bestShot.strikeOffset
                        }
                    ];

                    for (const variation of variations) {
                        const result = simulateShot(
                            variation,
                            playerInfo,
                            game.physicsWorld,
                            game.frictionList,
                            game.whiteBall
                        );
                        if (result.score > bestShot.result.score) {
                            bestShot = variation;
                            bestShot.result = result;
                        }
                    }
                }

                // Log shot prediction
                const p = bestShot.result.potted;
                let msg = "P" + game.currentPlayer;
                if (playerInfo.color) msg += "(" + playerInfo.color + ")";
                msg += ": " + p.red + "," + p.blue + "," + p.black + "," + p.white;
                if (!bestShot.result.firstBallHitColor) msg += " missed";
                msg += " [" + bestShot.result.score + "] " + thinkTime + "ms";
                console.log(msg);

                onComplete(bestShot);
            }
        );
    }

    /**
     * Generate a random shot for simulation.
     */
    _generateRandomShot(whiteBall, frictionList) {
        const whitePos = whiteBall.getAbsolutePosition();

        // Pick a random target ball
        const targetBalls = frictionList.filter(b => b !== whiteBall);
        if (targetBalls.length === 0) return null;

        const target = targetBalls[Math.floor(Math.random() * targetBalls.length)];
        const targetPos = target.getAbsolutePosition();

        // Base direction towards target with some random variation
        const dx = targetPos.x - whitePos.x + (Math.random() - 0.5) * 4;
        const dz = targetPos.z - whitePos.z + (Math.random() - 0.5) * 4;
        const len = Math.sqrt(dx * dx + dz * dz);

        // Random power between 15 and 50
        const power = Math.random() * 35 + 15;

        // Strike offset for spin (-0.5 to 0.5)
        const spinX = Math.random() - 0.5;
        const spinY = Math.random() - 0.5;

        // Occasional jump shot
        let jumpForce = 0;
        if (power < 25 && Math.random() < 0.15) {
            jumpForce = -22;
        }

        return {
            force: { x: (dx / len) * power, y: jumpForce, z: (dz / len) * power },
            strikeOffset: { x: spinX, y: spinY },
            target
        };
    }

    /**
     * Find the best shot from N simulations using async batches.
     */
    _findBestShotAsync(numSimulations, batchSize, playerInfo, game, onComplete) {
        let bestShot = null;
        let bestScore = -Infinity;
        let index = 0;

        const scheduleWork = window.requestIdleCallback
            ? (fn) => requestIdleCallback(fn, { timeout: 100 })
            : (fn) => setTimeout(fn, 0);

        const runBatch = () => {
            const batchEnd = Math.min(index + batchSize, numSimulations);

            for (let i = index; i < batchEnd; i++) {
                const shot = this._generateRandomShot(game.whiteBall, game.frictionList);
                if (!shot) continue;

                const result = simulateShot(
                    shot,
                    playerInfo,
                    game.physicsWorld,
                    game.frictionList,
                    game.whiteBall
                );

                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestShot = shot;
                    bestShot.result = result;

                    // Clean pot found — stop searching
                    if (!result.isFoul && (result.potted.red + result.potted.blue + result.potted.black) > 0) {
                        onComplete(bestShot);
                        return;
                    }
                }
            }

            index = batchEnd;

            if (index < numSimulations) {
                scheduleWork(runBatch);
            } else {
                onComplete(bestShot);
            }
        };

        runBatch();
    }

    /**
     * Check if AI is currently searching for a shot.
     */
    isSimulating() {
        return this.simulatingShots;
    }
}
