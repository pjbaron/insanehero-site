import { createScene, createShadows } from './rendering/Scene.js';
import { createTable } from './rendering/Table.js';
import { Balls } from './rendering/Balls.js';
import { Cue } from './rendering/Cue.js';
import { ShotIndicator } from './rendering/ShotIndicator.js';
import { createStaticTableWorld } from './physics/PhysicsWorld.js';
import { Game } from './Game.js';
import { AIPlayer } from './players/AIPlayer.js';
import { HumanPlayer } from './players/HumanPlayer.js';

// Game components
let canvas = null;
let engine = null;
let scene = null;
let camera = null;
let game = null;
let balls = null;
let cue = null;
let humanPlayer = null;
let aiPlayer = null;

/**
 * Initialize and start the game.
 */
function startGame() {
    canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true);

    // Create scene with camera and lights
    const sceneResult = createScene(engine, canvas);
    scene = sceneResult.scene;
    camera = sceneResult.camera;
    const light = sceneResult.light;

    // Create static table physics world (direct Cannon.js, no Babylon plugin)
    const physicsWorld = createStaticTableWorld();

    // Create table
    const grounds = createTable(scene);

    // Create balls
    balls = new Balls(scene);
    const allBalls = balls.getAllBalls();
    const whiteBall = balls.getWhiteBall();

    // Create cue stick
    cue = new Cue(scene);

    // Setup shadows
    createShadows(light, allBalls, grounds);

    // Create game instance
    game = new Game(physicsWorld, allBalls, whiteBall);

    // Create shot indicator and players
    const shotIndicator = new ShotIndicator(scene);
    humanPlayer = new HumanPlayer(canvas);
    humanPlayer.shotIndicator = shotIndicator;
    aiPlayer = new AIPlayer();

    // Configure player types (player 1 = human, player 2 = AI)
    game.setPlayerTypes('human', 'ai');
    game.setPlayers(humanPlayer, aiPlayer);

    // Handle window resize
    window.addEventListener('resize', () => {
        engine.resize();
    });

    // Register update loop
    scene.registerBeforeRender(() => {
        game.update(humanPlayer, aiPlayer, camera, cue);
    });

    // Start render loop
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Setup keyboard controls for testing/debugging
    setupKeyboardControls();

    // Allow scene to initialize before starting
    setTimeout(() => {
        game.setReady();
    }, 1000);
}

/**
 * Setup keyboard controls for testing and debugging.
 */
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P') {
            // Toggle pause
            game.autoPaused = !game.autoPaused;
            console.log(game.autoPaused ? "PAUSED - press P to resume" : "RESUMED");
        }
    });
}

// Start the game when DOM is ready
window.addEventListener('DOMContentLoaded', startGame);
