import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template

# [진단] API 키가 실제로 환경 변수에서 읽히는지 체크
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

app = Flask(__name__, template_folder='templates', static_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # 1. API 키 존재 여부 확인
        if not api_key:
            return jsonify({"error": "서버에 API 키가 설정되지 않았습니다. Variables 탭을 확인하세요."}), 500
        
        genai.configure(api_key=api_key)
        
        # 2. 데이터 수신 확인
        data = request.json
        name = data.get('name', '지구인')
        
        # 3. 모델 호출 (가장 범용적인 이름)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"안녕, 나는 {name}이야. 짧게 인사해줘.")
        
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 발생 시 로그와 화면에 에러 내용을 그대로 노출
        error_message = str(e)
        print(f"CRITICAL ERROR: {error_message}")
        return jsonify({"error": f"AI 통신 실패: {error_message}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
