/**
 * CameraController - A comprehensive camera system for Phaser 3.90
 * Handles smooth following, bounds, zoom, shake, and advanced camera behaviors
 * 
 * CAMERA BEHAVIOR MODES:
 * - FOLLOW: Basic smooth following of target
 * - DEADZONE: Camera only moves when target leaves center area
 * - PREDICTIVE: Camera leads the target based on movement direction
 * - LOOK_AHEAD: Camera moves ahead in the direction of target movement
 * 
 * COORDINATE SYSTEM:
 * - Camera position represents the CENTER of the camera view
 * - World bounds define the limits of camera movement
 * - Deadzone is relative to camera center
 */
class CameraController
{
    /**
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Configuration object
     * @param {Phaser.GameObjects.GameObject} config.target - Initial target to follow
     * @param {Object} config.worldBounds - World limits {x, y, width, height}
     * @param {string} config.mode - Camera mode: 'follow', 'deadzone', 'predictive', 'lookAhead'
     * @param {number} config.smoothness - Camera smoothness factor 0-1 (default: 0.1)
     * @param {Object} config.deadzone - Deadzone area {x, y, width, height} relative to camera center
     * @param {number} config.lookAheadDistance - Distance to look ahead in pixels (default: 100)
     * @param {number} config.lookAheadSmoothness - Smoothness of look-ahead movement (default: 0.05)
     * @param {Object} config.offset - Camera offset from target {x, y} (default: {x: 0, y: 0})
     * @param {number} config.minZoom - Minimum zoom level (default: 0.5)
     * @param {number} config.maxZoom - Maximum zoom level (default: 3.0)
     * @param {number} config.zoomSpeed - Zoom transition speed (default: 0.1)
     * @param {Object} config.shakeConfig - Shake configuration {maxIntensity, decayRate}
     * 
     * SETUP REQUIREMENTS:
     * 1. Target object must have x, y properties
     * 2. For predictive mode, target should have body.velocity or velocityX/velocityY
     * 3. Call update(time, delta) in scene's update method
     * 4. Set world bounds that make sense for your game world
     */
    constructor(scene, config)
    {
        this.scene = scene;
        this.camera = scene.cameras.main;
        
        // Core settings
        this.target = config.target || null;
        this.worldBounds = config.worldBounds || {x: 0, y: 0, width: 1600, height: 1200};
        this.mode = config.mode || 'follow';
        this.smoothness = config.smoothness || 0.1;
        this.offset = config.offset || {x: 0, y: 0};
        
        // Deadzone settings
        this.deadzone = config.deadzone || {x: -50, y: -50, width: 100, height: 100};
        
        // Look-ahead settings
        this.lookAheadDistance = config.lookAheadDistance || 100;
        this.lookAheadSmoothness = config.lookAheadSmoothness || 0.05;
        this.lookAheadOffset = {x: 0, y: 0};
        
        // Zoom settings
        this.minZoom = config.minZoom || 0.5;
        this.maxZoom = config.maxZoom || 3.0;
        this.targetZoom = 1.0;
        this.zoomSpeed = config.zoomSpeed || 0.1;
        
        // Shake settings
        this.shakeConfig = config.shakeConfig || {maxIntensity: 10, decayRate: 0.95};
        this.shakeIntensity = 0;
        this.shakeOffset = {x: 0, y: 0};
        
        // Internal state
        this.targetPosition = {x: 0, y: 0};
        this.lastTargetPosition = {x: 0, y: 0};
        this.velocity = {x: 0, y: 0};
        this.isActive = true;
        
        // Camera zones for different behaviors
        this.zones = new Map();
        this.currentZone = null;
        
        // Initialize camera bounds
        this.setCameraBounds();
        
        // Set initial position if target exists
        if (this.target) {
            this.setTarget(this.target);
        }
    }
    
    /**
     * Sets the camera bounds based on world bounds
     */
    setCameraBounds()
    {
        this.camera.setBounds(
            this.worldBounds.x,
            this.worldBounds.y,
            this.worldBounds.width,
            this.worldBounds.height
        );
    }
    
    /**
     * Sets or changes the target object
     * @param {Phaser.GameObjects.GameObject} target - Object to follow
     * @param {boolean} snapToTarget - Immediately snap camera to target (default: false)
     */
    setTarget(target, snapToTarget = false)
    {
        this.target = target;
        
        if (target)
        {
            this.lastTargetPosition.x = target.x;
            this.lastTargetPosition.y = target.y;
            
            if (snapToTarget)
            {
                this.targetPosition.x = target.x + this.offset.x;
                this.targetPosition.y = target.y + this.offset.y;
                this.camera.centerOn(this.targetPosition.x, this.targetPosition.y);
            }
        }
    }
    
