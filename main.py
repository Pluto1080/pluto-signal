import os
import json
import time
from datetime import datetime
import swisseph as swe
from flask import Flask, request, jsonify, render_template
from google import genai
import pytz
from timezonefinder import TimezoneFinder

# [SECTION 1: 서버 설정 및 환경 변수 START]
app = Flask(__name__, template_folder='templates', static_folder='static')
tf = TimezoneFinder()

# API 키 및 클라이언트 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# 별자리 리스트
ZODIAC_SIGNS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
                "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"]
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
    for p_name, p_code in zip(["Jupiter", "Saturn", "Uranus", "Pluto"], [swe.JUPITER, swe.SATURN, swe.URANUS, swe.PLUTO]):
        pos = swe.calc_ut(jd, p_code)[0][0]
        res[p_name] = ZODIAC_SIGNS[int(pos // 30)]
    return res
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
        user_lang = data.get('language', 'ko-KR')
        lat, lon = float(data.get('lat')), float(data.get('lon'))
        
        # 날짜 및 시간 데이터 추출
        natal_data = calculate_astrology(data.get('date'), data.get('time'), lat, lon)
        tz_name = tf.timezone_at(lng=lon, lat=lat) or 'UTC'
        timezone = pytz.timezone(tz_name)
        now = datetime.now(timezone)

        # 궤도 데이터 (2026년 고정 및 현재 시점)
        jd_year = swe.julday(2026, 7, 1, 12.0) # 미래 기준점
        jd_now = swe.julday(now.year, now.month, now.day, now.hour)
        
        transit_year = get_transits(jd_year)
        transit_now = get_transits(jd_now)

        # --- [AI PROMPT START] ---
        prompt = f"""
        너는 먼 우주에서온 쪽집게 점성술사 플루토야. 반드시 '{user_lang}' 언어로, 반말 스타일로 대답해.
        [데이터]
        - 이름: {data.get('name')}
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
                "final_advice": "플루토의 한마디",
                "monthly": "{now.month}월 이번 달 운세"
            }}
        }}
        """
        # --- [AI PROMPT END] ---

        # --- [API CALL & RETRY START] ---
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
                else: raise e
        # --- [API CALL & RETRY END] ---

        if not response or not response.text:
            return jsonify({"error": "별과의 연결이 불안정해. 다시 시도해줘!"}), 200

        return jsonify(json.loads(response.text))

    except Exception as e:
        return jsonify({"error": f"분석 중 오류 발생: {str(e)}"}), 200
# [SECTION 4: 데이터 분석 로직 END]


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 8080)))


