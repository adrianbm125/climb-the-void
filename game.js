const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

window.addEventListener("gamepadconnected", function(event) {
    console.log("Gamepad connected:", event.gamepad.id);
});
window.addEventListener("gamepaddisconnected", function(event) {
    console.log("Gamepad disconnected:", event.gamepad.id);
});

const restartButton = document.getElementById("restartButton");
const connectControllerButton =
    document.getElementById("connectControllerButton");

let serialPort = null;
let serialReader = null;
let serialBuffer = "";
const playerTopLimit = canvas.height / 2;
const maxPlayerBullets = 3;

const playerImage = new Image();
playerImage.src = "images/PlayerShip0_mono.png";

const alienA0 = new Image();
alienA0.src = "images/SmallEnemyPointA_0_mono.png";

const alienB0 = new Image();
alienB0.src = "images/SmallEnemyPointB_0_mono.png";

const alienA1 = new Image();
alienA1.src = "images/SmallEnemyPointA_1_mono.png";

const alienB1 = new Image();
alienB1.src = "images/SmallEnemyPointB_1_mono.png";

const alienA2 = new Image();
alienA2.src = "images/SmallEnemyPointA_2_mono.png";

const alienB2 = new Image();
alienB2.src = "images/SmallEnemyPointB_2_mono.png";

const laserImage = new Image();
laserImage.src = "images/Laser0_mono.png";

const explosionImage = new Image();
explosionImage.src = "images/SmallExplosion0_mono.png";

const enemyBulletImage = new Image();
enemyBulletImage.src = "images/Missile0_mono.png";

const shootSound = new Audio("sounds/shoot.wav");
const explosionSound = new Audio("sounds/explosion.wav");

let soundReady = false;

document.addEventListener("click", function enableGameAudio() {

    if (soundReady) {
        return;
    }

    shootSound.volume = 0;

    shootSound.play()
        .then(() => {
            shootSound.pause();
            shootSound.currentTime = 0;
            shootSound.volume = 1;

            soundReady = true;

            console.log("Game audio enabled");
        })
        .catch(error => {
            shootSound.volume = 1;
            console.log("Could not enable audio:", error);
        });

}, { once: true });

const bossImage0 = new Image();
bossImage0.src = "images/boss0.png";

const bossImage1 = new Image();
bossImage1.src = "images/boss1.png";

const bossImage2 = new Image();
bossImage2.src = "images/boss2.png";

const bossShotImage = new Image();
bossShotImage.src = "images/boss_shot.png";

const bossSpreadImage = new Image();
bossSpreadImage.src = "images/boss_spread.png";

const laserWarningImage = new Image();
laserWarningImage.src = "images/laser_warning.png";

const laser0 = new Image();
laser0.src = "images/laser0.png";

const laser1 = new Image();
laser1.src = "images/laser1.png";

const laser2 = new Image();
laser2.src = "images/laser2.png";

const laser3 = new Image();
laser3.src = "images/laser3.png";

const laserImages = [
    laser0,
    laser1,
    laser2,
    laser3
];

const bossLaserVisualWidth = 500;   // how wide the PNG looks
const bossLaserHitboxWidth = 120;   // actual damaging area
const bossLaserWarningWidth = 500;  // warning lane width

let highScore = localStorage.getItem("highScore") || 0;
let wave = 10;
let waveCleared = false;
let waveTransition = false;
let waveTransitionTimer = 0;

let playerX = 280;
let playerY = 640;
let score = 0;
let gameOver = false;

let bossFrame = 0;
let bossFrameTimer = 0;

let lives = 3;

let enemyBullet = {
    x: 0,
    y: 0,
    width: 6,
    height: 18,
    speed: 4,
    active: false
};

let bullets = [];

let bossBullets = [];

let explosion = {
    x: 0,
    y: 0,
    active: false,
    timer: 0
};