    /**
     * Sets the camera mode
     * @param {string} mode - 'follow', 'deadzone', 'predictive', 'lookAhead'
     */
    setMode(mode)
    {
        this.mode = mode;
        
        // Reset look-ahead when changing modes
        if (mode !== 'lookAhead' && mode !== 'predictive')
        {
            this.lookAheadOffset.x = 0;
            this.lookAheadOffset.y = 0;
        }
    }
    
    /**
     * Sets camera smoothness
     * @param {number} smoothness - Value between 0 (no smoothing) and 1 (maximum smoothing)
     */
    setSmoothness(smoothness)
    {
        this.smoothness = Phaser.Math.Clamp(smoothness, 0, 1);
    }
    
    /**
     * Sets the world bounds
     * @param {Object} bounds - {x, y, width, height}
     */
    setWorldBounds(bounds)
    {
        this.worldBounds = bounds;
        this.setCameraBounds();
    }
    
    /**
     * Adds a camera zone with specific behavior
     * @param {string} name - Zone identifier
     * @param {Object} area - Zone area {x, y, width, height}
     * @param {Object} behavior - Zone behavior {mode, smoothness, zoom, offset}
     */
    addZone(name, area, behavior)
    {
        this.zones.set(name, {
            area: area,
            behavior: behavior
        });
    }
    
    /**
     * Removes a camera zone
     * @param {string} name - Zone identifier
     */
    removeZone(name)
    {
        this.zones.delete(name);
    }
    
    /**
     * Starts screen shake effect
     * @param {number} intensity - Shake intensity (0-1)
     * @param {number} duration - Duration in milliseconds (optional)
     */
    shake(intensity = 0.5, duration = null)
    {
        this.shakeIntensity = Math.min(intensity, 1) * this.shakeConfig.maxIntensity;
        
        if (duration)
        {
            this.scene.time.delayedCall(duration, () => {
                this.shakeIntensity = 0;
            });
        }
    }
    
    /**
     * Sets target zoom level
     * @param {number} zoom - Target zoom level
     * @param {boolean} immediate - Apply zoom immediately (default: false)
     */
    setZoom(zoom, immediate = false)
    {
        this.targetZoom = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
        
        if (immediate)
        {
            this.camera.setZoom(this.targetZoom);
            this.setCameraBounds();
        }
    }
    
