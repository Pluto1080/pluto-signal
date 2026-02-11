import os
from flask import Flask, request, jsonify, render_template
from google import genai  # 2026년 최신 라이브러리 사용

app = Flask(__name__, template_folder='templates', static_folder='templates')

# API 키 및 클라이언트 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 최신 라이브러리 문법으로 모델 호출 (404 방지)
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=f"너는 점성술사 플루토야. {name}의 오늘 운세를 짧고 명쾌하게 반말로 알려줘."
        )
        
        return jsonify({"result": response.text})

    except Exception as e:
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
