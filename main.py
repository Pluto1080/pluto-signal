import os
import datetime
import swisseph as swe
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Railway의 Variables에서 설정한 API 키를 가져옵니다.
GENAI_API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=GENAI_API_KEY)

PLANETS = {
    "태양": swe.SUN, "달": swe.MOON, "수성": swe.MERCURY, "금성": swe.VENUS,
    "화성": swe.MARS, "목성": swe.JUPITER, "토성": swe.SATURN,
    "천왕성": swe.URANUS, "해왕성": swe.NEPTUNE, "명왕성": swe.PLUTO
}

def calculate_natal_chart(jd, lat, lon):
    swe.set_topo(lon, lat, 0)
    result = {}
    for name, code in PLANETS.items():
        pos = swe.calc_ut(jd, code)[0][0]
        result[name] = pos
    _, asc_mc = swe.houses(jd, lat, lon)
    result["상승점"] = asc_mc[0]
    result["중천점"] = asc_mc[1]
    return result

def find_3deg_triggers(natal_chart):
    now = datetime.datetime.now()
    jd_now = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60)
    triggers = []
    for t_name, t_code in PLANETS.items():
        t_pos = swe.calc_ut(jd_now, t_code)[0][0]
        for n_name, n_pos in natal_chart.items():
            diff = abs(t_pos - n_pos) % 360
            if diff > 180: diff = 360 - diff
            for aspect in [0, 90, 120, 180]:
                orb = abs(diff - aspect)
                if orb <= 3.0:
                    triggers.append(f"{t_name}(현재)와 {n_name}(탄생)이 {aspect}도 각도 (오차 {round(orb, 2)}°)")
    return triggers

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    name = data['name']
    birth_str = data['birth']
    lat, lon = float(data['lat']), float(data['lon'])
    
    dt = datetime.datetime.strptime(birth_str, "%Y%m%d%H%M") - datetime.timedelta(hours=9)
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60)
    
    natal = calculate_natal_chart(jd, lat, lon)
    triggers = find_3deg_triggers(natal)
    
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=f"너는 GEM-875 행성에서 온 요정 왕 '플루토'야. 말투는 말괄량이 같고 직설적인 반말을 써. {name}의 데이터를 보고 3도 이내 트리거를 기반으로 팩트 폭격을 해줘."
    )
    
    prompt = f"내 차트: {natal}\n오늘 트리거: {triggers}\n이걸로 내 성격과 오늘 운세를 분석해줘!"
    response = model.generate_content(prompt)
    
    return jsonify({"response": response.text})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))