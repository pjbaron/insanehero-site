import { TABLE_WIDTH, TABLE_LENGTH, POCKET_SIZE, POCKET_POSITIONS } from '../config.js';

/**
 * Check if a ball position is in a pocket.
 * Ball must be BEYOND the table edge to count as potted.
 */
export function isInPocket(x, z) {
    const halfWidth = TABLE_WIDTH / 2;
    const halfLength = TABLE_LENGTH / 2;

    // Must be beyond table edge
    const beyondLeft = x < -halfWidth;
    const beyondRight = x > halfWidth;
    const beyondTop = z > halfLength;
    const beyondBottom = z < -halfLength;

    if (!beyondLeft && !beyondRight && !beyondTop && !beyondBottom) {
        return false;  // still on table
    }

    // Corner pockets - must be beyond edge AND near corner
    // Top left
    if (beyondLeft && beyondTop) return true;
    if (beyondLeft && z > halfLength - POCKET_SIZE) return true;
    if (beyondTop && x < -halfWidth + POCKET_SIZE) return true;

    // Top right
    if (beyondRight && beyondTop) return true;
    if (beyondRight && z > halfLength - POCKET_SIZE) return true;
    if (beyondTop && x > halfWidth - POCKET_SIZE) return true;

    // Bottom left
    if (beyondLeft && beyondBottom) return true;
    if (beyondLeft && z < -halfLength + POCKET_SIZE) return true;
    if (beyondBottom && x < -halfWidth + POCKET_SIZE) return true;

    // Bottom right
    if (beyondRight && beyondBottom) return true;
    if (beyondRight && z < -halfLength + POCKET_SIZE) return true;
    if (beyondBottom && x > halfWidth - POCKET_SIZE) return true;

    // Middle pockets - must be beyond side edge AND near center
    if (beyondLeft && Math.abs(z) < POCKET_SIZE) return true;
    if (beyondRight && Math.abs(z) < POCKET_SIZE) return true;

    return false;  // beyond edge but not near a pocket
}

/**
 * Check if a ball is near a pocket (close but not in).
 * Used for both scoring (balls moved near pocket) and pot detection.
 */
export function isNearPocket(x, z, threshold = 4.0) {
    const halfWidth = TABLE_WIDTH / 2;
    const halfLength = TABLE_LENGTH / 2;

    // Corner pockets
    if (Math.abs(x - (-halfWidth)) < threshold && Math.abs(z - halfLength) < threshold) return true;   // top left
    if (Math.abs(x - halfWidth) < threshold && Math.abs(z - halfLength) < threshold) return true;      // top right
    if (Math.abs(x - (-halfWidth)) < threshold && Math.abs(z - (-halfLength)) < threshold) return true; // bottom left
    if (Math.abs(x - halfWidth) < threshold && Math.abs(z - (-halfLength)) < threshold) return true;   // bottom right

    // Middle pockets
    if (Math.abs(x - (-halfWidth)) < threshold && Math.abs(z) < threshold) return true;  // left middle
    if (Math.abs(x - halfWidth) < threshold && Math.abs(z) < threshold) return true;     // right middle

    return false;
}
