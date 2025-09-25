import * as PIXI from 'pixi.js';
import { Scene } from './scene';

export class SceneManager {
    private app: PIXI.Application;
    private currentScene: Scene | null = null;
    private scenes: Map<string, () => Scene> = new Map();

    constructor(app: PIXI.Application) {
        this.app = app;
    }

    // シーンを登録
    registerScene(name: string, sceneFactory: () => Scene): void {
        this.scenes.set(name, sceneFactory);
    }

    // シーンを切り替え
    async switchScene(name: string, data?: any): Promise<void> {
        // 現在のシーンを終了
        if (this.currentScene) {
            this.currentScene.destroy();
            this.app.stage.removeChild(this.currentScene.getContainer());
        }

        // 新しいシーンを作成・開始
        const sceneFactory = this.scenes.get(name);
        if (!sceneFactory) {
            throw new Error(`Scene '${name}' not found`);
        }

        this.currentScene = sceneFactory();
        
        // GameSceneの場合はデータを設定
        if (name === 'game' && data) {
            const gameScene = this.currentScene as any;
            if (data.chartIndex !== undefined) {
                gameScene.setChartIndex(data.chartIndex);
            }
            if (data.musicId) {
                await gameScene.loadChartById(data.musicId);
            }
        }
        
        await this.currentScene.start();
        this.app.stage.addChild(this.currentScene.getContainer());
    }

    // フレームごとの更新
    update(deltaTime: number): void {
        if (this.currentScene) {
            this.currentScene.update(deltaTime);
        }
    }

    // 現在のシーン名を取得（デバッグ用）
    getCurrentScene(): Scene | null {
        return this.currentScene;
    }
}
