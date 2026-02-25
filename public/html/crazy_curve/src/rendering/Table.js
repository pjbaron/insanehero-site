import {
    TABLE_WIDTH,
    TABLE_LENGTH,
    POCKET_Z,
    POCKET_X,
    POCKET_M,
    CURVE_X,
    CURVE_Z,
    CUSHION_DEPTH,
    CUSHION_HEIGHT,
    WOOD_EDGE_HEIGHT
} from '../config.js';

/**
 * Create the pool table with baize, cushions, and wood edges.
 * @param {BABYLON.Scene} scene - The Babylon scene
 * @returns {BABYLON.Mesh[]} Array of ground meshes that receive shadows
 */
export function createTable(scene) {
    // Materials
    const baizeMaterial = new BABYLON.StandardMaterial("ground", scene);
    baizeMaterial.diffuseTexture = new BABYLON.Texture("textures/baize.png", scene);
    baizeMaterial.diffuseTexture.uScale = 2;
    baizeMaterial.diffuseTexture.vScale = 4;
    baizeMaterial.specularColor = new BABYLON.Color3(0.0, 0.02, 0.0);

    const woodMaterial = new BABYLON.StandardMaterial("wood", scene);
    woodMaterial.diffuseTexture = new BABYLON.Texture("textures/albedo.png", scene);
    woodMaterial.diffuseTexture.uScale = 1;
    woodMaterial.diffuseTexture.vScale = 1;
    woodMaterial.specularColor = new BABYLON.Color3(1.0, 0.5, 0.25);

    const side = TABLE_LENGTH / 2 - POCKET_M / 2 - POCKET_Z;
    const midside = side / 2 + POCKET_M / 2;

    // Create cushions
    createCushions(scene, baizeMaterial, woodMaterial, side, midside);

    // Create pocket backs
    createPocketBacks(scene, woodMaterial);

    // Create ground surfaces
    const grounds = createGrounds(scene, baizeMaterial, side, midside);

    return grounds;
}

