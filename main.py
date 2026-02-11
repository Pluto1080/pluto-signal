import os
import json
from datetime import datetime
import swisseph as swe
from flask import Flask, request, jsonify, render_template
from google import genai
import re

# --- 타임존 자동 계산을 위한 추가 도구들 ---
import pytz
from timezonefinder import TimezoneFinder

app = Flask(__name__, template_folder='templates', static_folder='templates')

# 타임존 파인더 초기화 (서버 실행 시 한 번만 로드)
tf = TimezoneFinder()

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def calculate_astrology(birth_date, birth_time, latitude, longitude):
    # 1. 위도/경도로 타임존 이름 찾기 (예: 'Asia/Seoul')
    tz_name = tf.timezone_at(lng=longitude, lat=latitude) or 'UTC'
    timezone = pytz.timezone(tz_name)
    
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
    
    # 2. 해당 지역의 당시 시간 차이(Offset) 자동 계산 (서머타임 포함)
    local_dt = timezone.localize(dt)
    utc_offset = local_dt.utcoffset().total_seconds() / 3600.0
    
    # 3. 우주 시간(JD) 계산
    utc_hour = dt.hour - utc_offset + dt.minute / 60.0
    jd = swe.julday(dt.year, dt.month, dt.day, utc_hour)

    # --- 여기서부터는 기존의 zodiac_signs = [...] 코드와 동일합니다 ---

    zodiac_signs = [
        "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
        "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"
    ]

    def get_sign_and_degree(lon):
        sign_index = int(lon // 30)
        inner_degree = round(lon % 30, 2)
        return f"{zodiac_signs[sign_index]} {inner_degree:.2f}도"

    planets = {
        'Sun': swe.SUN, 'Moon': swe.MOON, 'Mercury': swe.MERCURY,
        'Venus': swe.VENUS, 'Mars': swe.MARS, 'Jupiter': swe.JUPITER,
        'Saturn': swe.SATURN, 'Uranus': swe.URANUS, 'Neptune': swe.NEPTUNE,
        'Pluto': swe.PLUTO
    }

    results = {}
    for name, pid in planets.items():
        lon = swe.calc_ut(jd, pid)[0][0]
        results[name] = {"degree": round(lon, 2), "sign": get_sign_and_degree(lon)}

    house_cusps, ascmc = swe.houses(jd, latitude, longitude)
    results["ASC"] = {"degree": round(ascmc[0], 2), "sign": get_sign_and_degree(ascmc[0])}
    results["MC"] = {"degree": round(ascmc[1], 2), "sign": get_sign_and_degree(ascmc[1])}

    sun = swe.calc_ut(jd, swe.SUN)[0][0]
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    pf = (ascmc[0] + moon - sun) % 360
    results["Fortune"] = {"degree": round(pf, 2), "sign": get_sign_and_degree(pf)}

    for i in range(12):
        results[f"House_{i+1}_Cusp"] = {"degree": round(house_cusps[i], 2), "sign": get_sign_and_degree(house_cusps[i])}

    def get_house(degree, cusps):
        for i in range(12):
            cusp_start = cusps[i]
            cusp_end = cusps[(i+1) % 12]
            if cusp_start < cusp_end:
                if cusp_start <= degree < cusp_end: return f"{i+1}하우스"
            else:
                if degree >= cusp_start or degree < cusp_end: return f"{i+1}하우스"
        return "Unknown"

    for name in planets:
        results[name]["house"] = get_house(results[name]["degree"], house_cusps)

    return results

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not client:
        # 프론트엔드에서 JSON 파싱 오류를 막기 위해 에러도 JSON 구조로 보냄
        return jsonify({"error": "서버 API 키 설정 오류"}), 200

    try:
        data = request.json
        name = data.get('name', '지구인')
        birth_date = data.get('date', '2000-01-01')
        birth_time = data.get('time', '12:00')
        time_unknown = data.get('time_unknown', False)
        lat = float(data.get('lat', 37.5665))
        lon = float(data.get('lon', 126.9780))

        astro_data = calculate_astrology(birth_date, birth_time, lat, lon)
        astro_json = json.dumps(astro_data, ensure_ascii=False)

        warning_instruction = ""
        if time_unknown:
            warning_instruction = """
            [중요 지시사항] 사용자가 태어난 시간을 몰라서 12:00으로 임의 계산했습니다. 
            'personality' 항목 분석을 시작할 때 반드시 다음 문장으로 시작하세요: "시간을 잘 모르는구나. 정확도는 조금 떨어지겠지만 재밌는 이야기 듣는다고 생각하고 들어줘."
            """

        # [핵심 변경] JSON 포맷 강제 요청
        prompt = f"""
        너는 사이버펑크 점성술사 플루토야. 말투는 짧고 맵고 건방진 반말이야.
        제공된 천체 데이터를 바탕으로 {name}을 분석해.
        
        {warning_instruction}
        
        **중요: 반드시 아래의 JSON 형식으로만 대답해. 다른 마크다운이나 설명은 절대 붙이지 마.**
        {{
            "personality": "여기에 전체적인 성격과 기질 분석 내용을 적어 (시간 모를 경우 경고문구 포함)",
            "pros": "여기에 핵심 장점 3~4가지를 맵게 요약해서 적어",
            "cons": "여기에 핵심 단점이나 주의할 점 3~4가지를 아주 맵게 팩트폭력으로 적어"
        }}

        [데이터]
        {astro_json}
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        # Gemini가 가끔 JSON 앞뒤에 ```json ... ``` 을 붙이는 경우가 있어서 제거
        cleaned_text = re.sub(r"```json|```", "", response.text).strip()
        
        # 문자열을 실제 파이썬 딕셔너리(JSON 객체)로 변환
        result_json = json.loads(cleaned_text)
        
        # 프론트엔드로 JSON 객체 전송
        return jsonify(result_json)

    except json.JSONDecodeError:
         # Gemini가 JSON 형식을 지키지 않았을 때의 대비책
         return jsonify({"error": "플루토가 신호를 잘못 보냈어. (JSON 파싱 실패)"}), 200
    except Exception as e:
        return jsonify({"error": f"치명적 오류 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