let boss = {
    x: 0,
    y: 70,
    width: 140,
    height: 70,

    health: 30,
    maxHealth: 30,

    speed: 2,
    direction: 1,

    active: false,

    attackTimer: 0,
    attackDelay: 120,

    laserWarning: false,
    laserWarningTimer: 0,

    laserActive: false,
    laserTimer: 0,

    laserFrame: 0,
    laserFrameTimer: 0,

    laserX: 0
};

let enemies = [];

let enemiesToSpawn = 0;
let enemiesSpawned = 0;

let spawnTimer = 0;
let spawnDelay = 60;

let stars = [];
const starCount = 80;

let alienFrame = 0;
let alienFrameTimer = 0;
let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;

let gamepadLeft = false;
let gamepadRight = false;
let gamepadUp = false;
let gamepadDown = false;

let previousGamepadShoot = false;
let previousGamepadPause = false;

let gameStarted = false;
let paused = false;

let invincible = false;
let invincibilityTimer = 0;
let playerVisible = true;
let flashTimer = 0;


const enemyWidth = 50;
const enemyHeight = 30;
const playerWidth = 54;
const playerHeight = 24;
const playerSpeed = 5;


function playerShoot() {
    if (
        !gameStarted ||
        paused ||
        gameOver ||
        waveTransition ||
        bullets.length >= maxPlayerBullets
    ) {
        return;
    }

    bullets.push({
        x: playerX + playerWidth / 2 - 3,
        y: playerY,
        width: 6,
        height: 27,
        speed: 7
    });

    shootSound.currentTime = 0;
    shootSound.volume = 1;

    shootSound.play().catch(error => {
        console.log("Shoot sound error:", error);
    });
}

document.addEventListener("keydown", function(event) 
{
    if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.code === "Space"
    ) {
        event.preventDefault();
    }
    if (event.key === "ArrowLeft") {
        leftPressed = true;
    }
    if (event.key === "ArrowRight") {
        rightPressed = true;
    }
    if (event.key === "ArrowUp") {
        upPressed = true;
    }
    if (event.key === "ArrowDown") {
        downPressed = true;
    }
    if (event.key === "Enter" && !gameStarted) {
        gameStarted = true;
    }
    if (event.code === "Space") {
        playerShoot();
    }
    if ((event.key === "p" || event.key === "P") && gameStarted && !gameOver) {
        paused = !paused;
    }
});

document.addEventListener("keyup", function(event)
{
    if (event.key === "ArrowLeft") {
        leftPressed = false;
    }
    if (event.key === "ArrowRight") {
        rightPressed = false;
    }
    if (event.key === "ArrowUp") {
        upPressed = false;
    }
    if (event.key === "ArrowDown") {
        downPressed = false;
    }
});

connectControllerButton.addEventListener("click", connectController);

async function connectController() {
    if (!("serial" in navigator)) {
        alert(
            "Web Serial is not supported in this browser. " +
            "Use Chrome or Edge."
        );

        return;
    }

    try {
        serialPort = await navigator.serial.requestPort();

        await serialPort.open({
            baudRate: 9600
        });

        connectControllerButton.textContent =
            "Controller Connected";

        connectControllerButton.disabled = true;

        readController();
    }
    catch (error) {
        console.error("Controller connection failed:", error);
    }
}

async function readController() {
    const decoder = new TextDecoder();

    while (serialPort && serialPort.readable) {
        serialReader = serialPort.readable.getReader();

        try {
            while (true) {
                const { value, done } =
                    await serialReader.read();

                if (done) {
                    break;
                }

                const text = decoder.decode(value, {
                    stream: true
                });

                serialBuffer += text;

                let newlineIndex;

                while (
                    (newlineIndex =
                        serialBuffer.indexOf("\n")) !== -1
                ) {
                    const command =
                        serialBuffer
                            .slice(0, newlineIndex)
                            .trim();

                    serialBuffer =
                        serialBuffer.slice(
                            newlineIndex + 1
                        );

                    handleControllerCommand(command);
                }
            }
        }
        catch (error) {
            console.error(
                "Serial read error:",
                error
            );
        }
        finally {
            serialReader.releaseLock();
        }
    }
}

