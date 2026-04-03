import os
import json
import time
import re
from datetime import datetime
import swisseph as swe
from flask import Flask, request, jsonify, render_template, send_from_directory
from google import genai
import pytz
from timezonefinder import TimezoneFinder

# [SECTION 1: 서버 설정 및 환경 변수 START]
app = Flask(__name__, template_folder='templates', static_folder='static')
tf = TimezoneFinder()

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

ZODIAC_SIGNS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
                "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"]

# 행성별 동물 유형 — 탄생 차트에서 가장 강한 행성으로 결정
PLANET_ANIMAL_MAP = {
    'Sun':     {"name": "사자",    "keyword": "주도",    "description": "타고난 카리스마로 어디서든 중심이 되는 타입. 자신감이 넘치고 도전을 두려워하지 않아."},
    'Moon':    {"name": "나무늘보","keyword": "평화",    "description": "평화를 사랑하고 자기만의 속도를 지키는 타입. 느긋해 보여도 내면이 깊어."},
    'Mercury': {"name": "돌고래",  "keyword": "사교",    "description": "어디서든 친구를 만드는 사교의 달인. 밝은 에너지로 주변을 행복하게 만들어."},
    'Venus':   {"name": "공작",    "keyword": "자기표현","description": "자신만의 개성과 아름다움을 표현하는 걸 즐기는 타입. 예술적 감각이 뛰어나."},
    'Mars':    {"name": "늑대",    "keyword": "원칙",    "description": "강한 의지와 원칙을 가진 리더. 자신의 신념을 굽히지 않으며 집단을 이끄는 힘이 있어."},
    'Jupiter': {"name": "코끼리", "keyword": "안정",    "description": "든든하고 신뢰할 수 있는 존재. 천천히 하지만 확실하게 목표를 향해 나아가는 타입이야."},
    'Saturn':  {"name": "개미",    "keyword": "현실",    "description": "성실하고 꼼꼼한 현실주의자. 작은 것부터 차근차근 쌓아올리는 힘이 있어."},
    'Uranus':  {"name": "독수리",  "keyword": "이상",    "description": "높은 이상과 자유를 추구하는 타입. 넓은 시야로 멀리 바라보며 꿈을 향해 날아가."},
    'Neptune': {"name": "말",      "keyword": "활력",    "description": "넘치는 활력과 열정으로 어디든 달려가는 타입. 자유롭고 개방적인 성격이야."},
    'Pluto':   {"name": "여우",    "keyword": "전략",    "description": "영리하고 전략적인 사고를 가진 타입. 상황을 빠르게 읽고 최선의 선택을 해."},
}
ANIMAL_COMPATIBILITY = {
    '사자': {
        'good': [
            {'name': '코끼리', 'reason': '든든한 코끼리가 사자의 추진력을 뒤에서 받쳐줘서 오래 가'},
            {'name': '독수리', 'reason': '둘 다 높은 곳을 바라보는 타입이라 서로를 자극하고 성장시켜'},
            {'name': '공작',   'reason': '사자의 카리스마와 공작의 감성이 서로 채워주는 관계야'},
        ],
        'bad': [
            {'name': '나무늘보', 'reason': '사자의 빠른 템포를 나무늘보가 따라가기 버거워서 지치기 쉬워'},
            {'name': '개미',     'reason': '사자는 직관으로 달리는데 개미의 꼼꼼함이 자꾸 제동을 걸어'},
            {'name': '여우',     'reason': '둘 다 주도권을 중요하게 여겨서 은근한 신경전이 생기기 쉬워'},
        ],
    },
    '나무늘보': {
        'good': [
            {'name': '공작',   'reason': '공작의 감성적인 에너지가 나무늘보의 내면 세계를 풍요롭게 해줘'},
            {'name': '말',     'reason': '말의 활기찬 에너지가 나무늘보에게 좋은 자극이 돼'},
            {'name': '돌고래', 'reason': '돌고래가 나무늘보를 편하게 이끌어줘서 같이 있으면 즐거워'},
        ],
        'bad': [
            {'name': '늑대',   'reason': '늑대의 강한 원칙이 나무늘보를 자꾸 압박해서 숨막힐 수 있어'},
            {'name': '독수리', 'reason': '독수리의 빠른 판단과 나무늘보의 느긋함이 박자가 안 맞아'},
            {'name': '사자',   'reason': '사자의 강한 에너지가 나무늘보를 금세 지치게 만들어'},
        ],
    },
    '돌고래': {
        'good': [
            {'name': '사자', 'reason': '사자의 리더십과 돌고래의 친화력이 만나면 최강 콤비야'},
            {'name': '공작', 'reason': '둘 다 표현하길 좋아해서 같이 있으면 에너지가 넘쳐'},
            {'name': '말',   'reason': '둘 다 자유롭고 밝아서 함께할수록 시너지가 터져나와'},
        ],
        'bad': [
            {'name': '개미', 'reason': '개미의 꼼꼼한 방식이 자유로운 돌고래를 답답하게 만들어'},
            {'name': '여우', 'reason': '여우의 계산적인 면이 순수한 돌고래를 상처 입히기 쉬워'},
            {'name': '늑대', 'reason': '늑대의 엄격함이 돌고래의 가벼운 에너지를 위축시켜'},
        ],
    },
    '공작': {
        'good': [
            {'name': '나무늘보', 'reason': '나무늘보의 여유가 공작이 마음껏 표현할 수 있는 공간을 줘'},
            {'name': '돌고래',   'reason': '돌고래의 밝음과 공작의 감성이 만나면 서로 더 빛나게 해줘'},
            {'name': '말',       'reason': '말의 활력과 공작의 개성이 만나면 둘 다 더 빛나'},
        ],
        'bad': [
            {'name': '늑대',   'reason': '늑대의 원칙이 공작의 자유로운 표현을 자꾸 틀어막아'},
            {'name': '여우',   'reason': '여우의 전략적 시선이 감성적인 공작을 불편하게 만들어'},
            {'name': '독수리', 'reason': '독수리의 이상주의가 공작의 감성적 세계와 자주 충돌해'},
        ],
    },
    '늑대': {
        'good': [
            {'name': '사자',   'reason': '사자의 카리스마와 늑대의 원칙이 서로를 인정하며 강해져'},
            {'name': '독수리', 'reason': '둘 다 이상을 향해 달리는 타입이라 강한 신뢰 관계가 생겨'},
            {'name': '여우',   'reason': '늑대의 원칙과 여우의 전략이 만나면 최강의 팀이 돼'},
        ],
        'bad': [
            {'name': '나무늘보', 'reason': '늑대의 강한 의지가 나무늘보를 자꾸 몰아붙이게 돼'},
            {'name': '공작',     'reason': '공작의 자유분방함이 원칙주의 늑대에겐 답답해 보여'},
            {'name': '말',       'reason': '말의 즉흥적인 에너지가 계획적인 늑대와 자주 충돌해'},
        ],
    },
    '코끼리': {
        'good': [
            {'name': '사자', 'reason': '코끼리의 안정감이 사자의 모험을 뒤에서 든든히 지원해줘'},
            {'name': '개미', 'reason': '둘 다 현실적이고 성실해서 같은 방향으로 함께 걸어갈 수 있어'},
            {'name': '말',   'reason': '말의 활력이 코끼리에게 새로운 에너지를 불어넣어줘'},
        ],
        'bad': [
            {'name': '돌고래', 'reason': '돌고래의 변화무쌍함이 안정을 중시하는 코끼리를 흔들어'},
            {'name': '독수리', 'reason': '독수리의 이상주의가 현실적인 코끼리와 방향이 너무 달라'},
            {'name': '여우',   'reason': '여우의 계산적인 면이 솔직한 코끼리를 불안하게 만들어'},
        ],
    },
    '개미': {
        'good': [
            {'name': '코끼리',   'reason': '둘 다 성실하고 신중해서 서로를 완벽하게 이해해'},
            {'name': '여우',     'reason': '개미의 성실함과 여우의 전략이 만나면 목표를 확실히 이뤄'},
            {'name': '나무늘보', 'reason': '나무늘보의 여유가 개미의 긴장을 풀어줘서 균형이 잡혀'},
        ],
        'bad': [
            {'name': '돌고래', 'reason': '돌고래의 즉흥적인 에너지가 계획적인 개미를 불안하게 해'},
            {'name': '말',     'reason': '말의 자유로운 에너지가 꼼꼼한 개미에겐 혼란스러워'},
            {'name': '사자',   'reason': '사자의 빠른 결정이 신중한 개미와 자꾸 엇박자가 나'},
        ],
    },
    '독수리': {
        'good': [
            {'name': '사자',   'reason': '사자의 추진력과 독수리의 시야가 만나면 큰 것을 이룰 수 있어'},
            {'name': '늑대',   'reason': '둘 다 강한 신념이 있어서 서로 깊이 이해하고 신뢰해'},
            {'name': '돌고래', 'reason': '돌고래의 친화력이 높이 나는 독수리를 현실로 내려오게 해줘'},
        ],
        'bad': [
            {'name': '나무늘보', 'reason': '나무늘보의 느린 템포가 이상을 향해 나는 독수리를 붙잡아'},
            {'name': '공작',     'reason': '공작의 감성적 표현이 냉철한 독수리에겐 과하게 느껴져'},
            {'name': '코끼리',   'reason': '코끼리의 현실적인 시각이 독수리의 높은 이상을 계속 제한해'},
        ],
    },
    '말': {
        'good': [
            {'name': '나무늘보', 'reason': '나무늘보의 여유가 말의 넘치는 에너지를 편안하게 받아줘'},
            {'name': '공작',     'reason': '말의 활력과 공작의 개성이 만나면 서로 더 빛나게 해줘'},
            {'name': '돌고래',   'reason': '둘 다 자유롭고 밝아서 함께할수록 시너지가 폭발해'},
        ],
        'bad': [
            {'name': '개미', 'reason': '개미의 꼼꼼한 계획이 자유로운 말의 흐름을 자꾸 막아'},
            {'name': '여우', 'reason': '여우의 전략적인 움직임이 직선적인 말에겐 믿기 어려워'},
            {'name': '늑대', 'reason': '늑대의 엄격한 원칙이 즉흥적인 말을 자꾸 가두려 해'},
        ],
    },
    '여우': {
        'good': [
            {'name': '늑대',   'reason': '늑대의 의지와 여우의 전략이 합쳐지면 못 이룰 게 없어'},
            {'name': '개미',   'reason': '개미의 성실함이 여우의 계획을 실행하는 최고의 파트너야'},
            {'name': '독수리', 'reason': '여우의 전략과 독수리의 시야가 만나면 큰 그림을 그릴 수 있어'},
        ],
        'bad': [
            {'name': '나무늘보', 'reason': '나무늘보의 느긋함이 빠르게 움직이는 여우에게 답답해'},
            {'name': '말',       'reason': '말의 직선적인 에너지가 계산적인 여우와 방향이 달라'},
            {'name': '돌고래',   'reason': '돌고래의 순수함이 여우의 복잡한 생각과 자꾸 엇갈려'},
        ],
    },
}
# [SECTION 1: 서버 설정 및 환경 변수 END]


