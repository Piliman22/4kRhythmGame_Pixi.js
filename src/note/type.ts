// 譜面ファイルの形式を定義する
export interface Note {
    time: number;                   // ノートが出現する時間（ミリ秒）
    type: 'normal' | 'critical';    // ノートの種類
    position: number;               // ノートの位置（0-3の整数）
}

export interface Hold {
    startTime: number;              // ホールドノートの開始時間（ミリ秒）
    endTime: number;                // ホールドノートの終了時間（ミリ秒）
    position: number;               // ホールドノートの位置（0-3の整数）
    type: 'normal' | 'critical';    // ホールドノートの種類
}

export interface MetaData {
    title: string;                  // 曲名
    artist: string;                 // アーティスト名
    difficulty: string;             // 難易度（例: Easy, Normal, Hard, Expert, Extend）
    bpm: number;                    // 曲のBPM
    offset: number;                 // 曲のオフセット（ミリ秒）
}

export interface Chart {
    meta: MetaData;                 // 曲のメタデータ
    notes: Note[];                  // 通常ノートの配列
    holds: Hold[];                  // ホールドノートの配列
}