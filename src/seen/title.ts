import * as PIXI from 'pixi.js';
import { Scene } from '../scene';

export class TitleScene extends Scene {
    private titleText!: PIXI.Text;
    private startButton!: PIXI.Container;
    private onSceneChange!: (sceneName: string) => void;

    constructor(app: PIXI.Application, onSceneChange: (sceneName: string) => void) {
        super(app);
        this.onSceneChange = onSceneChange;
    }

    async start(): Promise<void> {
        // タイトルテキスト
        this.titleText = new PIXI.Text({
            text: 'リズムゲーム',
            style: {
                fontSize: 48,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.titleText.x = 400 - this.titleText.width / 2;
        this.titleText.y = 200;
        this.container.addChild(this.titleText);

        // スタートボタン
        this.startButton = new PIXI.Container();
        
        const buttonBg = new PIXI.Graphics();
        buttonBg.roundRect(0, 0, 200, 60, 10).fill(0x333333).stroke({width: 2, color: 0xffffff});
        this.startButton.addChild(buttonBg);

        const buttonText = new PIXI.Text({
            text: 'START',
            style: {
                fontSize: 24,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        buttonText.x = 100 - buttonText.width / 2;
        buttonText.y = 30 - buttonText.height / 2;
        this.startButton.addChild(buttonText);

        this.startButton.x = 400 - 100;
        this.startButton.y = 350;
        
        // ボタンをインタラクティブにする
        this.startButton.eventMode = 'static';
        this.startButton.cursor = 'pointer';
        this.startButton.on('pointerdown', () => {
            this.onSceneChange('select');
        });

        this.container.addChild(this.startButton);

        // 説明テキスト
        const instructionText = new PIXI.Text({
            text: 'STARTボタンをクリックして始めよう！',
            style: {
                fontSize: 18,
                fill: 0xcccccc
            }
        });
        instructionText.x = 400 - instructionText.width / 2;
        instructionText.y = 450;
        this.container.addChild(instructionText);
    }

    destroy(): void {
        // リスナーを削除
        this.startButton?.off('pointerdown');
        // コンテナの子要素はPIXIが自動的にクリーンアップ
    }
}