function createCushions(scene, baizeMaterial, woodMaterial, side, midside) {
    const width = TABLE_WIDTH;
    const length = TABLE_LENGTH;
    const cushHigh = CUSHION_HEIGHT;
    const woodEdgeHigh = WOOD_EDGE_HEIGHT;
    const curveLen = Math.sqrt(CURVE_X * CURVE_X + CURVE_Z * CURVE_Z);

    // Top cushion
    let cushion = BABYLON.MeshBuilder.CreateBox("cushTop", { width: width - POCKET_X * 2 - CURVE_X * 2, height: 0.2, depth: CUSHION_DEPTH }, scene);
    cushion.position = new BABYLON.Vector3(0, cushHigh, length / 2);
    cushion.material = baizeMaterial;

    // Top cushion corner curves
    cushion = BABYLON.MeshBuilder.CreateBox("cushTLT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width - POCKET_X * 2 - CURVE_X * 2) / 2, cushHigh, length / 2 - CUSHION_DEPTH / 2 + curveLen / 2);
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushTRT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width - POCKET_X * 2 - CURVE_X * 2) / 2, cushHigh, length / 2 - CUSHION_DEPTH / 2 + curveLen / 2);
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushTLL", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, side + POCKET_M / 2 - CURVE_Z);
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushTLR", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, side + POCKET_M / 2 - CURVE_Z);
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    // Top wood edge
    let wood = BABYLON.MeshBuilder.CreateBox("cushTopWood", { width: width - POCKET_X * 2 - CURVE_X * 2, height: woodEdgeHigh, depth: 2.0 }, scene);
    wood.position = new BABYLON.Vector3(0, cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25, length / 2 + 0.75);
    wood.material = woodMaterial;

    // Bottom cushion
    cushion = BABYLON.MeshBuilder.CreateBox("cushBot", { width: width - POCKET_X * 2 - CURVE_X * 2, height: 0.2, depth: CUSHION_DEPTH }, scene);
    cushion.position = new BABYLON.Vector3(0, cushHigh, -length / 2);
    cushion.material = baizeMaterial;

    // Bottom cushion corner curves
    cushion = BABYLON.MeshBuilder.CreateBox("cushBLT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width - POCKET_X * 2 - CURVE_X * 2) / 2, cushHigh, -(length / 2 - CUSHION_DEPTH / 2 + curveLen / 2));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushBRT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width - POCKET_X * 2 - CURVE_X * 2) / 2, cushHigh, -(length / 2 - CUSHION_DEPTH / 2 + curveLen / 2));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushBLL", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, -(side + POCKET_M / 2 - CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushBLR", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, -(side + POCKET_M / 2 - CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    // Bottom wood edge
    wood = BABYLON.MeshBuilder.CreateBox("cushBotWood", { width: width - POCKET_X * 2 - CURVE_X * 2, height: woodEdgeHigh, depth: 2.0 }, scene);
    wood.position.x = 0;
    wood.position.y = cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25;
    wood.position.z = -length / 2 - 0.75;
    wood.material = woodMaterial;

    // Side cushions
    // Top left side
    cushion = BABYLON.MeshBuilder.CreateBox("cushTopLft", { width: CUSHION_DEPTH, height: 0.2, depth: side - CURVE_Z * 2 }, scene);
    cushion.position.x = -width / 2;
    cushion.position.y = cushHigh;
    cushion.position.z = midside;
    cushion.material = baizeMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("cushTopLftWood", { width: 2.0, height: woodEdgeHigh, depth: side - CURVE_Z * 2 }, scene);
    wood.position.x = -width / 2 - 0.75;
    wood.position.y = cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25;
    wood.position.z = midside;
    wood.material = woodMaterial;

    // Middle left curves
    cushion = BABYLON.MeshBuilder.CreateBox("cushMLT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, (POCKET_M / 2 + CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushMLB", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3(-(width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, -(POCKET_M / 2 + CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    // Top right side
    cushion = BABYLON.MeshBuilder.CreateBox("cushTopRgt", { width: CUSHION_DEPTH, height: 0.2, depth: side - CURVE_Z * 2 }, scene);
    cushion.position.x = width / 2;
    cushion.position.y = cushHigh;
    cushion.position.z = midside;
    cushion.material = baizeMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("cushTopRgtWood", { width: 2.0, height: woodEdgeHigh, depth: side - CURVE_Z * 2 }, scene);
    wood.position.x = width / 2 + 0.75;
    wood.position.y = cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25;
    wood.position.z = midside;
    wood.material = woodMaterial;

    // Bottom left side
    cushion = BABYLON.MeshBuilder.CreateBox("cushBotLft", { width: CUSHION_DEPTH, height: 0.2, depth: side - CURVE_Z * 2 }, scene);
    cushion.position.x = -width / 2;
    cushion.position.y = cushHigh;
    cushion.position.z = -midside;
    cushion.material = baizeMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("cushBotLftWood", { width: 2.0, height: woodEdgeHigh, depth: side - CURVE_Z * 2 }, scene);
    wood.position.x = -width / 2 - 0.75;
    wood.position.y = cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25;
    wood.position.z = -midside;
    wood.material = woodMaterial;

    // Middle right curves
    cushion = BABYLON.MeshBuilder.CreateBox("cushMRT", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, (POCKET_M / 2 + CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    cushion = BABYLON.MeshBuilder.CreateBox("cushMRB", { width: CURVE_X, height: 0.2, depth: CURVE_Z }, scene);
    cushion.position = new BABYLON.Vector3((width / 2 - CUSHION_DEPTH / 2 + curveLen / 2), cushHigh, -(POCKET_M / 2 + CURVE_Z));
    cushion.rotation = new BABYLON.Vector3(0, -Math.PI / 4, 0);
    cushion.material = baizeMaterial;

    // Bottom right side
    cushion = BABYLON.MeshBuilder.CreateBox("cushBotRgt", { width: CUSHION_DEPTH, height: 0.2, depth: side - CURVE_Z * 2 }, scene);
    cushion.position.x = width / 2;
    cushion.position.y = cushHigh;
    cushion.position.z = -midside;
    cushion.material = baizeMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("cushBotRgtWood", { width: 2.0, height: woodEdgeHigh, depth: side - CURVE_Z * 2 }, scene);
    wood.position.x = width / 2 + 0.75;
    wood.position.y = cushHigh - 0.5 * woodEdgeHigh + 0.2 * 0.25;
    wood.position.z = -midside;
    wood.material = woodMaterial;
}

function createPocketBacks(scene, woodMaterial) {
    const width = TABLE_WIDTH;
    const length = TABLE_LENGTH;
    const woodEdgeHigh = WOOD_EDGE_HEIGHT;
    const pocketx = POCKET_X;
    const pocketz = POCKET_Z;

    // Top left pocket back
    let wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.17), -0.5, length / 2 + pocketz * 0.17);
    wood.rotation = new BABYLON.Vector3(0, Math.PI / 4, -0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.26 - 2.5), -0.5, length / 2 + pocketz * 0.35);
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 18 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.35), -0.5, length / 2 + pocketz * 0.26 - 2.5);
    wood.rotation = new BABYLON.Vector3(0, -Math.PI * 2 / 32, 0);
    wood.material = woodMaterial;

    // Top right pocket back
    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.17), -0.5, length / 2 + pocketz * 0.17);
    wood.rotation = new BABYLON.Vector3(0, Math.PI / 4 + Math.PI / 2, -0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.26 - 2.5), -0.5, length / 2 + pocketz * 0.35);
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 14 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.35), -0.5, length / 2 + pocketz * 0.26 - 2.5);
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 2 / 32, 0);
    wood.material = woodMaterial;

    // Bottom left pocket back
    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.17), -0.5, -(length / 2 + pocketz * 0.17));
    wood.rotation = new BABYLON.Vector3(0, Math.PI / 4 + Math.PI / 2, 0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.26 - 2.5), -0.5, -(length / 2 + pocketz * 0.35));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 14 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 0.35), -0.5, -(length / 2 + pocketz * 0.26 - 2.5));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 2 / 32, 0);
    wood.material = woodMaterial;

    // Bottom right pocket back
    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.17), -0.5, -(length / 2 + pocketz * 0.17));
    wood.rotation = new BABYLON.Vector3(0, Math.PI / 4, 0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.26 - 2.5), -0.5, -(length / 2 + pocketz * 0.35));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 18 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 2.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 0.35), -0.5, -(length / 2 + pocketz * 0.26 - 2.5));
    wood.rotation = new BABYLON.Vector3(0, -Math.PI * 2 / 32, 0);
    wood.material = woodMaterial;

    // Middle left pocket back
    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 1.3), -0.5, 0);
    wood.rotation = new BABYLON.Vector3(0, Math.PI, 0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 1.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 1.0), -0.5, -(pocketz * 0.7));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 20 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 1.5 }, scene);
    wood.position = new BABYLON.Vector3(-(width / 2 + pocketx * 1.0), -0.5, (pocketz * 0.7));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 12 / 32, 0);
    wood.material = woodMaterial;

    // Middle right pocket back
    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 3.0 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 1.3), -0.5, 0);
    wood.rotation = new BABYLON.Vector3(0, 0, 0.1);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 1.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 1.0), -0.5, -(pocketz * 0.7));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 12 / 32, 0);
    wood.material = woodMaterial;

    wood = BABYLON.MeshBuilder.CreateBox("pocket", { width: 0.5, height: woodEdgeHigh, depth: 1.5 }, scene);
    wood.position = new BABYLON.Vector3((width / 2 + pocketx * 1.0), -0.5, (pocketz * 0.7));
    wood.rotation = new BABYLON.Vector3(0, Math.PI * 20 / 32, 0);
    wood.material = woodMaterial;
}

