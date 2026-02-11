import os
import json
from datetime import datetime
import pyswisseph as swe
from flask import Flask, request, jsonify, render_template
from google import genai
import re

# 타임존 자동 계산을 위한 라이브러리
import pytz
from timezonefinder import TimezoneFinder

app = Flask(__name__, template_folder='templates', static_folder='templates')

# 타임존 파인더 초기화 (서버 실행 시 한 번 로드)
tf = TimezoneFinder()

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def calculate_astrology(birth_date, birth_time, latitude, longitude):
    # 위도/경도로 타임존 이름 찾기 (예: 'Asia/Seoul')
    tz_name = tf.timezone_at(lng=longitude, lat=latitude) or 'UTC'
    timezone = pytz.timezone(tz_name)
    
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
    
    # 해당 지역의 당시 시간 차이(Offset) 자동 계산 (서머타임 포함)
    local_dt = timezone.localize(dt)
    utc_offset = local_dt.utcoffset().total_seconds() / 3600.0
    
    # 우주 시간(JD) 계산
    utc_hour = dt.hour - utc_offset + dt.minute / 60.0
    jd = swe.julday(dt.year, dt.month, dt.day, utc_hour)

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
        return jsonify({"error": "서버 API 키 설정 오류"}), 200

    try:
        data = request.json
        # [추가] 프론트엔드에서 보낸 언어 정보 수집 (기본값 ko-KR)
        user_lang = data.get('language', 'ko-KR')
        
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
            # 언어에 맞춰 경고 문구 유동적 변경 가능하지만, 여기서는 지침으로 전달
            warning_instruction = f"""
            [중요 지시사항] 사용자가 태어난 시간을 모릅니다. 
            반드시 '{user_lang}' 언어로 "시간을 잘 모르는구나. 정확도는 조금 떨어지겠지만 재밌는 이야기 듣는다고 생각하고 들어줘." 라는 의미의 문장으로 'personality' 분석을 시작하세요.
            """

        # [수정] 언어 지침 강화 프롬프트
        prompt = f"""
        너는 사이버펑크 점성술사 플루토야. 
        [절대 규칙]
        1. 반드시 사용자의 시스템 언어인 '{user_lang}' 언어로만 모든 답변을 작성해라.
        2. 말투는 '{user_lang}' 언어권에서 가장 친근하지만, 반말 스타일이어야 한다.
        
        제공된 천체 데이터를 바탕으로 {name}을 분석해.
        
        {warning_instruction}
        
        **반드시 아래의 JSON 형식으로만 대답해. 마크다운 기호(```)를 쓰지 말고 순수 JSON만 출력해.**
        {{
            "personality": "성격과 기질 분석 (반드시 {user_lang}로 작성)",
            "pros": "핵심 장점 요약 (반드시 {user_lang}로 작성)",
            "cons": "핵심 단점 팩트폭력 (반드시 {user_lang}로 작성)"
        }}

        [데이터]
        {astro_json}
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        cleaned_text = re.sub(r"```json|```", "", response.text).strip()
        result_json = json.loads(cleaned_text)
        
        return jsonify(result_json)

    except Exception as e:
        return jsonify({"error": f"치명적 오류 발생: {str(e)}"}), 200

if __name__ == "__main__":
    # Railway가 정해준 포트를 읽어오고, 없으면 8080을 쓰라는 뜻입니다.
    port = int(os.environ.get("PORT", 8080)) 
    app.run(host='0.0.0.0', port=port)


