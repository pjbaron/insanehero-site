/**
 * Physics - Matter.js wrapper
 * Manages the physics world, stepping, and body creation helpers
 */

var Physics = {
    engine: null,
    world: null,
    runner: null,

    // World dimensions (game units, not pixels)
    WORLD_W: 800,
    WORLD_H: 600,

    init: function() {
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 1.5 },
            enableSleeping: true
        });
        this.world = this.engine.world;
        // Increase position/velocity iterations for stability
        this.engine.positionIterations = 8;
        this.engine.velocityIterations = 6;
    },

    clear: function() {
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
        this.init();
    },

    step: function(dt) {
        Matter.Engine.update(this.engine, dt * 1000);
    },

    addBody: function(body) {
        Matter.World.add(this.world, body);
        return body;
    },

    removeBody: function(body) {
        Matter.World.remove(this.world, body);
    },

    addConstraint: function(constraint) {
        Matter.World.add(this.world, constraint);
        return constraint;
    },

    removeConstraint: function(constraint) {
        Matter.World.remove(this.world, constraint);
    },

    // Helper: create a static rectangle (wall, floor, platform)
    createStatic: function(x, y, w, h, opts) {
        var options = Object.assign({
            isStatic: true,
            friction: 0.8,
            restitution: 0.2
        }, opts || {});
        return this.addBody(Matter.Bodies.rectangle(x, y, w, h, options));
    },

    // Helper: create a dynamic circle (boulder)
    createBoulder: function(x, y, radius, opts) {
        var options = Object.assign({
            density: 0.008,
            friction: 0.5,
            restitution: 0.3,
            frictionAir: 0.001
        }, opts || {});
        return this.addBody(Matter.Bodies.circle(x, y, radius, options));
    },

    // Helper: create a rope constraint between two bodies or points
    createRope: function(bodyA, bodyB, pointA, pointB, length, stiffness) {
        var constraint = Matter.Constraint.create({
            bodyA: bodyA,
            bodyB: bodyB,
            pointA: pointA || { x: 0, y: 0 },
            pointB: pointB || { x: 0, y: 0 },
            length: length || 50,
            stiffness: stiffness || 0.8,
            damping: 0.1
        });
        return this.addConstraint(constraint);
    },

    // Helper: create a revolute (hinge) constraint
    createHinge: function(body, worldPoint) {
        var constraint = Matter.Constraint.create({
            bodyA: body,
            pointB: worldPoint,
            length: 0,
            stiffness: 1.0
        });
        return this.addConstraint(constraint);
    },

    // Check if all dynamic bodies have settled (sleeping or very slow)
    isSettled: function() {
        var bodies = Matter.Composite.allBodies(this.world);
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.isStatic || b.isSensor) continue;
            if (b.isSleeping) continue;
            var speed = b.speed;
            if (speed > 0.5) return false;
        }
        return true;
    },

    // Get all bodies
    getAllBodies: function() {
        return Matter.Composite.allBodies(this.world);
    },

    // Get all constraints
    getAllConstraints: function() {
        return Matter.Composite.allConstraints(this.world);
    },

    // Collision events
    onCollision: function(callback) {
        Matter.Events.on(this.engine, 'collisionStart', callback);
    },

    offCollision: function(callback) {
        Matter.Events.off(this.engine, 'collisionStart', callback);
    }
};
