import * as PIXI from 'pixi.js';
import { Scene } from '../scene';

export class ResultScene extends Scene {
    private score: number;
    private missCount: number;
    private goodCount: number;
    private onSceneChange!: (sceneName: string) => void;

    constructor(app: PIXI.Application, onSceneChange: (sceneName: string) => void, score: number = 0, missCount: number = 0, goodCount: number = 0) {
        super(app);
        this.onSceneChange = onSceneChange;
        this.score = score;
        this.missCount = missCount;
        this.goodCount = goodCount;
    }

    async start(): Promise<void> {
        // 背景
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, 800, 600).fill(0x2c2c2c);
        this.container.addChild(bg);

        // リザルトタイトル
        const titleText = new PIXI.Text({
            text: 'RESULT',
            style: {
                fontSize: 48,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        titleText.x = 400 - titleText.width / 2;
        titleText.y = 100;
        this.container.addChild(titleText);

        // スコア表示
        const scoreText = new PIXI.Text({
            text: `Final Score: ${this.score}`,
            style: {
                fontSize: 36,
                fill: 0xffff00,
                fontWeight: 'bold'
            }
        });
        scoreText.x = 400 - scoreText.width / 2;
        scoreText.y = 200;
        this.container.addChild(scoreText);

        // ランク表示
        const rank = this.calculateRank(this.missCount, this.goodCount);
        const rankText = new PIXI.Text({
            text: `Rank: ${rank}`,
            style: {
                fontSize: 32,
                fill: this.getRankColor(rank),
                fontWeight: 'bold'
            }
        });
        rankText.x = 400 - rankText.width / 2;
        rankText.y = 280;
        this.container.addChild(rankText);

        // ボタン
        this.createButtons();
    }

    private createButtons(): void {
        // もう一度プレイボタン
        const retryButton = this.createButton('もう一度', 0x4CAF50);
        retryButton.x = 200;
        retryButton.y = 400;
        retryButton.eventMode = 'static';
        retryButton.cursor = 'pointer';
        retryButton.on('pointerdown', () => {
            this.onSceneChange('game');
        });
        this.container.addChild(retryButton);

        // 曲選択に戻るボタン
        const selectButton = this.createButton('曲選択', 0x2196F3);
        selectButton.x = 450;
        selectButton.y = 400;
        selectButton.eventMode = 'static';
        selectButton.cursor = 'pointer';
        selectButton.on('pointerdown', () => {
            this.onSceneChange('select');
        });
        this.container.addChild(selectButton);

        // 保存用にボタンの参照を保持
        (this as any).retryButton = retryButton;
        (this as any).selectButton = selectButton;
    }

    private createButton(text: string, color: number): PIXI.Container {
        const button = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 140, 60, 10)
            .fill(color)
            .stroke({ width: 2, color: 0xffffff });
        button.addChild(bg);

        const buttonText = new PIXI.Text({
            text: text,
            style: {
                fontSize: 18,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        buttonText.x = 70 - buttonText.width / 2;
        buttonText.y = 30 - buttonText.height / 2;
        button.addChild(buttonText);

        return button;
    }

    private calculateRank(miss: number, good: number): string {
        const totalBadJudgments = miss + good;

        if (totalBadJudgments <= 3) {
            return 'A';
        } else if (totalBadJudgments <= 20) {
            return 'B';
        } else {
            return 'C';
        }
    }

    private getRankColor(rank: string): number {
        switch (rank) {
            case 'A': return 0xFFD700; // ゴールド
            case 'B': return 0x00BFFF; // ブルー
            case 'C': return 0x32CD32; // グリーン
            default: return 0xffffff;
        }
    }

    destroy(): void {
        // ボタンのリスナーを削除
        if ((this as any).retryButton) {
            (this as any).retryButton.off('pointerdown');
        }
        if ((this as any).selectButton) {
            (this as any).selectButton.off('pointerdown');
        }
    }
}