function handleControllerCommand(command) {
    console.log("TM4C:", command);

    switch (command) {

        case "LEFT_DOWN":
            leftPressed = true;
            break;

        case "LEFT_UP":
            leftPressed = false;
            break;

        case "RIGHT_DOWN":
            rightPressed = true;
            break;

        case "RIGHT_UP":
            rightPressed = false;
            break;

        case "UP_DOWN":
            upPressed = true;
            break;

        case "UP_UP":
            upPressed = false;
            break;

        case "DOWN_DOWN":
            downPressed = true;
            break;

        case "DOWN_UP":
            downPressed = false;
            break;

        case "SHOOT":
            playerShoot();
            break;

        case "START":
            if (!gameStarted) {
                gameStarted = true;
            }
            break;

        case "PAUSE":
            if (gameStarted && !gameOver) {
                paused = !paused;
            }
            break;
    }
}


function spawnEnemy() {
    if (enemiesSpawned >= enemiesToSpawn) {
        return;
    }

    spawnTimer++;

    if (spawnTimer >= spawnDelay) {
        const enemyX =
            Math.random() *
            (canvas.width - enemyWidth);

        const horizontalSpeed =
            0.7 + wave * 0.03;

        enemies.push({
            x: enemyX,
            y: -enemyHeight,

            width: enemyWidth,
            height: enemyHeight,

            alive: true,

            type:
                Math.floor(
                    Math.random() * 3
                ),

            dx:
                Math.random() < 0.5
                    ? -horizontalSpeed
                    : horizontalSpeed,

            dy:
                1.2 + wave * 0.08
        });

        enemiesSpawned++;
        spawnTimer = 0;
    }
}

function updatePlayer() {
    if (leftPressed || gamepadLeft) {
    playerX -= playerSpeed;
    }

    if (rightPressed || gamepadRight) {
        playerX += playerSpeed;
    }

    if (upPressed || gamepadUp) {
        playerY -= playerSpeed;
    }

    if (downPressed || gamepadDown) {
        playerY += playerSpeed;
    }
    if (playerX < 0) {
        playerX = 0;
    }
    if (playerX + playerWidth > canvas.width) {
        playerX = canvas.width - playerWidth;
    }
    if (playerY < playerTopLimit) {
        playerY = playerTopLimit;
    }

    if (playerY + playerHeight > canvas.height) {
        playerY = canvas.height - playerHeight;
    }
}

function updateGamepad() {
    const gamepads = navigator.getGamepads();

    if (!gamepads) {
        return;
    }

    const gamepad = gamepads[0];

    if (!gamepad) {
        gamepadLeft = false;
        gamepadRight = false;
        gamepadUp = false;
        gamepadDown = false;
        return;
    }

    // LEFT ANALOG STICK
    const horizontal = gamepad.axes[0];
    const vertical = gamepad.axes[1];

    const deadzone = 0.2;

    gamepadLeft = horizontal < -deadzone;
    gamepadRight = horizontal > deadzone;
    gamepadUp = vertical < -deadzone;
    gamepadDown = vertical > deadzone;


    // D-PAD
    if (gamepad.buttons[14]?.pressed) {
        gamepadLeft = true;
    }

    if (gamepad.buttons[15]?.pressed) {
        gamepadRight = true;
    }

    if (gamepad.buttons[12]?.pressed) {
        gamepadUp = true;
    }

    if (gamepad.buttons[13]?.pressed) {
        gamepadDown = true;
    }


    // CROSS / X
    const crossPressed =
        gamepad.buttons[0]?.pressed || false;

    if (crossPressed && !previousGamepadShoot) {

        if (gameOver) {
            restartGame();
        }
        else if (!gameStarted) {
            gameStarted = true;
        }
        else {
            playerShoot();
        }
    }

    previousGamepadShoot = crossPressed;


    // OPTIONS = PAUSE / UNPAUSE
    const pausePressed =
        gamepad.buttons[9]?.pressed || false;

    if (
        pausePressed &&
        !previousGamepadPause &&
        gameStarted &&
        !gameOver
    ) {
        paused = !paused;
    }

    previousGamepadPause = pausePressed;
}

