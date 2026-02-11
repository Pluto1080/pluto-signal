import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template

# API 키 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

app = Flask(__name__, template_folder='templates', static_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # 1. API 키가 있는지부터 체크
        if not api_key:
            return jsonify({"result": "에러: Railway Variables에 API 키가 없습니다!"}), 200
        
        genai.configure(api_key=api_key)
        data = request.json
        name = data.get('name', '지구인')
        
        # 2. 모델 호출
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # 3. AI 통신 시도
        response = model.generate_content(f"안녕, 나는 {name}이야. 반말로 짧게 인사해줘.")
        
        return jsonify({"result": response.text})

    except Exception as e:
        # [핵심] 에러가 나면 500을 주지 않고, 에러 내용을 '결과'창에 띄워버립니다.
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
