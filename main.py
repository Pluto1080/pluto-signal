import os
import json
import re
from datetime import datetime
import pyswisseph as swe
from flask import Flask, request, jsonify, render_template
from google import genai
import pytz
from timezonefinder import TimezoneFinder

app = Flask(__name__, template_folder='templates', static_folder='templates')
tf = TimezoneFinder()

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# 별자리 이름 정의
ZODIAC_SIGNS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
                "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"]

def calculate_astrology(birth_date, birth_time, latitude, longitude):
    tz_name = tf.timezone_at(lng=longitude, lat=latitude) or 'UTC'
    timezone = pytz.timezone(tz_name)
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
    local_dt = timezone.localize(dt)
    utc_offset = local_dt.utcoffset().total_seconds() / 3600.0
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour - utc_offset + dt.minute / 60.0)

    def get_sign(lon):
        return ZODIAC_SIGNS[int(lon // 30)]

    planets = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY, 'Venus': swe.VENUS, 
               'Mars': swe.MARS, 'Jupiter': swe.JUPITER, 'Saturn': swe.SATURN, 
               'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE, 'Pluto': swe.PLUTO}

    results = {}
    for name, pid in planets.items():
        lon = swe.calc_ut(jd, pid)[0][0]
        results[name] = {"sign": get_sign(lon)}

    return results

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not client:
        return jsonify({"error": "API Key Missing"}), 200

    try:
        data = request.json
        user_lang = data.get('language', 'ko-KR')
        lat, lon = float(data.get('lat')), float(data.get('lon'))
        
        # 1. 태어난 시점 데이터
        natal_data = calculate_astrology(data.get('date'), data.get('time'), lat, lon)

        # 2. [추가] 2026년 7월 1일 Transit 데이터 실시간 계산
        tz_name = tf.timezone_at(lng=lon, lat=lat) or 'UTC'
        timezone = pytz.timezone(tz_name)
        # 2026년 기준 정오 시간의 JD 계산
        dt_2026 = timezone.localize(datetime(2026, 7, 1, 12, 0))
        jd_2026 = swe.julday(2026, 7, 1, 12.0 - (dt_2026.utcoffset().total_seconds() / 3600.0))
        
        transit_2026 = {}
        for p_name, p_code in zip(["Jupiter", "Saturn", "Uranus", "Pluto"], 
                                  [swe.JUPITER, swe.SATURN, swe.URANUS, swe.PLUTO]):
            pos = swe.calc_ut(jd_2026, p_code)[0][0]
            transit_2026[p_name] = ZODIAC_SIGNS[int(pos // 30)]

        # 3. AI 프롬프트 구성
        prompt = f"""
        너는 먼 우주에서온 딱 중요한 것만 보는 쪽집게 점성술사 플루토야. 반드시 '{user_lang}' 언어로, 냉철한 반말 스타일로 대답해.
        [데이터]
        - 네이탈(탄생): {json.dumps(natal_data, ensure_ascii=False)}
        - 2026년 7월 Transit: {json.dumps(transit_2026, ensure_ascii=False)}

        위 데이터를 비교해서 {data.get('name')}의 성격과 2026년 운세를 분석해.
        **반드시 아래 JSON 형식으로만 응답해:**
        {{
            "personality": "성격 분석",
            "pros": "장점",
            "cons": "단점",
            "fortune_2026": {{
                "love": "2026년 연애운",
                "money": "2026년 재물운",
                "career": "2026년 직장/학업운"
            }}
        }}
        """

        response = client.models.generate_content(model='gemini-2.0-flash', contents=prompt)
        cleaned_text = re.sub(r"```json|```", "", response.text).strip()
        return jsonify(json.loads(cleaned_text))

    except Exception as e:
        return jsonify({"error": str(e)}), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 8080)))