function updateBullets() {
    for (let bullet of bullets) {
        bullet.y -= bullet.speed;
    }

    bullets = bullets.filter(
        bullet => bullet.y + bullet.height >= 0
    );
}

function updateEnemies() {
    for (let enemy of enemies) {
        if (!enemy.alive) {
            continue;
        }

        enemy.x += enemy.dx;
        enemy.y += enemy.dy;

        if (enemy.x <= 0) {
            enemy.x = 0;
            enemy.dx *= -1;
        }

        if (enemy.x + enemy.width >= canvas.width) {
            enemy.x = canvas.width - enemy.width;
            enemy.dx *= -1;
        }

        if (enemy.y > canvas.height) {
            gameOver = true;
        }
    }
}

function updateAlienAnimation() {
    alienFrameTimer++;

    if (alienFrameTimer >= 20) {
        alienFrame = alienFrame === 0 ? 1 : 0;
        alienFrameTimer = 0;
    }
}

function updateEnemyBullet() {
    if (enemyBullet.active) {
        enemyBullet.y += enemyBullet.speed;

        if (enemyBullet.y > canvas.height) {
            enemyBullet.active = false;
        }
    }
}

function updateExplosion() {
    if (explosion.active) {
        explosion.timer--;

        if (explosion.timer <= 0) {
            explosion.active = false;
        }
    }
}

function updateInvincibility() {
    if (invincible) {
        invincibilityTimer--;
        flashTimer++;

        if (flashTimer >= 6) {
            playerVisible = !playerVisible;
            flashTimer = 0;
        }

        if (invincibilityTimer <= 0) {
            invincible = false;
            playerVisible = true;
        }
    }
}

