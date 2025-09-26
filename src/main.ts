import * as PIXI from 'pixi.js';
import { SceneManager } from './sceneManager';
import { TitleScene } from './seen/title';
import { SelectScene } from './seen/select';
import { GameScene } from './seen/game';
import { ResultScene } from './seen/result';

async function main() {
    // アプリケーション作成
    const app = new PIXI.Application();
    await app.init({ width: 800, height: 600, backgroundColor: 0x474747 });
    document.body.appendChild(app.view);

    // シーンマネージャーを作成
    const sceneManager = new SceneManager(app);

    let currentSceneData: any = null;

    // シーン変更のコールバック関数
    const onSceneChange = async (sceneName: string, data?: any) => {
        currentSceneData = data;
        await sceneManager.switchScene(sceneName, data);
    };

    // 各シーンを登録
    sceneManager.registerScene('title', () => new TitleScene(app, onSceneChange));
    sceneManager.registerScene('select', () => new SelectScene(app, onSceneChange));
    sceneManager.registerScene('game', () => new GameScene(app, onSceneChange));
    sceneManager.registerScene('result', () => new ResultScene(
        app, 
        onSceneChange, 
        currentSceneData?.score || 0,
        currentSceneData?.missCount || 0,
        currentSceneData?.goodCount || 0
    ));

    // 更新ループ
    app.ticker.add((ticker: PIXI.Ticker) => {
        sceneManager.update(ticker.deltaTime);
    });

    // 最初のシーン（タイトル）を開始
    await sceneManager.switchScene('title');
}

main();