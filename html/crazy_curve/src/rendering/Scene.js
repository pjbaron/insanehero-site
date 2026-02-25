import {
    CAMERA_ALPHA,
    CAMERA_BETA,
    CAMERA_RADIUS,
    CAMERA_LOWER_BETA_LIMIT,
    CAMERA_UPPER_BETA_LIMIT,
    CAMERA_LOWER_RADIUS_LIMIT,
    CAMERA_UPPER_RADIUS_LIMIT
} from '../config.js';

/**
 * Create and configure the Babylon.js scene with camera and lights.
 * @param {BABYLON.Engine} engine - The Babylon engine
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {{ scene: BABYLON.Scene, camera: BABYLON.ArcRotateCamera }}
 */
export function createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);

    // Setup camera
    const camera = new BABYLON.ArcRotateCamera(
        "Camera",
        CAMERA_ALPHA,
        CAMERA_BETA,
        CAMERA_RADIUS,
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.lowerBetaLimit = CAMERA_LOWER_BETA_LIMIT;
    camera.upperBetaLimit = CAMERA_UPPER_BETA_LIMIT;
    camera.lowerRadiusLimit = CAMERA_LOWER_RADIUS_LIMIT;
    camera.upperRadiusLimit = CAMERA_UPPER_RADIUS_LIMIT;
    camera.attachControl(canvas, true);

    // General room light
    const light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0, -1, 0), scene);

    const hemi = new BABYLON.HemisphericLight("hemi01", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.diffuse = new BABYLON.Color3(0.1, 0.1, 0.1);
    hemi.specular = new BABYLON.Color3(0.1, 0.1, 0.1);
    hemi.groundColor = new BABYLON.Color3(0.1, 0.2, 0.1);

    return { scene, camera, light };
}

/**
 * Create shadow generator for balls casting shadows on table.
 */
export function createShadows(light, generators, receivers) {
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.usePoissonSampling = true;

    for (const gen of generators) {
        shadowGenerator.getShadowMap().renderList.push(gen);
    }

    for (const rec of receivers) {
        rec.receiveShadows = true;
    }

    return shadowGenerator;
}