function updateStars() {
    for (let star of stars) {
        star.y += star.speed;

        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
}

function updateWaveTransition() {
    if (waveTransition) {
        waveTransitionTimer--;

        if (waveTransitionTimer <= 0) {
            wave++;

            startWave();

            waveTransition = false;
        }
    }
}

function updateBoss() {
    if (!boss.active) {
        return;
    }

    if (boss.laserWarning || boss.laserActive) {
        return;
    }

    boss.x += boss.speed * boss.direction;

    if (boss.x <= 0) {
        boss.x = 0;
        boss.direction = 1;
    }

    if (boss.x + boss.width >= canvas.width) {
        boss.x = canvas.width - boss.width;
        boss.direction = -1;
    }
}

function updateBossAnimation() {
    if (!boss.active) {
        return;
    }

    bossFrameTimer++;

    if (bossFrameTimer >= 20) {
        bossFrame++;

        if (bossFrame > 1) {
            bossFrame = 0;
        }

        bossFrameTimer = 0;
    }
}

function updateBossBullets() {
    for (let bullet of bossBullets) {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
    }

    bossBullets = bossBullets.filter(
        bullet =>
            bullet.y < canvas.height &&
            bullet.x + bullet.width > 0 &&
            bullet.x < canvas.width
    );
}

function updateBossLaser() {
    if (boss.laserWarning) {
        boss.laserWarningTimer--;

        if (boss.laserWarningTimer <= 0) {
            boss.laserWarning = false;

            boss.laserActive = true;
            boss.laserTimer = 75;

            boss.laserFrame = 0;
            boss.laserFrameTimer = 0;
        }
    }

    if (boss.laserActive) {
        boss.laserTimer--;

        boss.laserFrameTimer++;

        if (boss.laserFrameTimer >= 5) {
            boss.laserFrame++;

            if (boss.laserFrame >= laserImages.length) {
                boss.laserFrame = 0;
            }

            boss.laserFrameTimer = 0;
        }

        if (boss.laserTimer <= 0) {
            boss.laserActive = false;
        }
    }
}

function enemyShoot() {
    if (enemyBullet.active) {
        return;
    }

    const livingEnemies = enemies.filter(enemy => enemy.alive);

    if (livingEnemies.length === 0) {
        return;
    }

    const fireChance = Math.min(
        0.06,
        0.015 + wave * 0.003
    );

    if (Math.random() < fireChance) {
        const shooter =
            livingEnemies[
                Math.floor(Math.random() * livingEnemies.length)
            ];

        enemyBullet.active = true;

        enemyBullet.x =
            shooter.x + shooter.width / 2 - enemyBullet.width / 2;

        enemyBullet.y =
            shooter.y + shooter.height;
    }
}

function chooseBossAttack() {
    if (!boss.active) {
        return;
    }

    if (boss.laserWarning || boss.laserActive) {
        return;
    }

    boss.attackTimer++;

    if (boss.attackTimer < boss.attackDelay) {
        return;
    }

    boss.attackTimer = 0;

    const attack = Math.floor(Math.random() * 3);

    if (attack === 0) {
        fireBossShot();
    }
    else if (attack === 1) {
        fireBossSpread();
    }
    else {
        startBossLaserWarning();
    }
}

function fireBossShot() {
    const startX =
        boss.x + boss.width / 2 - 18;

    const startY =
        boss.y + boss.height;

    const targetX =
        playerX + playerWidth / 2;

    const targetY =
        playerY + playerHeight / 2;

    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    const distance =
        Math.hypot(deltaX, deltaY);

    const speed = 4;

    bossBullets.push({
        x: startX,
        y: startY,

        width: 60,
        height: 60,

        dx: deltaX / distance * speed,
        dy: deltaY / distance * speed,

        type: "shot"
    });
}

function fireBossSpread() {
    const startX =
        boss.x + boss.width / 2 - 9;

    const startY =
        boss.y + boss.height;

    bossBullets.push({
        x: startX,
        y: startY,
        width: 40,
        height: 40,
        dx: -2,
        dy: 4,
        type: "spread"
    });

    bossBullets.push({
        x: startX,
        y: startY,
        width: 40,
        height: 40,
        dx: 0,
        dy: 4,
        type: "spread"
    });

    bossBullets.push({
        x: startX,
        y: startY,
        width: 40,
        height: 40,
        dx: 2,
        dy: 4,
        type: "spread"
    });
}

function checkCollision() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];

        for (let enemy of enemies) {
            if (!enemy.alive) {
                continue;
            }

            const bulletHitsEnemy =
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y;

            if (bulletHitsEnemy) {
                enemy.alive = false;

                bullets.splice(bulletIndex, 1);

                score += 10;

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem("highScore", highScore);
                }

                explosion.x = enemy.x;
                explosion.y = enemy.y;
                explosion.active = true;
                explosion.timer = 10;

                explosionSound.currentTime = 0;
                explosionSound.play();

                break;
            }
        }
    }
}

function checkBossCollision() {
    if (!boss.active) {
        return;
    }

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];

        const bulletHitsBoss =
            bullet.x < boss.x + boss.width &&
            bullet.x + bullet.width > boss.x &&
            bullet.y < boss.y + boss.height &&
            bullet.y + bullet.height > boss.y;

        if (bulletHitsBoss) {
            // Remove only the bullet that hit the boss
            bullets.splice(bulletIndex, 1);

            boss.health--;

            explosion.x = bullet.x;
            explosion.y = bullet.y;
            explosion.active = true;
            explosion.timer = 10;

            explosionSound.currentTime = 0;
            explosionSound.play();

            if (boss.health <= 0) {
                boss.active = false;

                // Clear boss attacks
                bossBullets = [];
                boss.laserWarning = false;
                boss.laserActive = false;

                score += 1000;

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem("highScore", highScore);
                }

                waveTransition = true;
                waveTransitionTimer = 90;

                return;
            }
        }
    }
}

