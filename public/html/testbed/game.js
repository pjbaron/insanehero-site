// game.js

// Create a new Phaser game instance
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

let leftPaddle;
let rightPaddle;
let ball;
let cursors;
let wKey;
let sKey;
let leftScore = 0;
let rightScore = 0;
let leftScoreText;
let rightScoreText;
let hitSound;
let scoreSound;
let gameState = 'start'; // start, play, gameover

function preload() {
    // Load sound effects
    this.load.audio('hit', 'assets/sounds/hit.wav');
    this.load.audio('score', 'assets/sounds/score.wav');
}

function create() {
    // Create left paddle
    leftPaddle = this.add.rectangle(50, this.cameras.main.centerY, 20, 100, 0xffffff);
    this.physics.add.existing(leftPaddle, true);

    // Create right paddle
    rightPaddle = this.add.rectangle(750, this.cameras.main.centerY, 20, 100, 0xffffff);
    this.physics.add.existing(rightPaddle, true);

    // Create ball
    ball = this.add.circle(this.cameras.main.centerX, this.cameras.main.centerY, 10, 0xffffff);
    this.physics.add.existing(ball);
    ball.body.setCollideWorldBounds(true, 1, 1);
    ball.body.setBounce(1, 1);

    // Set up keyboard input
    cursors = this.input.keyboard.createCursorKeys();
    wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    // Enable collision between ball and paddles
    this.physics.add.collider(ball, leftPaddle, () => {
        ball.body.setVelocityX(ball.body.velocity.x * -1);
        hitSound.play();
    });
    this.physics.add.collider(ball, rightPaddle, () => {
        ball.body.setVelocityX(ball.body.velocity.x * -1);
        hitSound.play();
    });

    // Add scoring text
    leftScoreText = this.add.text(300, 50, '0', { fontSize: '32px', fill: '#fff' });
    rightScoreText = this.add.text(500, 50, '0', { fontSize: '32px', fill: '#fff' });

    // Load sounds
    hitSound = this.sound.add('hit');
    scoreSound = this.sound.add('score');

    // Start game on user input
    this.input.keyboard.on('keydown', startGame, this);
}

function update() {
    if (gameState === 'play') {
        // Paddle movement for left paddle
        if (wKey.isDown) {
            leftPaddle.y -= 5;
        } else if (sKey.isDown) {
            leftPaddle.y += 5;
        }

        // Paddle movement for right paddle (AI)
        if (ball.y < rightPaddle.y) {
            rightPaddle.y -= 3;
        } else if (ball.y > rightPaddle.y) {
            rightPaddle.y += 3;
        }

        // Update paddle positions
        leftPaddle.body.updateFromGameObject();
        rightPaddle.body.updateFromGameObject();

        // Check for scoring
        if (ball.x < 0) {
            rightScore += 1;
            rightScoreText.setText(rightScore);
            scoreSound.play();
            resetBall();
        } else if (ball.x > 800) {
            leftScore += 1;
            leftScoreText.setText(leftScore);
            scoreSound.play();
            resetBall();
        }

        // Check for game over
        if (leftScore >= 10 || rightScore >= 10) {
            gameState = 'gameover';
            this.add.text(400, 300, 'Game Over', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);
        }
    }
}

function startGame() {
    if (gameState === 'start') {
        gameState = 'play';
        ball.body.setVelocity(200, 200);
    }
}

function resetBall() {
    ball.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
    ball.body.setVelocity(0, 0);
    gameState = 'start';
}