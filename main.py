import os
import json
import time
import re
from datetime import datetime
import swisseph as swe
from flask import Flask, request, jsonify, render_template
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

# 12가지 동물 유형 — 태양 별자리 인덱스(0~11)와 1:1 고정 매핑
# 같은 생년월일시 입력 시 항상 동일한 동물이 나옴을 보장
ANIMAL_TYPES = [
    {"name": "늑대",    "keyword": "원칙",    "description": "강한 의지와 원칙을 가진 리더. 자신의 신념을 굽히지 않으며 집단을 이끄는 힘이 있어."},
    {"name": "코끼리",  "keyword": "안정",    "description": "든든하고 신뢰할 수 있는 존재. 천천히 하지만 확실하게 목표를 향해 나아가는 타입이야."},
    {"name": "돌고래",  "keyword": "사교",    "description": "어디서든 친구를 만드는 사교의 달인. 밝은 에너지로 주변을 행복하게 만들어."},
    {"name": "나무늘보","keyword": "평화",    "description": "평화를 사랑하고 자기만의 속도를 지키는 타입. 느긋해 보여도 내면이 깊어."},
    {"name": "사자",    "keyword": "주도",    "description": "타고난 카리스마로 어디서든 중심이 되는 타입. 자신감이 넘치고 도전을 두려워하지 않아."},
    {"name": "올빼미",  "keyword": "분석",    "description": "날카로운 관찰력과 분석력으로 본질을 꿰뚫는 타입. 혼자만의 시간을 중요하게 여겨."},
    {"name": "공작",    "keyword": "자기표현","description": "자신만의 개성과 아름다움을 표현하는 걸 즐기는 타입. 예술적 감각이 뛰어나."},
    {"name": "여우",    "keyword": "전략",    "description": "영리하고 전략적인 사고를 가진 타입. 상황을 빠르게 읽고 최선의 선택을 해."},
    {"name": "독수리",  "keyword": "이상",    "description": "높은 이상과 자유를 추구하는 타입. 넓은 시야로 멀리 바라보며 꿈을 향해 날아가."},
    {"name": "개미",    "keyword": "현실",    "description": "성실하고 꼼꼼한 현실주의자. 작은 것부터 차근차근 쌓아올리는 힘이 있어."},
    {"name": "고양이",  "keyword": "개인",    "description": "독립적이고 자유로운 영혼. 자기만의 세계가 뚜렷하고 직관이 예리해."},
    {"name": "말",      "keyword": "활력",    "description": "넘치는 활력과 열정으로 어디든 달려가는 타입. 자유롭고 개방적인 성격이야."},
]
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

    results = {}
    for name, pid in planets.items():
        lon = swe.calc_ut(jd, pid)[0][0]
        results[name] = {"sign": ZODIAC_SIGNS[int(lon // 30)]}
    return results

def get_transits(jd):
    res = {}
    for p_name, p_code in zip(["Jupiter", "Saturn", "Uranus", "Pluto"],
                               [swe.JUPITER, swe.SATURN, swe.URANUS, swe.PLUTO]):
        pos = swe.calc_ut(jd, p_code)[0][0]
        res[p_name] = ZODIAC_SIGNS[int(pos // 30)]
    return res

def get_animal_type(natal_data):
    """태양 별자리 인덱스를 기반으로 12가지 동물 중 하나를 고정 매핑.
    동일 입력 → 항상 동일 동물 보장."""
    sun_sign = natal_data.get('Sun', {}).get('sign', '양자리')
    sign_index = ZODIAC_SIGNS.index(sun_sign) if sun_sign in ZODIAC_SIGNS else 0
    return ANIMAL_TYPES[sign_index]
# [SECTION 2: 점성술 계산 엔진 END]


# [SECTION 3: 기본 경로 라우팅 START]
@app.route('/')
def index():
    return render_template('index.html')
# [SECTION 3: 기본 경로 라우팅 END]


# [SECTION 4: 데이터 분석 로직 START]
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

        user_lang = data.get('language', 'ko-KR')
        lat, lon = float(data.get('lat')), float(data.get('lon'))

        natal_data = calculate_astrology(data.get('date'), data.get('time'), lat, lon)
        tz_name = tf.timezone_at(lng=lon, lat=lat) or 'UTC'
        timezone = pytz.timezone(tz_name)
        now = datetime.now(timezone)

        jd_year = swe.julday(2026, 7, 1, 12.0)
        jd_now = swe.julday(now.year, now.month, now.day, now.hour)

        transit_year = get_transits(jd_year)
        transit_now = get_transits(jd_now)

        # 동물 유형 결정 (태양 별자리 기반, 항상 동일 결과 보장)
        animal = get_animal_type(natal_data)

        prompt = f"""
        너는 먼 우주에서온 쪽집게 점성술사 플루토야. 반드시 '{user_lang}' 언어로, 반말 스타일로 대답해.
        [데이터]
        - 이름: {clean_name}
        - 탄생 차트: {json.dumps(natal_data, ensure_ascii=False)}
        - 2026년 행성 흐름: {json.dumps(transit_year, ensure_ascii=False)}
        - 현재 시점({now.year}년 {now.month}월) 흐름: {json.dumps(transit_now, ensure_ascii=False)}

        위 데이터를 비교해서 분석 결과를 반드시 아래 JSON 형식으로만 응답해:
        {{
            "personality": "성격 요약",
            "pros": "핵심 장점",
            "cons": "주의할 점",
            "current_month": "{now.year}.{now.month:02d}",
            "fortune_2026": {{
                "love": "올해 애정운",
                "money": "올해 재물운",
                "career": "올해 직업운",
                "health": "올해 건강운",
                "summary": "올해 전체 요약",
                "final_advice": "플루토의 한마디 (잘될 점과 주의할 점을 모두 포함해서 따뜻하게)"
            }}
        }}
        """

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-flash-latest',
                    contents=prompt,
                    config={'response_mime_type': 'application/json'}
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
        result['animal'] = animal  # 동물 데이터 응답에 추가
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"분석 중 오류 발생: {str(e)}"}), 200
# [SECTION 4: 데이터 분석 로직 END]


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 8080)))