function checkBossBulletHit() {
    if (invincible) {
        return;
    }

    for (
        let i = bossBullets.length - 1;
        i >= 0;
        i--
    ) {
        const bullet = bossBullets[i];

        const hit =
            bullet.x < playerX + playerWidth &&
            bullet.x + bullet.width > playerX &&
            bullet.y < playerY + playerHeight &&
            bullet.y + bullet.height > playerY;

        if (hit) {
            bossBullets.splice(i, 1);

            damagePlayer();

            return;
        }
    }
}

function checkBossLaserHit() {
    if (!boss.laserActive || invincible) {
        return;
    }

    const laserCenter =
        boss.laserX + bossLaserVisualWidth / 2;

    const hitboxLeft =
        laserCenter - bossLaserHitboxWidth / 2;

    const hitboxRight =
        laserCenter + bossLaserHitboxWidth / 2;

    const playerLeft = playerX;
    const playerRight = playerX + playerWidth;

    const hit =
        playerRight > hitboxLeft &&
        playerLeft < hitboxRight;

    if (hit) {
        damagePlayer();
    }
}


function checkWaveCleared() {
    const anyAlive = enemies.some(enemy => enemy.alive);

    const allEnemiesSpawned =
        enemiesSpawned >= enemiesToSpawn;

    if (
        allEnemiesSpawned &&
        !anyAlive &&
        !waveTransition
    ) {
        waveTransition = true;
        waveTransitionTimer = 90;
    }
}

function checkPlayerHit() {
    if (!enemyBullet.active || invincible) {
        return;
    }

    const bulletHitsPlayer =
        enemyBullet.x < playerX + playerWidth &&
        enemyBullet.x + enemyBullet.width > playerX &&
        enemyBullet.y < playerY + playerHeight &&
        enemyBullet.y + enemyBullet.height > playerY;

    if (bulletHitsPlayer) {
        enemyBullet.active = false;
        lives--;

        invincible = true;
        invincibilityTimer = 120;

        if (lives <= 0) {
            gameOver = true;
        }
    }
}

function createEnemies() {
    enemies = [];

    const baseEnemies = 8;
    const waveIncrease = wave * 2;
    const randomBonus = Math.floor(Math.random() * 4);

    enemiesToSpawn =
        baseEnemies +
        waveIncrease +
        randomBonus;

    enemiesSpawned = 0;
    spawnTimer = 0;

    spawnDelay = Math.max(
        20,
        70 - wave * 4
    );
}

function createStars() {
    stars = [];

    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 1.5 + 0.5
        });
    }
}

function createBoss() {
    enemies = [];

    boss.x = canvas.width / 2 - boss.width / 2;
    boss.y = 70;

    boss.health = 30;
    boss.maxHealth = 30;

    boss.speed = 2;
    boss.direction = 1;

    bossFrame = 0;
    bossFrameTimer = 0;

    boss.active = true;

    bossBullets = [];

    boss.attackTimer = 0;

    boss.laserWarning = false;
    boss.laserWarningTimer = 0;

    boss.laserActive = false;
    boss.laserTimer = 0;

    boss.laserFrame = 0;
    boss.laserFrameTimer = 0;
}

function drawPlayer() {
    if (!playerVisible) {
        return;
    }

    ctx.drawImage(
        playerImage,
        playerX,
        playerY,
        playerWidth,
        playerHeight
    );
}

function drawBullets() {
    for (let bullet of bullets) {
        ctx.drawImage(
            laserImage,
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );

        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "red";
        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );

        ctx.globalCompositeOperation = "source-over";

    }
}

