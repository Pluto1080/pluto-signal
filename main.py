import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder='templates', static_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # 1. API 키를 함수 안에서 매번 확인 (가장 확실한 방식)
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "API 키를 찾을 수 없습니다. Railway Variables를 확인하세요."}), 500
        
        genai.configure(api_key=api_key)

        # 2. 데이터 수신 확인
        data = request.json
        name = data.get('name', '지구인')
        
        # 3. 모델 호출 및 응답 생성
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"너는 점성술사 플루토야. {name}의 운세를 아주 짧게 반말로 말해줘.")
        
        # 4. 결과 반환
        if response and response.text:
            return jsonify({"result": response.text})
        else:
            return jsonify({"error": "AI 응답이 비어있습니다."}), 500

    except Exception as e:
        # 에러 발생 시 로그에 상세 정보를 남깁니다.
        print(f"--- [CRITICAL ERROR] ---")
        print(str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
