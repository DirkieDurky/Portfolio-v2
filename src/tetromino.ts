const actionIntervalTime = 250;

class Tetromino {
    public static activeTetrominos: Tetromino[] = [];
    private static tetrominoBag: Generator = Tetromino.bag();
    private static lastX = -1;

    public piece: TetrominoConstant;
    public x: number;
    public y: number;
    public rotation: number;

    private actionInterval: number | null = null;
    private actionSequence: Actions[] = [];
    private actionStartIndex: number;
    private actionStarted: boolean;
    private actionPaused: boolean;

    constructor(piece: TetrominoConstant, x: number, y: number, rotation: number) {
        this.x = x;
        this.y = y;
        this.piece = piece;
        this.rotation = rotation;
        this.actionStartIndex = Math.floor(Math.random() * (Background.canvasRowCount * .75) + Background.canvasRowCount * .25);
        this.actionStarted = false;
        this.actionPaused = false;

        for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
            this.actionSequence.push(Actions.Rotate);
        }
        const moveDirection: Actions = Math.floor(Math.random() * 2) == 0 ? Actions.MoveLeft : Actions.MoveRight
        for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
            this.actionSequence.push(moveDirection);
        }
        shuffle(this.actionSequence);
    }

    public static spawnPiece() {
        let x: number = -1;

        if (Tetromino.activeTetrominos.length > 0) {
            let scores: [xPos: number, score: number][] = [];
            for (let canvasX = 4; canvasX < Background.canvasColumnCount; canvasX++) {
                let distances: [xPos: number, distance: number][] = [];
                for (let i = 0; i < Tetromino.activeTetrominos.length; i++) {
                    distances.push([i, Math.abs(canvasX - Tetromino.activeTetrominos[i].x) + Tetromino.activeTetrominos[i].y]);
                }
                distances = distances.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
                distances[0][1] *= 1000;
                if (distances.length > 1) distances[1][1] *= 500;
                if (distances.length > 2) distances[2][1] *= 200;

                let distanceSum = 0;
                for (let distance of distances) {
                    distanceSum += distance[1];
                }

                scores.push([canvasX, distanceSum]);
            }

            //Set x to the coordinate with the highest score
            let bestX = -1;
            let highestDistance = 0;
            for (let score of scores) {
                if (score[1] > highestDistance) { highestDistance = score[1]; bestX = score[0] };
            }

            x = bestX;
        } else {
            x = Math.floor(Math.random() * (Background.canvasColumnCount - 4)) + 4;
        }

        if (!xTooClose()) {
            Tetromino.activeTetrominos.push(new Tetromino(Tetromino.tetrominoBag.next().value, x, 0, Math.floor(Math.random() * 3)));
        }

        function xTooClose(): boolean {
            for (let tetromino of Tetromino.activeTetrominos) {
                if (tetromino.y + Math.abs(tetromino.x - x) < 10) {
                    return true;
                }
            }
            return false;
        }
    }

    public static fallAll() {
        for (let i = Tetromino.activeTetrominos.length - 1; i >= 0; i--) {
            let tetromino = Tetromino.activeTetrominos[i];
            tetromino.fall();
        }
        Background.render();
    }

    public pauseAction() {
        if (this.actionInterval == null) return;
        clearInterval(this.actionInterval);
        this.actionPaused = true;
    }

    public unpauseAction() {
        if (!this.actionPaused) return;

        this.actionInterval = setInterval(() => {
            this.executeActionStep();
        }, actionIntervalTime);

        this.actionPaused = false;
    }

    private fall() {
        this.y++;

        if (!Background.startAnimationPlaying && this.y > this.actionStartIndex) {
            if (!this.actionStarted) {
                this.actionStarted = true;
                this.actionInterval = setInterval(() => {
                    this.executeActionStep();
                }, actionIntervalTime);
            }
        }

        if (this.y >= Background.canvasRowCount + 4) {
            Tetromino.activeTetrominos.splice(Tetromino.activeTetrominos.indexOf(this), 1);
        }
    }

    private executeActionStep() {
        if (this.actionSequence.length < 1) {
            clearInterval(this.actionInterval!);
            return;
        }
        switch (this.actionSequence.pop()) {
            case Actions.MoveLeft: {
                this.moveLeft();
                break;
            }
            case Actions.MoveRight: {
                this.moveRight();
                break;
            }
            case Actions.Rotate: {
                this.rotate();
                break;
            }
        }
        Background.render();
    }

    private moveLeft() {
        if (!this.checkSafe(this.x - 1, this.y)) return
        this.x--;
    }

    private moveRight() {
        if (!this.checkSafe(this.x + 1, this.y)) return
        this.x++;
    }

    private checkSafe(x: number, y: number) {
        //Check if there are any other tetrominos in the way of where I want to go
        const tetrominosFound = Tetromino.activeTetrominos.filter(t =>
            t.x <= x + 4 &&
            t.x >= x - 4 &&
            t.y <= y + 4 &&
            t.y >= y - 4);
        //This should be 2 because we don't want to include ourselves
        return tetrominosFound.length < 2;
    }

    private rotate() {
        this.rotation = (this.rotation + 1) % 4;
    }

    private static *bag() {
        let bag: TetrominoConstant[] = [];
        let lastPieces: TetrominoConstant[] = [];
        while (true) {
            if (bag.length < 1) {
                TetrominoConstants.forEach(tetromino => bag.push(tetromino));
                shuffle(bag);
                for (let delayPiece of lastPieces) {
                    let indexOf = bag.indexOf(delayPiece);
                    if (indexOf < 3) {
                        bag.splice(indexOf, 1);
                        bag.push(delayPiece);
                    }
                }
                lastPieces = bag.slice(Math.max(bag.length - 3, 0));
            }
            let piece = bag[0];
            bag.splice(bag.indexOf(piece), 1);
            yield piece;
        }
    }
}

enum Actions {
    Rotate,
    MoveLeft,
    MoveRight,
}