function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy.alive) {
            continue;
        }

        let image;

        if (enemy.type === 0) {
            image = alienFrame === 0 ? alienA0 : alienB0;
        }
        else if (enemy.type === 1) {
            image = alienFrame === 0 ? alienA1 : alienB1;
        }
        else {
            image = alienFrame === 0 ? alienA2 : alienB2;
        }

        ctx.drawImage(
            image,
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height
        );

        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "pink";
        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height
        );

        ctx.globalCompositeOperation = "source-over";
    }
}

function drawExplosion() {
    if (explosion.active) {
        ctx.drawImage(
            explosionImage,
            explosion.x,
            explosion.y,
            enemyWidth,
            enemyHeight
        );
    }
}

function drawScore() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);
}

function drawEnemyBullet() {
    if (enemyBullet.active) {
        ctx.drawImage(
            enemyBulletImage,
            enemyBullet.x,
            enemyBullet.y,
            enemyBullet.width,
            enemyBullet.height
        );

        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "lime";
        ctx.fillRect(
            enemyBullet.x,
            enemyBullet.y,
            enemyBullet.width,
            enemyBullet.height
        );

        ctx.globalCompositeOperation = "source-over";
    }
}

function drawWave() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Wave: " + wave, 500, 30);
}

function drawLives() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Lives: " + lives, 350, 30);
}

function drawHighScore() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("High: " + highScore, 190, 30);
}

function drawStars() {
    ctx.fillStyle = "white";

    for (let star of stars) {
        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );
    }
}

function drawBoss() {
    if (!boss.active) {
        return;
    }

    let image;

    if (boss.laserWarning || boss.laserActive) {
        image = bossImage2;
    }
    else if (bossFrame === 0) {
        image = bossImage0;
    }
    else {
        image = bossImage1;
    }

    ctx.drawImage(
        image,
        boss.x,
        boss.y,
        boss.width,
        boss.height
    );
}

function damagePlayer() {
    if (invincible || gameOver) {
        return;
    }

    lives--;

    invincible = true;
    invincibilityTimer = 120;

    playerVisible = true;
    flashTimer = 0;

    if (lives <= 0) {
        gameOver = true;
    }
}

function drawBossHealth() {
    if (!boss.active) {
        return;
    }

    const barWidth = 400;
    const barHeight = 20;

    const x = canvas.width / 2 - barWidth / 2;
    const y = 50;

    const healthPercent =
        boss.health / boss.maxHealth;

    ctx.fillStyle = "gray";
    ctx.fillRect(
        x,
        y,
        barWidth,
        barHeight
    );

    ctx.fillStyle = "red";
    ctx.fillRect(
        x,
        y,
        barWidth * healthPercent,
        barHeight
    );

    ctx.strokeStyle = "white";
    ctx.strokeRect(
        x,
        y,
        barWidth,
        barHeight
    );
}

function drawBossBullets() {
    for (let bullet of bossBullets) {
        let image;

        if (bullet.type === "shot") {
            image = bossShotImage;
        }
        else {
            image = bossSpreadImage;
        }

        ctx.globalCompositeOperation = "screen";

        ctx.drawImage(
            image,
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );

        ctx.globalCompositeOperation = "source-over";
    }
}

function drawBossLaserWarning() {
    if (!boss.laserWarning) {
        return;
    }

    const flashOn =
        Math.floor(boss.laserWarningTimer / 8) % 2 === 0;

    if (!flashOn) {
        return;
    }

    const laserY =
        boss.y + boss.height;

    const laserHeight =
        canvas.height - laserY;

    // Find the center of the huge visual laser image
    const laserCenter =
        boss.laserX + bossLaserVisualWidth / 2;

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.7;

    ctx.drawImage(
        laserWarningImage,

        // Only show warning where the damaging portion will be
        laserCenter - bossLaserWarningWidth  / 2,

        laserY,
        bossLaserWarningWidth ,
        laserHeight
    );

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
}