    /**
     * Smoothly transitions to a specific position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {number} duration - Transition duration in milliseconds
     * @param {Function} onComplete - Callback when transition completes
     */
    panTo(x, y, duration = 1000, onComplete = null)
    {
        this.isActive = false;
        
        this.scene.tweens.add({
            targets: this.camera,
            scrollX: x - this.camera.width / 2,
            scrollY: y - this.camera.height / 2,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                this.isActive = true;
                if (onComplete) onComplete();
            }
        });
    }
    
    /**
     * Updates camera position and effects - MUST be called in scene's update method
     * @param {number} time - Current time
     * @param {number} delta - Delta time in milliseconds
     */
    update(time, delta)
    {
        if (!this.isActive || !this.target) return;
        
        // Update target velocity
        this.velocity.x = this.target.x - this.lastTargetPosition.x;
        this.velocity.y = this.target.y - this.lastTargetPosition.y;
        this.lastTargetPosition.x = this.target.x;
        this.lastTargetPosition.y = this.target.y;
        
        // Check for zone changes
        this.checkZones();
        
        // Calculate target position based on mode
        this.calculateTargetPosition();
        
        // Apply camera movement
        this.applyCameraMovement(delta);
        
        // Update zoom
        this.updateZoom();
        
        // Update shake effect
        this.updateShake();
        
        // Apply final camera position with shake
        const finalX = this.targetPosition.x + this.shakeOffset.x;
        const finalY = this.targetPosition.y + this.shakeOffset.y;
        
        this.camera.centerOn(finalX, finalY);
    }
    
    /**
     * Calculates target position based on current mode
     */
    calculateTargetPosition()
    {
        const baseX = this.target.x + this.offset.x;
        const baseY = this.target.y + this.offset.y;
        
        switch (this.mode)
        {
            case 'follow':
                this.targetPosition.x = baseX;
                this.targetPosition.y = baseY;
                break;
                
            case 'deadzone':
                this.calculateDeadzonePosition(baseX, baseY);
                break;
                
            case 'predictive':
                this.calculatePredictivePosition(baseX, baseY);
                break;
                
            case 'lookAhead':
                this.calculateLookAheadPosition(baseX, baseY);
                break;
        }
    }
    
    /**
     * Calculates deadzone camera position
     */
    calculateDeadzonePosition(baseX, baseY)
    {
        const camX = this.camera.midPoint.x;
        const camY = this.camera.midPoint.y;
        
        const deadLeft = camX + this.deadzone.x;
        const deadRight = camX + this.deadzone.x + this.deadzone.width;
        const deadTop = camY + this.deadzone.y;
        const deadBottom = camY + this.deadzone.y + this.deadzone.height;
        
        // Only move camera if target is outside deadzone
        if (baseX < deadLeft)
        {
            this.targetPosition.x = baseX - this.deadzone.x;
        } 
        else if (baseX > deadRight)
        {
            this.targetPosition.x = baseX - this.deadzone.x - this.deadzone.width;
        }
        else
        {
            this.targetPosition.x = camX;
        }
        
        if (baseY < deadTop)
        {
            this.targetPosition.y = baseY - this.deadzone.y;
        }
        else if (baseY > deadBottom)
        {
            this.targetPosition.y = baseY - this.deadzone.y - this.deadzone.height;
        } 
        else
        {
            this.targetPosition.y = camY;
        }
    }
    
    /**
     * Calculates predictive camera position based on target velocity
     */
    calculatePredictivePosition(baseX, baseY)
    {
        // Use physics body velocity if available, otherwise use calculated velocity
        let velX = this.velocity.x;
        let velY = this.velocity.y;
        
        if (this.target.body && this.target.body.velocity)
        {
            velX = this.target.body.velocity.x / 60; // Convert to pixels per frame
            velY = this.target.body.velocity.y / 60;
        }
        
        const predictDistance = 60; // Look ahead 60 pixels
        this.targetPosition.x = baseX + velX * predictDistance;
        this.targetPosition.y = baseY + velY * predictDistance;
    }
    
    /**
     * Calculates look-ahead camera position
     */
    calculateLookAheadPosition(baseX, baseY)
    {
        // Gradually adjust look-ahead based on movement
        const targetLookX = this.velocity.x > 0 ? this.lookAheadDistance : 
                           this.velocity.x < 0 ? -this.lookAheadDistance : 0;
        const targetLookY = this.velocity.y > 0 ? this.lookAheadDistance : 
                           this.velocity.y < 0 ? -this.lookAheadDistance : 0;
        
        // Smooth look-ahead adjustment
        this.lookAheadOffset.x = Phaser.Math.Linear(
            this.lookAheadOffset.x, 
            targetLookX, 
            this.lookAheadSmoothness
        );
        this.lookAheadOffset.y = Phaser.Math.Linear(
            this.lookAheadOffset.y, 
            targetLookY, 
            this.lookAheadSmoothness
        );
        
        this.targetPosition.x = baseX + this.lookAheadOffset.x;
        this.targetPosition.y = baseY + this.lookAheadOffset.y;
    }
    
    /**
     * Applies smooth camera movement
     */
    applyCameraMovement(delta)
    {
        const currentX = this.camera.midPoint.x;
        const currentY = this.camera.midPoint.y;
        
        const lerp = Phaser.Math.Clamp((this.smoothness || 0.1) * (delta / 16.67), 0, 1);
        
        this.targetPosition.x = Phaser.Math.Linear(currentX, this.targetPosition.x, lerp);
        this.targetPosition.y = Phaser.Math.Linear(currentY, this.targetPosition.y, lerp);
    }
    
    /**
     * Updates camera zoom
     */
    updateZoom()
    {
        if (Math.abs(this.camera.zoom - this.targetZoom) > 0.01)
        {
            this.camera.setZoom(
                Phaser.Math.Linear(this.camera.zoom, this.targetZoom, this.zoomSpeed)
            );
            this.setCameraBounds();
        }
    }
    
    /**
     * Updates screen shake effect
     */
    updateShake()
    {
        if (this.shakeIntensity > 0)
        {
            this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= this.shakeConfig.decayRate;
            
            if (this.shakeIntensity < 0.1)
            {
                this.shakeIntensity = 0;
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
            }
        }
    }
    
    /**
     * Checks if target is in any defined zones
     */
    checkZones()
    {
        let newZone = null;
        
        for (const [name, zone] of this.zones)
        {
            const area = zone.area;
            if (this.target.x >= area.x && this.target.x <= area.x + area.width &&
                this.target.y >= area.y && this.target.y <= area.y + area.height)
            {
                newZone = name;
                break;
            }
        }
        
        // Apply zone behavior if changed
        if (newZone !== this.currentZone)
        {
            this.currentZone = newZone;
            if (newZone)
            {
                const behavior = this.zones.get(newZone).behavior;
                if (behavior.mode) this.setMode(behavior.mode);
                if (behavior.smoothness !== undefined) this.setSmoothness(behavior.smoothness);
                if (behavior.zoom) this.setZoom(behavior.zoom);
                if (behavior.offset) this.offset = behavior.offset;
            }
        }
    }
    
    /**
     * Gets current camera information
     * @returns {Object} Camera state
     */
    getCameraInfo()
    {
        return {
            x: this.camera.midPoint.x,
            y: this.camera.midPoint.y,
            zoom: this.camera.zoom,
            mode: this.mode,
            target: this.target,
            isActive: this.isActive
        };
    }
    
    /**
     * Activates or deactivates camera following
     * @param {boolean} active - Whether camera should be active
     */
    setActive(active)
    {
        this.isActive = active;
    }
    
    /**
     * Destroys the camera controller
     */
    destroy()
    {
        this.target = null;
        this.scene = null;
        this.zones.clear();
    }
}