# [SECTION 2: 점성술 계산 엔진 START]
def calculate_astrology(birth_date, birth_time, latitude, longitude):
    tz_name = tf.timezone_at(lng=longitude, lat=latitude) or 'UTC'
    timezone = pytz.timezone(tz_name)
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
    local_dt = timezone.localize(dt)
    utc_offset = local_dt.utcoffset().total_seconds() / 3600.0
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour - utc_offset + dt.minute / 60.0)

    planets = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY, 'Venus': swe.VENUS,
               'Mars': swe.MARS, 'Jupiter': swe.JUPITER, 'Saturn': swe.SATURN,
               'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}

    houses, _ = swe.houses(jd, latitude, longitude, b'P')

    def get_house(p_lon):
        for h in range(12):
            s, e = houses[h], houses[(h + 1) % 12]
            if s <= e:
                if s <= p_lon < e: return h + 1
            else:
                if p_lon >= s or p_lon < e: return h + 1
        return 12

    results = {}
    for name, pid in planets.items():
        lon = swe.calc_ut(jd, pid)[0][0]
        results[name] = {
            "degree": round(lon, 2),
            "sign": ZODIAC_SIGNS[int(lon // 30)],
            "house": get_house(lon)
        }
    return results


def get_dominant_planet(natal_data):
    """탄생 차트에서 가장 강한 행성을 찾아 동물 유형 결정.
    각도 하우스(1·4·7·10) 우선, 태양·달 가중치 추가."""
    ANGULAR   = {1, 4, 7, 10}
    SUCCEDENT = {2, 5, 8, 11}
    BONUS     = {'Sun': 2, 'Moon': 1}

    scores = {}
    for planet, info in natal_data.items():
        h = info['house']
        score = 3 if h in ANGULAR else (2 if h in SUCCEDENT else 1)
        scores[planet] = score + BONUS.get(planet, 0)

    dominant = max(scores, key=lambda p: scores[p])
    return PLANET_ANIMAL_MAP.get(dominant, PLANET_ANIMAL_MAP['Sun'])

def _bisect_solar_return(target_lon, jd_start, jd_end):
    """이진 탐색으로 태양이 target_lon에 도달하는 JD를 찾음"""
    for _ in range(60):
        jd_mid = (jd_start + jd_end) / 2
        sun_lon = swe.calc_ut(jd_mid, swe.SUN)[0][0]
        diff = target_lon - sun_lon
        if diff > 180: diff -= 360
        if diff < -180: diff += 360
        if abs(diff) < 0.0001:
            return jd_mid
        if diff > 0:
            jd_start = jd_mid
        else:
            jd_end = jd_mid
    return jd_mid

def calculate_solar_return(natal_sun_lon, target_year, lat, lon):
    """소라 리턴: 태양이 탄생 위치로 돌아오는 순간의 행성 위치 + 하우스"""
    jd_start = swe.julday(target_year, 1, 1, 0)
    jd_end   = swe.julday(target_year, 12, 31, 23)
    try:
        jd_sr = swe.solcross_ut(natal_sun_lon, jd_start, swe.FLG_SWIEPH)
        if not (jd_start <= jd_sr <= jd_end):
            raise ValueError("out of range")
    except Exception:
        jd_sr = _bisect_solar_return(natal_sun_lon, jd_start, jd_end)

    planets = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY,
               'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
               'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE,
               'Pluto': swe.PLUTO}

    houses, _ = swe.houses(jd_sr, lat, lon, b'P')

    def get_house(p_lon):
        for h in range(12):
            s, e = houses[h], houses[(h + 1) % 12]
            if s <= e:
                if s <= p_lon < e: return h + 1
            else:
                if p_lon >= s or p_lon < e: return h + 1
        return 12

    results = {}
    for name, pid in planets.items():
        p_lon = swe.calc_ut(jd_sr, pid)[0][0]
        results[name] = {
            "degree": round(p_lon, 2),
            "sign": ZODIAC_SIGNS[int(p_lon // 30)],
            "house": get_house(p_lon)
        }
    return results

def compress_chart(chart_data):
    """AI 프롬프트용 압축 포맷: 'Sun:물고기2H Moon:처녀6H ...'"""
    return ' '.join(f"{p}:{v['sign'][:2]}{v['house']}H" for p, v in chart_data.items())

def calculate_aspects(natal_data, solar_return):
    """소라 리턴 행성 ↔ 탄생 차트 행성 간 주요 어스펙트 계산"""
    ASPECTS = {
        0:   ('합(Conjunction)', 8, 'powerful'),
        60:  ('육분(Sextile)',   6, 'easy'),
        90:  ('사분(Square)',    8, 'hard'),
        120: ('삼분(Trine)',     8, 'easy'),
        180: ('대립(Opposition)',8, 'hard'),
    }

    results = []
    for sr_planet, sr_info in solar_return.items():
        for natal_planet, natal_info in natal_data.items():
            diff = abs(sr_info['degree'] - natal_info['degree'])
            if diff > 180: diff = 360 - diff
            for angle, (name, orb, quality) in ASPECTS.items():
                if abs(diff - angle) <= orb:
                    results.append({
                        "aspect": name,
                        "sr_planet": sr_planet,
                        "natal_planet": natal_planet,
                        "quality": quality,
                        "orb": round(abs(diff - angle), 2)
                    })
    results.sort(key=lambda x: x['orb'])
    # 상위 6개만, 압축 포맷으로 변환
    top = results[:6]
    return [f"SR{r['sr_planet']}-{r['aspect']}-N{r['natal_planet']}({'어려움' if r['quality']=='hard' else '순조'})" for r in top]
# [SECTION 2: 점성술 계산 엔진 END]


# [SECTION 3: 기본 경로 라우팅 START]
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sound/<path:filename>')
def serve_sound(filename):
    return send_from_directory('sound', filename)
# [SECTION 3: 기본 경로 라우팅 END]


# [SECTION 4: 데이터 분석 로직 START]
@app.route('/models')
def list_models():
    if not client:
        return jsonify({"error": "API 키 없음"})
    models = [m.name for m in client.models.list()]
    return jsonify(models)

@app.route('/analyze', methods=['POST'])
def analyze():
    if not client:
        return jsonify({"error": "API 키가 설정되지 않았어!"}), 200

    try:
        data = request.json

        raw_name = data.get('name', '')
        clean_name = re.sub(r'[^a-zA-Z가-힣0-9\s]', '', raw_name).strip()

        if not clean_name or len(clean_name) > 20:
            return jsonify({"error": "유효하지 않은 이름이야! 특수문자를 제외하고 1~20자 이내로 입력해줘."}), 200

        lat, lon = float(data.get('lat')), float(data.get('lon'))

        natal_data = calculate_astrology(data.get('date'), data.get('time'), lat, lon)
        tz_name = tf.timezone_at(lng=lon, lat=lat) or 'UTC'
        timezone = pytz.timezone(tz_name)
        now = datetime.now(timezone)
        fortune_year = now.year

        # 소라 리턴 계산 (실제 출생 시간의 태양 위치 사용)
        natal_sun_lon = natal_data['Sun']['degree']
        solar_return = calculate_solar_return(natal_sun_lon, fortune_year, lat, lon)
        aspects = calculate_aspects(natal_data, solar_return)

        # 동물 유형 결정 (가장 강한 행성 기반)
        animal = get_dominant_planet(natal_data)

        natal_compact = compress_chart(natal_data)
        sr_compact    = compress_chart(solar_return)

        prompt = f"""이름: {clean_name}
탄생차트: {natal_compact}
{fortune_year}년차트: {sr_compact}
주요각도: {' / '.join(aspects)}
동물유형: {animal['name']}

위 데이터를 분석해서 아래 JSON 형식으로 응답해.
각 운세 필드(love·money·career·health)는 반드시 4~5문장 이상으로 자세하게 써.

{{
  "animal_modifier": "탄생차트에서 가장 두드러지는 특이한 배치 하나를 골라서, 그걸 딱 표현하는 수식어구 (형용사 또는 짧은 명사구, 2~4글자). 흔한 단어(세심한·대담한·따뜻한) 금지. 차트를 실제로 읽은 사람만 뽑을 수 있는 표현으로. 예: '달이 흐린', '경계선 위의', '혼자만 아는', '이중 파장의', '새벽 3시의', '역행 중인' 등 분위기.",
  "personality": "첫 문장에서 왜 '{animal['name']}'에 그 수식어가 붙었는지 차트 근거로 자연스럽게 설명하고, 이어서 전체 성격을 3~4문장으로 요약",
  "pros": "핵심 장점 2~3가지를 구체적으로",
  "cons": "주의할 점 2~3가지를 구체적으로",
  "current_month": "{now.year}.{now.month:02d}",
  "fortune_year": {fortune_year},
  "fortune": {{
    "love": "올해 연애 흐름 전반 + 어떤 분위기의 사람에게 끌릴지 + 관계 변화 가능성 + 주의할 상황을 4~5문장으로",
    "money": "올해 재물 흐름 전반 + 돈이 들어오거나 나가는 시기나 상황 + 조심해야 할 소비 패턴을 4~5문장으로",
    "career": "올해 직업·커리어 흐름 + 기회가 생기는 상황 + 갈등이나 어려움이 올 수 있는 상황을 4~5문장으로",
    "health": "올해 건강 전반 흐름 + 특히 신경써야 할 부분 + 에너지 관리 팁을 4~5문장으로",
    "summary": "올해 전체를 2~3문장으로 솔직하게 요약",
    "final_advice": "플루토가 이 사람에게 해주고 싶은 진심 어린 말 2~3문장"
  }}
}}"""

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-3.1-flash-lite-preview',
                    contents=prompt,
                    config={
                        'response_mime_type': 'application/json',
                        'system_instruction': (
                            '너는 점성술 전문가야. 반말로, 일반인도 바로 이해할 수 있는 쉬운 말로만 써. '
                            '사분각·트라인·소라리턴·하우스 같은 점성술 용어는 절대 출력에 쓰지 마. '
                            '대신 "이 시기엔 돈 씀씀이를 줄여야 해", "새로운 인연이 생길 수 있어" 같이 구체적으로 표현해. '
                            '각 운세(애정·재물·직업·건강)는 3~4문장으로 써. '
                            '애정운은 올해 어떤 종류의 인연이나 관계 변화가 생길지 차트 배치 기반으로 구체적으로 묘사해. '
                            '5하우스·7하우스 행성을 보고 올해 끌릴 사람의 분위기나 스타일(외모보다는 느낌·성격·분위기 위주)도 간단히 언급해. '
                            '재물·직업·건강도 마찬가지로 올해 어떤 상황이 펼쳐질지 흐름을 구체적으로 묘사하고, 주의해야 할 상황도 포함해. '
                            '근거 없는 막연한 격려는 금지.'
                        ),
                        'temperature': 0.7,
                        'max_output_tokens': 2048,
                    }
                )
                break
            except Exception as e:
                if "503" in str(e) and attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                else:
                    raise e

        if not response or not response.text:
            return jsonify({"error": "별과의 연결이 불안정해. 다시 시도해줘!"}), 200

        result = json.loads(response.text)
        animal['modifier'] = result.get('animal_modifier', '')
        result['animal'] = animal
        result['compatibility'] = ANIMAL_COMPATIBILITY.get(animal['name'], {'good': [], 'bad': []})
        if 'fortune' in result and 'fortune_2026' not in result:
            result['fortune_2026'] = result['fortune']
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"분석 중 오류 발생: {str(e)}"}), 200
# [SECTION 4: 데이터 분석 로직 END]


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 8080)))