function drawBossLaser() {
    if (!boss.laserActive) {
        return;
    }

    const laserY =
        boss.y + boss.height;

    const laserHeight =
        canvas.height - laserY;

    const image =
        laserImages[boss.laserFrame];

    ctx.globalCompositeOperation = "screen";

    ctx.drawImage(
        image,
        boss.laserX,
        laserY,
        bossLaserVisualWidth,
        laserHeight
    );

    ctx.globalCompositeOperation = "source-over";
}

function startWave() {
    if (wave === 10) {
        createBoss();
    }
    else {
        boss.active = false;
        createEnemies();
    }
}

function startBossLaserWarning() {
    boss.laserWarning = true;
    boss.laserWarningTimer = 90;

    boss.laserX =
        boss.x +
        boss.width / 2 -
        bossLaserVisualWidth  / 2;
}

function gameLoop() {
    updateGamepad()
    // START SCREEN
    if (!gameStarted) {
        updateStars();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawStars();

        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "SPACE INVADERS",
            canvas.width / 2,
            140
        );

        ctx.font = "20px Arial";
        ctx.fillText(
            "Arrow Keys: Move",
            canvas.width / 2,
            210
        );
        ctx.fillText(
            "Spacebar: Shoot",
            canvas.width / 2,
            240
        );
        ctx.fillText(
            "Press Enter to Start",
            canvas.width / 2,
            300
        );

        ctx.textAlign = "left";

        requestAnimationFrame(gameLoop);
        return;
    }


    // GAME OVER
    if (gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawStars();
        drawPlayer();
        drawEnemies();
        drawScore();
        drawLives();
        drawHighScore();
        drawWave();

        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "GAME OVER",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.textAlign = "left";

        restartButton.style.display = "inline-block";

        requestAnimationFrame(gameLoop);
        return;
    }


    // PAUSE
    if (paused) {
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "PAUSED",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.textAlign = "left";

        requestAnimationFrame(gameLoop);
        return;
    }


    // STARS ALWAYS KEEP MOVING
    updateStars();

    // Player and existing effects keep moving
    updatePlayer();
    updateBullets();
    updateEnemyBullet();
    updateExplosion();
    updateInvincibility();

    // Enemy gameplay pauses during the stage transition
    if (!waveTransition) {

        // BOSS WAVE
        if (boss.active) {
            updateBoss();
            updateBossAnimation();

            chooseBossAttack();

            updateBossBullets();
            updateBossLaser();

            checkBossCollision();

            checkBossBulletHit();
            checkBossLaserHit();
        }

        // NORMAL WAVE
        else {
            spawnEnemy();

            updateEnemies();
            updateAlienAnimation();

            enemyShoot();

            checkCollision();
            checkWaveCleared();
        }

        checkPlayerHit();
    }

    updateWaveTransition();


    // DRAW EVERYTHING
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();

    drawPlayer();
    drawBullets();

    drawEnemies();
    drawBossLaserWarning();
    drawBossLaser();

    drawBossBullets();
    drawBoss();

    drawEnemyBullet();
    drawExplosion();

    drawScore();
    drawLives();
    drawHighScore();
    drawWave();

    drawBossHealth();


    // STAGE TRANSITION MESSAGE
    if (waveTransition) {
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "STAGE " + (wave + 1),
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.textAlign = "left";
    }


    requestAnimationFrame(gameLoop);
}

function restartGame() {
    score = 0;
    wave = 10; // change back to 1 later
    lives = 3;

    gameOver = false;
    paused = false;

    waveTransition = false;
    waveTransitionTimer = 0;

    playerX = 280;
    playerY = 640;

    bullets = [];
    bossBullets = [];

    enemyBullet.active = false;

    explosion.active = false;
    explosion.timer = 0;

    startWave();

    restartButton.style.display = "none";

}

restartButton.addEventListener("click", restartGame);

createStars();
startWave();
gameLoop();