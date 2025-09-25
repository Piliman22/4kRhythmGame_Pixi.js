import { Chart, Note, Hold } from '../note/type';

// サンプル譜面データ
export const sampleCharts: Chart[] = [
    {
        meta: {
            title: "楽曲1",
            artist: "Artist 1",
            difficulty: "Normal",
            bpm: 120,
            offset: 0
        },
        notes: [
            { time: 1000, type: 'normal', position: 0 }, // D
            { time: 1500, type: 'normal', position: 1 }, // F
            { time: 2000, type: 'normal', position: 2 }, // J
            { time: 2500, type: 'normal', position: 3 }, // K
            { time: 3000, type: 'critical', position: 1 }, // F (Critical)
            { time: 3500, type: 'normal', position: 0 }, // D
            { time: 4000, type: 'normal', position: 2 }, // J
            { time: 4500, type: 'critical', position: 3 }, // K (Critical)
            { time: 5000, type: 'normal', position: 1 }, // F
            { time: 5500, type: 'normal', position: 2 }, // J
        ],
        holds: [
            { startTime: 6000, endTime: 7000, position: 0, type: 'normal' }, // D Hold
            { startTime: 7500, endTime: 8500, position: 2, type: 'critical' }, // J Hold (Critical)
        ]
    },
    {
        meta: {
            title: "楽曲2",
            artist: "Artist 2",
            difficulty: "Hard",
            bpm: 140,
            offset: 100
        },
        notes: [
            { time: 800, type: 'normal', position: 0 },
            { time: 1000, type: 'normal', position: 1 },
            { time: 1200, type: 'normal', position: 2 },
            { time: 1400, type: 'normal', position: 3 },
            { time: 1600, type: 'critical', position: 1 },
            { time: 1800, type: 'critical', position: 2 },
            { time: 2000, type: 'normal', position: 0 },
            { time: 2200, type: 'normal', position: 3 },
            { time: 2400, type: 'critical', position: 1 },
            { time: 2600, type: 'normal', position: 2 },
            { time: 2800, type: 'normal', position: 0 },
            { time: 3000, type: 'critical', position: 3 },
        ],
        holds: [
            { startTime: 3500, endTime: 4500, position: 1, type: 'normal' },
            { startTime: 5000, endTime: 6000, position: 2, type: 'critical' },
        ]
    },
    {
        meta: {
            title: "楽曲3",
            artist: "Artist 3",
            difficulty: "Expert",
            bpm: 160,
            offset: 50
        },
        notes: [
            { time: 500, type: 'normal', position: 0 },
            { time: 600, type: 'normal', position: 1 },
            { time: 700, type: 'normal', position: 2 },
            { time: 800, type: 'normal', position: 3 },
            { time: 1000, type: 'critical', position: 0 },
            { time: 1100, type: 'critical', position: 1 },
            { time: 1200, type: 'critical', position: 2 },
            { time: 1300, type: 'critical', position: 3 },
            { time: 1500, type: 'normal', position: 1 },
            { time: 1600, type: 'normal', position: 2 },
            { time: 1700, type: 'critical', position: 0 },
            { time: 1800, type: 'critical', position: 3 },
            { time: 2000, type: 'normal', position: 0 },
            { time: 2000, type: 'normal', position: 3 }, // 同時押し
        ],
        holds: [
            { startTime: 2500, endTime: 3500, position: 1, type: 'normal' },
            { startTime: 4000, endTime: 5000, position: 2, type: 'critical' },
            { startTime: 5500, endTime: 6500, position: 0, type: 'normal' },
        ]
    },
    {
        meta: {
            title: "楽曲4",
            artist: "Artist 4",
            difficulty: "Extend",
            bpm: 180,
            offset: 0
        },
        notes: [
            { time: 400, type: 'normal', position: 0 },
            { time: 500, type: 'normal', position: 1 },
            { time: 600, type: 'normal', position: 2 },
            { time: 700, type: 'normal', position: 3 },
            { time: 800, type: 'critical', position: 1 },
            { time: 900, type: 'critical', position: 2 },
            { time: 1000, type: 'normal', position: 0 },
            { time: 1100, type: 'normal', position: 3 },
            { time: 1200, type: 'critical', position: 0 },
            { time: 1200, type: 'critical', position: 3 }, // 同時押し
            { time: 1400, type: 'normal', position: 1 },
            { time: 1500, type: 'normal', position: 2 },
            { time: 1600, type: 'critical', position: 0 },
            { time: 1700, type: 'critical', position: 1 },
            { time: 1800, type: 'critical', position: 2 },
            { time: 1900, type: 'critical', position: 3 },
        ],
        holds: [
            { startTime: 2200, endTime: 3200, position: 0, type: 'critical' },
            { startTime: 2400, endTime: 3400, position: 2, type: 'critical' },
            { startTime: 4000, endTime: 5500, position: 1, type: 'normal' },
        ]
    }
];

export class ChartLoader {
    static getChart(index: number): Chart | null {
        return sampleCharts[index] || null;
    }

    static getAllCharts(): Chart[] {
        return sampleCharts;
    }

    static async getChartById(id: string): Promise<Chart | null> {
        try {
            const response = await fetch(`/charts/${id}/${id}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const chartData = await response.json();
            return chartData as Chart;
        } catch (error) {
            console.error(`Failed to load chart ${id}:`, error);
            return null;
        }
    }
}
