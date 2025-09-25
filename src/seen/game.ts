import * as PIXI from 'pixi.js';
import { Scene } from '../scene';
import { ChartLoader } from '../chart/chartLoader';
import { Chart, Note, Hold } from '../note/type';

interface GameNote {
    graphic: PIXI.Graphics;
    noteData: Note;
    startTime: number;
}

interface GameHold {
    bodyGraphic: PIXI.Graphics;
    endGraphic: PIXI.Graphics;
    holdData: Hold;
    startTime: number;
    isActive: boolean;
    isStartHit: boolean;
    holdProgress: number; // 0-1の値で、どこまでホールドが消化されたか
    originalBodyHeight: number; // オリジナルのボディの高さを保存
    keyHeldDown: boolean; // キーが現在押されているかどうか
    positionY: number; // ボディの基準Y座標
    scoreAwarded: boolean; // スコアが既に加算されたかのフラグ
}

export class GameScene extends Scene {
    private lines!: PIXI.Graphics[];
    private laneLines!: PIXI.Graphics[];
    private gameNotes: GameNote[] = [];
    private gameHolds: GameHold[] = [];
    private score: number = 0;
    private scoreText!: PIXI.Text;
    private gameTimer: number = 0;
    private gameDuration: number = 15; // デフォルト15秒（BGMがあれば上書きされる）
    private onSceneChange!: (sceneName: string, data?: any) => void;
    private chart: Chart | null = null;
    private chartIndex: number = 0;
    private gameStartTime: number = 0;
    private keyLabels: PIXI.Text[] = [];
    private keysHeld: boolean[] = [false, false, false, false]; // 各レーンのキー状態
    
    // 音声関連
    private normalSound!: HTMLAudioElement;
    private criticalSound!: HTMLAudioElement;
    private bgmSound!: HTMLAudioElement;

    // コンボと判定関連
    private combo: number = 0;
    private comboText!: PIXI.Text;
    private judgmentText!: PIXI.Text;
    private hitEffects: PIXI.Container[] = [];
    private timeText!: PIXI.Text;

    // 楽曲ID関連
    private musicId: string | null = null;

    // ローディング関連
    private isLoading: boolean = false;
    private loadingOverlay!: PIXI.Container;
    private loadingText!: PIXI.Text;
    private gameReady: boolean = false;

    // レーン設定
    private readonly LANE_COUNT = 4;
    private readonly LANE_WIDTH = 150;
    private readonly LANE_START_X = 100;
    private readonly JUDGMENT_LINE_Y = 550;
    private readonly NOTE_SPEED = 400; // ピクセル/秒

    constructor(app: PIXI.Application, onSceneChange: (sceneName: string, data?: any) => void) {
        super(app);
        this.onSceneChange = onSceneChange;
    }

    async start(): Promise<void> {
        // ゲーム画面のUI
        this.setupUI();
        
        // 4レーンの判定ラインとレーン区切り線を作成
        this.setupLanes();

        // キーボードイベントの設定
        this.setupKeyboardEvents();

        // 楽曲IDがある場合はローディングを表示
        if (this.musicId) {
            this.showLoadingOverlay();
            // BGMの読み込み完了を待つ
            await this.waitForGameReady();
        } else {
            // サンプル譜面の場合はすぐに開始
            this.gameReady = true;
        }

        // 音声の準備
        this.setupSounds();

        // ローディングを非表示
        if (this.isLoading) {
            this.hideLoadingOverlay();
        }

        // ゲーム開始時間を記録
        this.gameStartTime = Date.now();

        // BGMを開始
        this.startBGM();
    }

    private async waitForGameReady(): Promise<void> {
        // BGMが既に読み込まれている場合は即座に完了
        if (this.bgmSound && this.bgmSound.readyState >= 3) {
            return;
        }

        // BGMの読み込み完了を待つ
        return new Promise((resolve) => {
            if (!this.bgmSound) {
                resolve();
                return;
            }

            const onCanPlay = () => {
                this.bgmSound.removeEventListener('canplaythrough', onCanPlay);
                this.bgmSound.removeEventListener('error', onError);
                resolve();
            };

            const onError = () => {
                console.warn('BGM load failed, continuing without BGM');
                this.bgmSound.removeEventListener('canplaythrough', onCanPlay);
                this.bgmSound.removeEventListener('error', onError);
                resolve();
            };

            if (this.bgmSound.readyState >= 3) {
                resolve();
            } else {
                this.bgmSound.addEventListener('canplaythrough', onCanPlay);
                this.bgmSound.addEventListener('error', onError);
                
                // タイムアウト（10秒後に諦める）
                setTimeout(() => {
                    console.warn('BGM load timeout, continuing without BGM');
                    this.bgmSound.removeEventListener('canplaythrough', onCanPlay);
                    this.bgmSound.removeEventListener('error', onError);
                    resolve();
                }, 10000);
            }
        });
    }

