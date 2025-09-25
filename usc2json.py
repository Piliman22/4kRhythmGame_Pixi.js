import json

LANE_TO_POSITION = {
    -4.5: 0,
    -1.5: 1,
    1.5: 2,
    4.5: 3
}

def convert_usc_to_custom_chart(usc_data):
    objects = usc_data['usc']['objects']
    bpm = next((obj['bpm'] for obj in objects if obj['type'] == 'bpm'), 160.0)
    offset = usc_data['usc'].get('offset', 0.0)
    ms_per_beat = 60000 / bpm

    notes = []
    holds = []

    for obj in objects:
        if obj['type'] == 'single':
            beat = obj['beat']
            lane = obj['lane']
            position = LANE_TO_POSITION.get(lane)
            if position is None:
                continue  # skip invalid lanes

            time_ms = beat * ms_per_beat
            note_type = 'critical' if obj.get('critical', False) else 'normal'

            notes.append({
                'time': round(time_ms),
                'type': note_type,
                'position': position
            })

        elif obj['type'] == 'slide':
            if 'connections' not in obj or len(obj['connections']) != 2:
                continue

            start = obj['connections'][0]
            end = obj['connections'][1]

            lane = start['lane']
            position = LANE_TO_POSITION.get(lane)
            if position is None:
                continue

            start_time = start['beat'] * ms_per_beat
            end_time = end['beat'] * ms_per_beat
            hold_type = 'critical' if obj.get('critical', False) else 'normal'

            holds.append({
                'startTime': round(start_time),
                'endTime': round(end_time),
                'position': position,
                'type': hold_type
            })

    chart = {
        'meta': {
            'title': 'Unknown Title',
            'artist': 'Unknown Artist',
            'difficulty': 'Unknown',
            'bpm': bpm,
            'offset': round(offset * 1000)  # 秒→ミリ秒
        },
        'notes': notes,
        'holds': holds
    }

    return chart

with open('anpanman.usc', 'r', encoding='utf-8') as f:
    usc_data = json.load(f)

converted_chart = convert_usc_to_custom_chart(usc_data)

with open('converted_chart.json', 'w', encoding='utf-8') as f:
    json.dump(converted_chart, f, indent=4, ensure_ascii=False)