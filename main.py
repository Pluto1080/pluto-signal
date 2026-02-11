import os
import json
from datetime import datetime
import swisseph as swe
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__, template_folder='templates', static_folder='templates')

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# 스위스 에페메리스 기본 경로 설정
swe.set_ephe_path('')

def calculate_astrology(birth_date, birth_time, latitude, longitude):
    timezone = 9  # KST 기준
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
    utc_hour = dt.hour - timezone + dt.minute / 60.0
    jd = swe.julday(dt.year, dt.month, dt.day, utc_hour)

    zodiac_signs = [
        "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
        "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"
    ]

    def get_sign_and_degree(lon):
        sign_index = int(lon // 30)
        inner_degree = round(lon % 30, 2)
        return f"{zodiac_signs[sign_index]} {inner_degree}도"

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
    asc = round(ascmc[0], 2)
    mc = round(ascmc[1], 2)

    results["ASC"] = {"degree": asc, "sign": get_sign_and_degree(asc)}
    results["MC"] = {"degree": mc, "sign": get_sign_and_degree(mc)}

    sun = swe.calc_ut(jd, swe.SUN)[0][0]
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    pf = (asc + moon - sun) % 360
    results["Fortune"] = {"degree": round(pf, 2), "sign": get_sign_and_degree(pf)}

    for i in range(12):
        cusp_degree = round(house_cusps[i], 2)
        results[f"House_{i+1}_Cusp"] = {"degree": cusp_degree, "sign": get_sign_and_degree(cusp_degree)}

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
        planet_deg = results[name]["degree"]
        results[name]["house"] = get_house(planet_deg, house_cusps)

    return results

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not client:
        return jsonify({"result": "플루토 비명 발생: 서버에 API 키가 없습니다."}), 200

    try:
        data = request.json
        name = data.get('name', '지구인')
        birth_date = data.get('date', '2000-01-01')
        birth_time = data.get('time', '12:00')
        time_unknown = data.get('time_unknown', False)
        lat = float(data.get('lat', 37.5665))
        lon = float(data.get('lon', 126.9780))

        # 별자리 데이터 계산
        astro_data = calculate_astrology(birth_date, birth_time, lat, lon)
        astro_json = json.dumps(astro_data, ensure_ascii=False)

        # 시간을 모를 경우 경고 문구 주입
        warning_instruction = ""
        if time_unknown:
            warning_instruction = """
            [중요 지시사항] 사용자가 태어난 시간을 몰라서 12:00으로 임의 계산했습니다. 
            답변을 시작할 때 반드시 다음 문구를 그대로 말하세요: "시간을 잘 모르는구나. 정확도는 조금 떨어지겠지만 재밌는 이야기 듣는다고 생각하고 들어줘."
            """

        prompt = f"""
        너는 점성술사 플루토야. 말투는 짧고 맵고 건방진 반말이야.
        하지만 분석 자체는 아주 객관적이고 전문적이어야 해. 좋은 것은 좋다, 안 좋은 것은 안 좋다고 명확하게 팩트 기반으로 얘기해줘.
        
        다음은 {name}의 출생 차트 천체 데이터(JSON)야.
        {astro_json}
        
        {warning_instruction}
        
        이 실제 데이터를 바탕으로 {name}의 성향, 잠재력, 피해야 할 것을 객관적이고 전문적으로 분석해서 맵게 팩트폭력 해줘.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        return jsonify({"result": response.text})

    except Exception as e:
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