function createGrounds(scene, baizeMaterial, side, midside) {
    const width = TABLE_WIDTH;
    const length = TABLE_LENGTH;
    const pocketx = POCKET_X;
    const pocketz = POCKET_Z;

    const grounds = [];

    // Main base
    grounds[0] = BABYLON.Mesh.CreateGround('ground1', width - pocketx * 2, length - pocketz * 2, 2, scene);
    grounds[0].material = baizeMaterial;

    // Top edge
    grounds[1] = BABYLON.Mesh.CreateGround('ground1', width - pocketx * 2, pocketz, 2, scene);
    grounds[1].position = new BABYLON.Vector3(0, 0, length / 2 - 1.5);
    grounds[1].material = baizeMaterial;

    // Bottom edge
    grounds[2] = BABYLON.Mesh.CreateGround('ground1', width - pocketx * 2, 3, 2, scene);
    grounds[2].position = new BABYLON.Vector3(0, 0, -length / 2 + 1.5);
    grounds[2].material = baizeMaterial;

    // Top right edge
    grounds[3] = BABYLON.Mesh.CreateGround('ground1', pocketx, side, 2, scene);
    grounds[3].position = new BABYLON.Vector3((width / 2 - pocketx / 2), 0, midside);
    grounds[3].material = baizeMaterial;

    // Top left edge
    grounds[4] = BABYLON.Mesh.CreateGround('ground1', pocketx, side, 2, scene);
    grounds[4].position = new BABYLON.Vector3(-(width / 2 - pocketx / 2), 0, midside);
    grounds[4].material = baizeMaterial;

    // Bottom right edge
    grounds[5] = BABYLON.Mesh.CreateGround('ground1', pocketx, side, 2, scene);
    grounds[5].position = new BABYLON.Vector3((width / 2 - pocketx / 2), 0, -midside);
    grounds[5].material = baizeMaterial;

    // Bottom left edge
    grounds[6] = BABYLON.Mesh.CreateGround('ground1', pocketx, side, 2, scene);
    grounds[6].position = new BABYLON.Vector3(-(width / 2 - pocketx / 2), 0, -midside);
    grounds[6].material = baizeMaterial;

    // Corner angles
    grounds[7] = BABYLON.Mesh.CreateGround('ground1', 2, 2, 2, scene);
    grounds[7].position = new BABYLON.Vector3(-(width / 2 - pocketx * 1.1), 0, length / 2 - pocketz * 1.1);
    grounds[7].rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
    grounds[7].material = baizeMaterial;

    grounds[8] = BABYLON.Mesh.CreateGround('ground1', 2, 2, 2, scene);
    grounds[8].position = new BABYLON.Vector3((width / 2 - pocketx * 1.1), 0, length / 2 - pocketz * 1.1);
    grounds[8].rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
    grounds[8].material = baizeMaterial;

    grounds[9] = BABYLON.Mesh.CreateGround('ground1', 2, 2, 2, scene);
    grounds[9].position = new BABYLON.Vector3((width / 2 - pocketx * 1.1), 0, -(length / 2 - pocketz * 1.1));
    grounds[9].rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
    grounds[9].material = baizeMaterial;

    grounds[10] = BABYLON.Mesh.CreateGround('ground1', 2, 2, 2, scene);
    grounds[10].position = new BABYLON.Vector3(-(width / 2 - pocketx * 1.1), 0, -(length / 2 - pocketz * 1.1));
    grounds[10].rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
    grounds[10].material = baizeMaterial;

    // Middle pocket angles
    grounds[11] = BABYLON.Mesh.CreateGround('ground1', 4, 4, 2, scene);
    grounds[11].position = new BABYLON.Vector3(-(width / 2 - pocketx * 0.8), 0, pocketz / 4 * 3);
    grounds[11].rotation = new BABYLON.Vector3(0, Math.PI / 3, 0);
    grounds[11].material = baizeMaterial;

    grounds[12] = BABYLON.Mesh.CreateGround('ground1', 4, 4, 2, scene);
    grounds[12].position = new BABYLON.Vector3(-(width / 2 - pocketx * 0.8), 0, -pocketz / 4 * 3);
    grounds[12].rotation = new BABYLON.Vector3(0, -Math.PI / 3, 0);
    grounds[12].material = baizeMaterial;

    grounds[13] = BABYLON.Mesh.CreateGround('ground1', 4, 4, 2, scene);
    grounds[13].position = new BABYLON.Vector3((width / 2 - pocketx * 0.8), 0, pocketz / 4 * 3);
    grounds[13].rotation = new BABYLON.Vector3(0, -Math.PI / 3, 0);
    grounds[13].material = baizeMaterial;

    grounds[14] = BABYLON.Mesh.CreateGround('ground1', 4, 4, 2, scene);
    grounds[14].position = new BABYLON.Vector3((width / 2 - pocketx * 0.8), 0, -pocketz / 4 * 3);
    grounds[14].rotation = new BABYLON.Vector3(0, Math.PI / 3, 0);
    grounds[14].material = baizeMaterial;

    return grounds;
}
