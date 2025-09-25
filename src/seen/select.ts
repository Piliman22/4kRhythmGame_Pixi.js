import * as PIXI from 'pixi.js';
import { Scene } from '../scene';
import { ChartLoader } from '../chart/chartLoader';

interface MusicData {
    id: string;
    title: string;
    artist: string;
    bpm: number;
    difficulty: string;
    rating: number;
    chartIndex: number;
}

export class SelectScene extends Scene {
    private titleText!: PIXI.Text;
    private songButtons: PIXI.Container[] = [];
    private onSceneChange!: (sceneName: string, data?: any) => void;
    private musicData: MusicData[] = [];
    private scrollContainer!: PIXI.Container;
    private scrollY: number = 0;
    private maxScrollY: number = 0;
    private readonly SCROLL_SPEED = 50;
    private readonly VISIBLE_HEIGHT = 400; // スクロール可能エリアの高さ

    constructor(app: PIXI.Application, onSceneChange: (sceneName: string, data?: any) => void) {
        super(app);
        this.onSceneChange = onSceneChange;
    }

    async start(): Promise<void> {
        // タイトル
        this.titleText = new PIXI.Text({
            text: '曲選択',
            style: {
                fontSize: 36,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        this.titleText.x = 400 - this.titleText.width / 2;
        this.titleText.y = 50;
        this.container.addChild(this.titleText);

        // スクロール用のコンテナを作成
        this.scrollContainer = new PIXI.Container();
        this.container.addChild(this.scrollContainer);

        // スクロールエリアのマスク作成
        const mask = new PIXI.Graphics();
        mask.rect(0, 150, 800, this.VISIBLE_HEIGHT).fill(0xffffff);
        this.scrollContainer.mask = mask;
        this.container.addChild(mask);

        // musics.jsonから楽曲データを読み込み
        await this.loadMusicData();

        // 楽曲ボタンを作成
        for (let i = 0; i < this.musicData.length; i++) {
            const music = this.musicData[i];
            const songButton = this.createSongButton(music, i);
            songButton.y = 150 + i * 120;
            this.songButtons.push(songButton);
            this.scrollContainer.addChild(songButton);
        }

        // 最大スクロール量を計算
        const totalHeight = this.musicData.length * 120;
        this.maxScrollY = Math.max(0, totalHeight - this.VISIBLE_HEIGHT);

        // 戻るボタン
        const backButton = this.createBackButton();
        this.container.addChild(backButton);

        // キーボードイベントの設定
        this.setupScrollEvents();

        // スクロールの説明文を追加
        if (this.maxScrollY > 0) {
            const scrollHint = new PIXI.Text({
                text: '↑↓キーまたはマウスホイールでスクロール',
                style: {
                    fontSize: 14,
                    fill: 0xaaaaaa
                }
            });
            scrollHint.x = 400 - scrollHint.width / 2;
            scrollHint.y = 570;
            this.container.addChild(scrollHint);
        }
    }

    private async loadMusicData(): Promise<void> {
        try {
            const response = await fetch('/musics.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.musicData = data.musics || [];
        } catch (error) {
            console.error('Failed to load music data:', error);
            // フォールバック: ChartLoaderからデータを取得
            const charts = ChartLoader.getAllCharts();
            this.musicData = charts.map((chart, index) => ({
                id: `chart_${index}`,
                title: chart.meta.title,
                artist: chart.meta.artist || 'Unknown',
                bpm: chart.meta.bpm || 120,
                difficulty: chart.meta.difficulty,
                rating: 1,
                chartIndex: index
            }));
        }
    }

    private createSongButton(music: MusicData, index: number): PIXI.Container {
        const button = new PIXI.Container();

        // ボタン背景
        const bg = new PIXI.Graphics();
        const difficultyColor = this.getDifficultyColor(music.difficulty);
        bg.roundRect(0, 0, 600, 100, 10)
          .fill(0x444444)
          .stroke({width: 3, color: difficultyColor});
        button.addChild(bg);

        // 楽曲名
        const nameText = new PIXI.Text({
            text: music.title,
            style: {
                fontSize: 24,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        nameText.x = 20;
        nameText.y = 15;
        button.addChild(nameText);

        // アーティスト名
        const artistText = new PIXI.Text({
            text: `Artist: ${music.artist}`,
            style: {
                fontSize: 16,
                fill: 0xcccccc
            }
        });
        artistText.x = 20;
        artistText.y = 45;
        button.addChild(artistText);

        // BPMと難易度を右側に表示
        const bpmText = new PIXI.Text({
            text: `BPM: ${music.bpm}`,
            style: {
                fontSize: 14,
                fill: 0xaaaaaa
            }
        });
        bpmText.x = 450;
        bpmText.y = 20;
        button.addChild(bpmText);

        const diffText = new PIXI.Text({
            text: music.difficulty,
            style: {
                fontSize: 18,
                fill: difficultyColor,
                fontWeight: 'bold'
            }
        });
        diffText.x = 450;
        diffText.y = 40;
        button.addChild(diffText);

        // レーティング表示
        const ratingText = new PIXI.Text({
            text: music.rating,
            style: {
                fontSize: 16,
                fill: 0xffd700
            }
        });
        ratingText.x = 450;
        ratingText.y = 65;
        button.addChild(ratingText);

        button.x = 100;
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointerdown', () => {
            // musics.jsonで指定されたchartIndexと楽曲IDを使用
            this.onSceneChange('game', { 
                chartIndex: music.chartIndex,
                musicId: music.id 
            });
        });

        return button;
    }

    private createBackButton(): PIXI.Container {
        const button = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 120, 50, 5)
          .fill(0x666666)
          .stroke({width: 2, color: 0xffffff});
        button.addChild(bg);

        const text = new PIXI.Text({
            text: '戻る',
            style: {
                fontSize: 18,
                fill: 0xffffff
            }
        });
        text.x = 60 - text.width / 2;
        text.y = 25 - text.height / 2;
        button.addChild(text);

        button.x = 50;
        button.y = 520;
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointerdown', () => {
            this.onSceneChange('title');
        });

        return button;
    }

    private getDifficultyColor(difficulty: string): number {
        switch (difficulty) {
            case 'Normal': return 0x00ff00;
            case 'Hard': return 0xffff00;
            case 'Expert': return 0xff0000;
            case 'Extend': return 0xff00ff;
            default: return 0xffffff;
        }
    }

    private setupScrollEvents(): void {
        // キーボードイベント
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowUp':
                    this.scroll(-this.SCROLL_SPEED);
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    this.scroll(this.SCROLL_SPEED);
                    event.preventDefault();
                    break;
            }
        };

        // マウスホイールイベント
        const handleWheel = (event: WheelEvent) => {
            this.scroll(event.deltaY > 0 ? this.SCROLL_SPEED : -this.SCROLL_SPEED);
            event.preventDefault();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('wheel', handleWheel);

        // リスナーを保存（destroy時に削除するため）
        (this as any).keydownHandler = handleKeyDown;
        (this as any).wheelHandler = handleWheel;
    }

    private scroll(deltaY: number): void {
        if (this.maxScrollY <= 0) return;

        this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY));
        this.scrollContainer.y = -this.scrollY;
    }

    destroy(): void {
        // すべてのボタンのリスナーを削除
        this.songButtons.forEach(button => button.off('pointerdown'));
        
        // スクロールイベントリスナーを削除
        if ((this as any).keydownHandler) {
            document.removeEventListener('keydown', (this as any).keydownHandler);
        }
        if ((this as any).wheelHandler) {
            document.removeEventListener('wheel', (this as any).wheelHandler);
        }
    }
}