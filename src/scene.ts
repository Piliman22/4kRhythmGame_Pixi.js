import * as PIXI from 'pixi.js';

export abstract class Scene {
    protected app: PIXI.Application;
    protected container: PIXI.Container;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
    }

    // シーンが開始されるときに呼ばれる
    abstract start(): Promise<void>;

    // シーンが終了するときに呼ばれる
    abstract destroy(): void;

    // フレームごとに呼ばれる
    update(deltaTime: number): void {
        // デフォルトでは何もしない
    }

    // シーンのコンテナを取得
    getContainer(): PIXI.Container {
        return this.container;
    }
}
