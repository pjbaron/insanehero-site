/**
 * Entity data classes (global, non-module)
 * Plain objects with factory functions -- no prototype overhead
 */

var Entities = {
    /** Create a fireball */
    fireball: function(x, y, speed) {
        var angle = Math.random() * Math.PI * 2;
        return {
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 8,
            speed: speed,
            trail: [] // recent positions for trail effect
        };
    },

    /** Create an ice wall segment */
    iceWall: function(ax, ay, bx, by) {
        return {
            ax: ax, ay: ay, bx: bx, by: by,
            hp: 1.0,
            maxHp: 1.0,
            age: 0,
            melting: false
        };
    },

    /** Create a fire demon */
    fireDemon: function(x, y, tx, ty, speed) {
        var dx = tx - x, dy = ty - y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
            x: x, y: y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            radius: 14,
            speed: speed,
            hp: 1,
            flashTimer: 0 // for spawn flash
        };
    },

    /** Create a drifting snowflake */
    snowflake: function(x, y, tx, ty, speed) {
        var dx = tx - x, dy = ty - y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
            x: x, y: y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            radius: 10,
            wobblePhase: Math.random() * Math.PI * 2,
            alive: true
        };
    },

    /** Create a floating score popup */
    scorePopup: function(x, y, text, color) {
        return {
            x: x, y: y,
            text: text,
            color: color || '#fff',
            life: 1.0,
            maxLife: 1.0
        };
    }
};