// Example usage and implementation guide:
/*
STEP-BY-STEP IMPLEMENTATION:

1. CREATE CAMERA CONTROLLER in scene's create():
   this.cameraController = new CameraController(this, {
       target: this.player,
       worldBounds: {x: 0, y: 0, width: 2400, height: 1800},
       mode: 'lookAhead',
       smoothness: 0.1,
       lookAheadDistance: 120,
       offset: {x: 0, y: -50}, // Camera slightly above player
       shakeConfig: {maxIntensity: 15, decayRate: 0.9}
   });

2. ADD UPDATE CALL in scene's update method:
   update(time, delta) {
       this.cameraController.update(time, delta);
   }

CAMERA MODES:

// Basic following
mode: 'follow' // Camera always centers on target

// Deadzone (camera only moves when player leaves center area)
mode: 'deadzone',
deadzone: {x: -100, y: -75, width: 200, height: 150}

// Predictive (camera leads based on velocity)
mode: 'predictive' // Requires target.body.velocity or movement

// Look-ahead (camera moves ahead in movement direction)
mode: 'lookAhead',
lookAheadDistance: 150,
lookAheadSmoothness: 0.03

DYNAMIC CAMERA ZONES:

// Different camera behavior in different areas
this.cameraController.addZone('boss_room', 
    {x: 1000, y: 500, width: 800, height: 600},
    {mode: 'follow', smoothness: 0.05, zoom: 0.8}
);

this.cameraController.addZone('tight_corridor',
    {x: 200, y: 1200, width: 400, height: 200}, 
    {mode: 'deadzone', zoom: 1.2}
);

COMMON FUNCTIONS:

// Screen shake on impact
this.cameraController.shake(0.7, 300); // 70% intensity for 300ms

// Zoom for dramatic effect
this.cameraController.setZoom(1.5); // Smooth zoom to 1.5x

// Pan to show something important
this.cameraController.panTo(boss.x, boss.y, 2000, () => {
    // Camera finished panning, resume following
});

// Change target dynamically
this.cameraController.setTarget(this.vehicle, true); // Snap to vehicle

// Temporarily disable following
this.cameraController.setActive(false);

PLATFORMER SETUP:
this.cameraController = new CameraController(this, {
    target: this.player,
    mode: 'deadzone',
    deadzone: {x: -80, y: -60, width: 160, height: 120},
    smoothness: 0.08,
    offset: {x: 0, y: -30} // Look slightly ahead vertically
});

TOP-DOWN SHOOTER SETUP:
this.cameraController = new CameraController(this, {
    target: this.player,
    mode: 'lookAhead', 
    lookAheadDistance: 100,
    smoothness: 0.12,
    shakeConfig: {maxIntensity: 8, decayRate: 0.95}
});

RACING GAME SETUP:
this.cameraController = new CameraController(this, {
    target: this.car,
    mode: 'predictive',
    smoothness: 0.15,
    offset: {x: 0, y: 80} // Camera behind the car
});
*/

export default CameraController;