    private setupUI(): void {
        // スコア表示
        this.scoreText = new PIXI.Text({
            text: `Score: ${this.score}`,
            style: {
                fontSize: 24,
                fill: 0xffffff
            }
        });
        this.scoreText.x = 20;
        this.scoreText.y = 20;
        this.container.addChild(this.scoreText);

        // 操作説明
        const instructionText = new PIXI.Text({
            text: 'ボタンを押してノーツを叩こう！',
            style: {
                fontSize: 18,
                fill: 0xcccccc
            }
        });
        instructionText.x = 400 - instructionText.width / 2;
        instructionText.y = 20;
        this.container.addChild(instructionText);

        // コンボ表示
        this.comboText = new PIXI.Text({
            text: `Combo: ${this.combo}`,
            style: {
                fontSize: 32,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.comboText.x = 600;
        this.comboText.y = 20;
        this.container.addChild(this.comboText);

        // 判定表示（中央上部）
        this.judgmentText = new PIXI.Text({
            text: '',
            style: {
                fontSize: 48,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.judgmentText.x = 400;
        this.judgmentText.y = 200;
        this.judgmentText.anchor.set(0.5);
        this.container.addChild(this.judgmentText);

        // 時間表示
        this.timeText = new PIXI.Text({
            text: `Time: ${Math.ceil(this.gameDuration - this.gameTimer)}`,
            style: {
                fontSize: 24,
                fill: 0xffffff
            }
        });
        this.timeText.x = 600;
        this.timeText.y = 60;
        this.container.addChild(this.timeText);
    }

    private showLoadingOverlay(): void {
        // ローディングオーバーレイの作成
        this.loadingOverlay = new PIXI.Container();
        
        // 半透明の背景
        const overlay = new PIXI.Graphics();
        overlay.rect(0, 0, 800, 600).fill(0x000000);
        overlay.alpha = 0.8;
        this.loadingOverlay.addChild(overlay);

        // ローディングテキスト
        this.loadingText = new PIXI.Text({
            text: 'Loading...',
            style: {
                fontSize: 36,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.loadingText.x = 400 - this.loadingText.width / 2;
        this.loadingText.y = 300 - this.loadingText.height / 2;
        this.loadingOverlay.addChild(this.loadingText);

        // 楽曲情報表示
        if (this.musicId) {
            const musicInfoText = new PIXI.Text({
                text: 'Preparing music...',
                style: {
                    fontSize: 18,
                    fill: 0xcccccc
                }
            });
            musicInfoText.x = 400 - musicInfoText.width / 2;
            musicInfoText.y = 350;
            this.loadingOverlay.addChild(musicInfoText);
        }

        this.container.addChild(this.loadingOverlay);
        this.isLoading = true;
    }

    private hideLoadingOverlay(): void {
        if (this.loadingOverlay && this.container.children.includes(this.loadingOverlay)) {
            this.container.removeChild(this.loadingOverlay);
        }
        this.isLoading = false;
        this.gameReady = true;
    }

    private setupLanes(): void {
        this.lines = [];
        this.laneLines = [];
        this.keyLabels = [];

        // 判定ライン（4レーン分）
        for (let i = 0; i < this.LANE_COUNT; i++) {
            const line = new PIXI.Graphics();
            const x = this.LANE_START_X + i * this.LANE_WIDTH;
            line.rect(x, this.JUDGMENT_LINE_Y, this.LANE_WIDTH, 5).fill(0xffffff);
            this.lines.push(line);
            this.container.addChild(line);
        }

        // レーン区切り線
        for (let i = 0; i <= this.LANE_COUNT; i++) {
            const laneLine = new PIXI.Graphics();
            const x = this.LANE_START_X + i * this.LANE_WIDTH;
            laneLine.rect(x, 0, 2, 600).fill(0x666666);
            this.laneLines.push(laneLine);
            this.container.addChild(laneLine);
        }

        // キーラベル表示
        const keyNames = ['D', 'F', 'J', 'K'];
        for (let i = 0; i < this.LANE_COUNT; i++) {
            const keyLabel = new PIXI.Text({
                text: keyNames[i],
                style: {
                    fontSize: 32,
                    fill: 0xffffff,
                    fontWeight: 'bold'
                }
            });
            keyLabel.x = this.LANE_START_X + i * this.LANE_WIDTH + this.LANE_WIDTH / 2 - keyLabel.width / 2;
            keyLabel.y = this.JUDGMENT_LINE_Y + 20;
            this.keyLabels.push(keyLabel);
            this.container.addChild(keyLabel);
        }
    }

    private setupKeyboardEvents(): void {
        const handleKeyPress = (event: KeyboardEvent) => {
            let lane = -1;
            switch (event.code) {
                case 'KeyD': lane = 0; break;
                case 'KeyF': lane = 1; break;
                case 'KeyJ': lane = 2; break;
                case 'KeyK': lane = 3; break;
            }
            
            if (lane >= 0 && !this.keysHeld[lane]) {
                event.preventDefault();
                this.keysHeld[lane] = true;
                this.hitNote(lane);
                this.animateKeyPress(lane);
            }
        };

        const handleKeyRelease = (event: KeyboardEvent) => {
            let lane = -1;
            switch (event.code) {
                case 'KeyD': lane = 0; break;
                case 'KeyF': lane = 1; break;
                case 'KeyJ': lane = 2; break;
                case 'KeyK': lane = 3; break;
            }
            
            if (lane >= 0) {
                event.preventDefault();
                this.keysHeld[lane] = false;
                this.releaseHold(lane);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('keyup', handleKeyRelease);
        
        // シーンが終了するときにリスナーを削除するために保存
        (this as any).keydownHandler = handleKeyPress;
        (this as any).keyupHandler = handleKeyRelease;
    }

    private setupSounds(): void {
        // Normal音声の準備
        this.normalSound = new Audio('/assets/sound/normal.mp3');
        this.normalSound.volume = 0.7;
        this.normalSound.preload = 'auto';

        // Critical音声の準備
        this.criticalSound = new Audio('/assets/sound/critical.mp3');
        this.criticalSound.volume = 0.8;
        this.criticalSound.preload = 'auto';

        // BGM音声の準備（楽曲IDがある場合）
        if (this.musicId) {
            this.bgmSound = new Audio(`/charts/${this.musicId}/${this.musicId}.mp3`);
            this.bgmSound.volume = 0.5;
            this.bgmSound.preload = 'auto';
            this.bgmSound.autoplay = false; // 自動再生を明示的に無効化
        }
    }

    private playHitSound(noteType: 'normal' | 'critical'): void {
        try {
            if (noteType === 'critical') {
                // Criticalサウンドを再生
                this.criticalSound.currentTime = 0; // 再生位置をリセット
                this.criticalSound.play();
            } else {
                // Normalサウンドを再生
                this.normalSound.currentTime = 0; // 再生位置をリセット
                this.normalSound.play();
            }
        } catch (error) {
            // 音声再生エラーは無視（ブラウザの制限など）
            console.warn('Sound play failed:', error);
        }
    }

    private animateKeyPress(lane: number): void {
        // キーを押したときのアニメーション
        if (this.keyLabels[lane]) {
            this.keyLabels[lane].style.fill = 0xffff00;
            setTimeout(() => {
                if (this.keyLabels[lane]) {
                    this.keyLabels[lane].style.fill = 0xffffff;
                }
            }, 100);
        }
    }

    private spawnNote(noteData: Note): void {
        const note = new PIXI.Graphics();
        const x = this.LANE_START_X + noteData.position * this.LANE_WIDTH + 10;
        const width = this.LANE_WIDTH - 20;
        const height = 20;
        
        // ノートタイプによって色を変える
        const color = noteData.type === 'critical' ? 0xfff200 : 0x00ffff;
        note.rect(0, 0, width, height).fill(color);
        note.x = x;
        note.y = -height;
        
        const gameNote: GameNote = {
            graphic: note,
            noteData: noteData,
            startTime: Date.now()
        };
        
        this.gameNotes.push(gameNote);
        this.container.addChild(note);
    }

    private hitNote(lane: number): void {
        // 通常ノートの判定
        for (let i = this.gameNotes.length - 1; i >= 0; i--) {
            const gameNote = this.gameNotes[i];
            
            if (gameNote.noteData.position !== lane) continue;
            
            const distance = Math.abs(gameNote.graphic.y - this.JUDGMENT_LINE_Y);

            if (distance < 50) { // 判定範囲内
                // ノートを削除
                this.container.removeChild(gameNote.graphic);
                this.gameNotes.splice(i, 1);
                
                // スコア加算と判定
                let points = 0;
                let hitType: 'normal' | 'critical' = 'normal';
                let judgment = '';
                let judgmentColor = 0xffffff;
                
                if (distance < 20) {
                    points = gameNote.noteData.type === 'critical' ? 200 : 100;
                    hitType = gameNote.noteData.type === 'critical' ? 'critical' : 'normal';
                    judgment = 'JUST';
                    judgmentColor = 0x00ff00;
                } else if (distance < 34) {
                    points = gameNote.noteData.type === 'critical' ? 150 : 75;
                    hitType = gameNote.noteData.type === 'critical' ? 'critical' : 'normal';
                    judgment = 'GREAT';
                    judgmentColor = 0xffff00;
                } else {
                    points = gameNote.noteData.type === 'critical' ? 100 : 50;
                    hitType = gameNote.noteData.type === 'critical' ? 'critical' : 'normal';
                    judgment = 'GOOD';
                    judgmentColor = 0xff8800;
                }
                
                // コンボ増加
                this.combo++;
                
                this.score += points;
                this.updateScore();
                this.updateCombo();
                
                // 判定表示とエフェクト
                this.showJudgment(judgment, judgmentColor);
                this.createHitEffect(lane, judgment);
                
                // 音声再生（missでない場合のみ）
                this.playHitSound(hitType);
                
                // このノートがホールドノートの始点かチェック
                this.checkHoldStart(lane, gameNote.noteData.time);
                return;
            }
        }
    }

    private checkHoldStart(lane: number, noteTime: number): void {
        // ホールドノートの開始判定
        for (const gameHold of this.gameHolds) {
            if (gameHold.holdData.position === lane && !gameHold.isStartHit) {
                // タップしたノートの時間がホールドの開始時間と一致するかチェック
                if (gameHold.holdData.startTime === noteTime) {
                    gameHold.isStartHit = true;
                    gameHold.isActive = this.keysHeld[lane];
                    gameHold.keyHeldDown = this.keysHeld[lane];
                    // ホールド開始時にボディの下端位置を判定線に合わせる
                    gameHold.positionY = this.JUDGMENT_LINE_Y - gameHold.originalBodyHeight;
                    break;
                }
            }
        }
    }

    private releaseHold(lane: number): void {
        // アクティブなホールドノートを非アクティブにする
        for (const gameHold of this.gameHolds) {
            if (gameHold.holdData.position === lane && gameHold.isStartHit) {
                gameHold.isActive = false;
                gameHold.keyHeldDown = false;
                break;
            }
        }
    }

    private updateScore(): void {
        this.scoreText.text = `Score: ${this.score}`;
    }

    private updateCombo(): void {
        this.comboText.text = `Combo: ${this.combo}`;
    }

    private showJudgment(judgment: string, color: number): void {
        this.judgmentText.text = judgment;
        this.judgmentText.style.fill = color;
        this.judgmentText.alpha = 1;

        // アニメーション: フェードアウト
        const fadeOut = () => {
            this.judgmentText.alpha -= 0.05;
            if (this.judgmentText.alpha <= 0) {
                this.judgmentText.text = '';
                this.judgmentText.alpha = 1;
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        setTimeout(() => fadeOut(), 500);
    }

    private createHitEffect(lane: number, judgment: string): void {
        const effect = new PIXI.Container();
        const x = this.LANE_START_X + lane * this.LANE_WIDTH + this.LANE_WIDTH / 2;
        const y = this.JUDGMENT_LINE_Y;

        // エフェクトの背景円
        const circle = new PIXI.Graphics();
        let color = 0xffffff;
        if (judgment === 'JUST') color = 0x00ff00;
        else if (judgment === 'GREAT') color = 0xffff00;
        else if (judgment === 'GOOD') color = 0xff8800;

        circle.circle(0, 0, 30).fill(color);
        circle.alpha = 0.7;
        effect.addChild(circle);

        // エフェクトテキスト
        const effectText = new PIXI.Text({
            text: judgment,
            style: {
                fontSize: 20,
                fill: color,
                fontWeight: 'bold'
            }
        });
        effectText.anchor.set(0.5);
        effectText.y = -5;
        effect.addChild(effectText);

        effect.x = x;
        effect.y = y;
        this.container.addChild(effect);
        this.hitEffects.push(effect);

        // アニメーション: 上昇しながらフェードアウト
        let animationFrame = 0;
        const animate = () => {
            animationFrame++;
            effect.y -= 2;
            effect.alpha -= 0.03;
            effect.scale.set(1 + animationFrame * 0.02);

            if (effect.alpha <= 0 || animationFrame > 60) {
                this.container.removeChild(effect);
                const index = this.hitEffects.indexOf(effect);
                if (index > -1) {
                    this.hitEffects.splice(index, 1);
                }
            } else {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    update(deltaTime: number): void {
        // ゲームが準備完了でない場合、または時間表示が初期化されていない場合は更新をスキップ
        if (!this.gameReady || !this.timeText) {
            return;
        }

        this.gameTimer += deltaTime / 60; // 60FPSベース
        const currentTime = Date.now() - this.gameStartTime;

        // 時間表示を更新
        const remainingTime = Math.max(0, Math.ceil(this.gameDuration - this.gameTimer));
        this.timeText.text = `Time: ${remainingTime}`;

        // 譜面からノートを生成
        this.spawnNotesFromChart(currentTime);

        // ノートの更新
        for (let i = this.gameNotes.length - 1; i >= 0; i--) {
            const gameNote = this.gameNotes[i];
            gameNote.graphic.y += this.NOTE_SPEED * deltaTime / 60;

            // 画面外に出たノートを削除（MISS判定）
            if (gameNote.graphic.y > 650) {
                // MISS処理
                if (this.combo > 0) {
                    this.combo = 0;
                    this.updateCombo();
                    this.showJudgment('MISS', 0xff0000);
                }
                
                this.container.removeChild(gameNote.graphic);
                this.gameNotes.splice(i, 1);
            }
        }

        // ホールドノートの更新
        for (let i = this.gameHolds.length - 1; i >= 0; i--) {
            const gameHold = this.gameHolds[i];
            
            // 常にエンドグラフィックは移動
            gameHold.endGraphic.y += this.NOTE_SPEED * deltaTime / 60;
            
            if (!gameHold.isStartHit) {
                // まだ始点がヒットされていない場合は通常通り移動
                gameHold.positionY += this.NOTE_SPEED * deltaTime / 60;
            } else {
                // 始点がヒットされた後の処理
                gameHold.keyHeldDown = this.keysHeld[gameHold.holdData.position];
                gameHold.isActive = gameHold.keyHeldDown;
                
                // ホールドが開始されたら位置を固定（判定線の上端に）
                gameHold.positionY = this.JUDGMENT_LINE_Y - gameHold.originalBodyHeight;
                
                // 進行度を更新
                this.updateHoldProgress(gameHold, deltaTime);
            }

            // ボディの描画位置を毎フレーム positionY に同期
            gameHold.bodyGraphic.y = gameHold.positionY;

            // ホールドノートの削除判定
            // 長いホールドノートが途中で消えないよう、endTimeに到達した場合のみ削除
            const shouldRemove = currentTime >= gameHold.holdData.endTime + 100; // 少し余裕を持たせる
            
            if (shouldRemove) {
                this.container.removeChild(gameHold.bodyGraphic);
                this.container.removeChild(gameHold.endGraphic);
                this.gameHolds.splice(i, 1);
            }
        }

        // ゲーム終了判定
        if (this.gameTimer >= this.gameDuration) {
            this.endGame();
        }
    }

    private spawnNotesFromChart(currentTime: number): void {
        if (!this.chart) return;

        // 通常ノートのスポーン
        for (const note of this.chart.notes) {
            const spawnTime = note.time - (this.JUDGMENT_LINE_Y / this.NOTE_SPEED * 1000);
            if (currentTime >= spawnTime && currentTime <= spawnTime + 100) {
                // まだスポーンしていないノートかチェック
                const alreadySpawned = this.gameNotes.some(gn => 
                    gn.noteData.time === note.time && gn.noteData.position === note.position
                );
                if (!alreadySpawned) {
                    this.spawnNote(note);
                }
            }
        }

        // ホールドノートのスポーン
        for (const hold of this.chart.holds) {
            const spawnTime = hold.startTime - (this.JUDGMENT_LINE_Y / this.NOTE_SPEED * 1000);
            if (currentTime >= spawnTime && currentTime <= spawnTime + 100) {
                const alreadySpawned = this.gameHolds.some(gh => 
                    gh.holdData.startTime === hold.startTime && gh.holdData.position === hold.position
                );
                if (!alreadySpawned) {
                    // ホールドの始点をタップノートとしてスポーン
                    const startNote: Note = {
                        time: hold.startTime,
                        type: hold.type,
                        position: hold.position
                    };
                    this.spawnNote(startNote);
                    
                    // ホールドのボディとエンドをスポーン
                    this.spawnHold(hold);
                }
            }
        }
    }

    private spawnHold(holdData: Hold): void {
        const x = this.LANE_START_X + holdData.position * this.LANE_WIDTH + 10;
        const width = this.LANE_WIDTH - 20;
        const duration = holdData.endTime - holdData.startTime;
        const bodyHeight = (duration / 1000) * this.NOTE_SPEED;

        // ホールドボディ
        const body = new PIXI.Graphics();
        const bodyColor = holdData.type === 'critical' ? 0xf0ff66 : 0x66ffff;
        body.rect(0, 0, width, bodyHeight).fill(bodyColor);
        body.x = x;
        body.y = -bodyHeight;

        // ホールドエンド
        const end = new PIXI.Graphics();
        const endColor = holdData.type === 'critical' ? 0xffcf66 : 0x66ffc4;
        end.rect(0, 0, width, 20).fill(endColor);
        end.x = x;
        end.y = -20;

        const gameHold: GameHold = {
            bodyGraphic: body,
            endGraphic: end,
            holdData: holdData,
            startTime: Date.now(),
            isActive: false,
            isStartHit: false,
            holdProgress: 0.0,
            originalBodyHeight: bodyHeight,
            keyHeldDown: false,
            positionY: -bodyHeight, // 初期位置をセット
            scoreAwarded: false // スコア未加算状態で初期化
        };

        this.gameHolds.push(gameHold);
        this.container.addChild(body);
        this.container.addChild(end);
    }

    private updateHoldProgress(gameHold: GameHold, deltaTime: number): void {
        // ゲーム開始からの経過時間を取得
        const currentTime = Date.now() - this.gameStartTime;
        
        // ホールドノートの情報
        const holdStartTime = gameHold.holdData.startTime;
        const holdEndTime = gameHold.holdData.endTime;
        const duration = holdEndTime - holdStartTime;
        
        // ボディの描画
        const width = this.LANE_WIDTH - 20;
        
        // ボディを再描画
        gameHold.bodyGraphic.clear();
        const bodyColor = gameHold.holdData.type === 'critical' ? 0xf0ff66 : 0x66ffff;
        
        if (gameHold.isActive && currentTime >= holdStartTime) {
            // キーが押されている間：実際の時間経過に基づいて消費
            // ホールドが始まってからの経過時間
            const elapsedSinceStart = currentTime - holdStartTime;
            const progressRatio = Math.max(0, Math.min(1, elapsedSinceStart / duration));
            gameHold.holdProgress = progressRatio;
            
            // 上から徐々に消費される視覚効果
            const consumedHeight = gameHold.originalBodyHeight * progressRatio;
            const remainingHeight = gameHold.originalBodyHeight - consumedHeight;
            
            if (remainingHeight > 0) {
                // 残りの部分を描画（上の消費された部分は描画しない）
                gameHold.bodyGraphic.rect(0, consumedHeight, width, remainingHeight).fill(bodyColor);
            }
        } else {
            // キーが離されている間、またはまだ始まっていない場合：フル描画
            gameHold.bodyGraphic.rect(0, 0, width, gameHold.originalBodyHeight).fill(bodyColor);
            
            // キーが離されている場合は進行度を更新しない（時間は止まる）
            if (gameHold.isStartHit && currentTime >= holdStartTime) {
                const elapsedSinceStart = currentTime - holdStartTime;
                gameHold.holdProgress = Math.max(0, Math.min(1, elapsedSinceStart / duration));
            }
        }

        // ホールド完了時のスコア加算（endTimeに到達したとき）
        if (currentTime >= holdEndTime && !gameHold.scoreAwarded) {
            const holdScore = gameHold.holdData.type === 'critical' ? 300 : 150;
            this.score += holdScore;
            this.updateScore();
            gameHold.scoreAwarded = true; // スコア加算済みフラグを立てる
        }
    }

    private endGame(): void {
        this.onSceneChange('result', { score: this.score });
    }

    destroy(): void {
        // キーボードイベントリスナーを削除
        if ((this as any).keydownHandler) {
            document.removeEventListener('keydown', (this as any).keydownHandler);
        }
        if ((this as any).keyupHandler) {
            document.removeEventListener('keyup', (this as any).keyupHandler);
        }
        
        // ノートをクリーンアップ
        this.gameNotes.forEach(gameNote => {
            this.container.removeChild(gameNote.graphic);
        });
        this.gameNotes = [];

        // ホールドノートをクリーンアップ
        this.gameHolds.forEach(gameHold => {
            this.container.removeChild(gameHold.bodyGraphic);
            this.container.removeChild(gameHold.endGraphic);
        });
        this.gameHolds = [];

        // ヒットエフェクトをクリーンアップ
        this.hitEffects.forEach(effect => {
            this.container.removeChild(effect);
        });
        this.hitEffects = [];

        // BGMを停止
        this.stopBGM();
    }

    // chartIndexを設定するメソッドを追加
    setChartIndex(chartIndex: number): void {
        this.chartIndex = chartIndex;
        this.chart = ChartLoader.getChart(chartIndex);
    }

    // 楽曲IDを設定するメソッドを追加
    setMusicId(musicId: string): void {
        this.musicId = musicId;
    }

    // 楽曲IDベースでチャートを読み込むメソッド
    async loadChartById(musicId: string): Promise<void> {
        this.musicId = musicId;
        this.chart = await ChartLoader.getChartById(musicId);
        
        // BGM音声の準備
        if (this.musicId) {
            this.bgmSound = new Audio(`/charts/${this.musicId}/${this.musicId}.mp3`);
            this.bgmSound.volume = 0.5;
            this.bgmSound.preload = 'auto';
            this.bgmSound.autoplay = false; // 自動再生を明示的に無効化
            
            // BGMの読み込み完了を待つ
            await this.waitForBGMLoad();
        }
    }

    // BGMの読み込み完了を待つメソッド
    private waitForBGMLoad(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.bgmSound) {
                resolve();
                return;
            }

            const onCanPlayThrough = () => {
                // BGMの長さに合わせてゲーム時間を設定
                if (this.bgmSound.duration && this.bgmSound.duration > 0) {
                    this.gameDuration = this.bgmSound.duration;
                    console.log(`Game duration set to BGM duration: ${this.gameDuration} seconds`);
                }
                
                // 確実に再生を停止
                this.bgmSound.pause();
                this.bgmSound.currentTime = 0;
                
                this.bgmSound.removeEventListener('canplaythrough', onCanPlayThrough);
                this.bgmSound.removeEventListener('error', onError);
                resolve();
            };

            const onError = () => {
                console.warn('BGM load failed, using default duration');
                this.bgmSound.removeEventListener('canplaythrough', onCanPlayThrough);
                this.bgmSound.removeEventListener('error', onError);
                resolve(); // エラーでも続行
            };

            // BGMが既に読み込まれている場合
            if (this.bgmSound.readyState >= 3) { // HAVE_FUTURE_DATA
                onCanPlayThrough();
            } else {
                this.bgmSound.addEventListener('canplaythrough', onCanPlayThrough);
                this.bgmSound.addEventListener('error', onError);
                
                // タイムアウト設定（5秒後に諦める）
                setTimeout(() => {
                    console.warn('BGM load timeout, using default duration');
                    this.bgmSound.removeEventListener('canplaythrough', onCanPlayThrough);
                    this.bgmSound.removeEventListener('error', onError);
                    resolve();
                }, 5000);
            }
        });
    }

    // BGMを開始するメソッド
    private startBGM(): void {
        if (this.bgmSound) {
            try {
                // 確実に停止状態から開始
                this.bgmSound.pause();
                this.bgmSound.currentTime = 0;
                this.bgmSound.play();
                console.log('BGM started successfully');
            } catch (error) {
                console.warn('BGM play failed:', error);
            }
        }
    }

    // BGMを停止するメソッド
    private stopBGM(): void {
        if (this.bgmSound) {
            this.bgmSound.pause();
            this.bgmSound.currentTime = 0;
        }
    }
}