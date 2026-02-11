import os
import google.generativeai as genai  # 이 부분이 빠져서 오류가 났던 거예요!
from flask import Flask, request, jsonify, render_template

# 1. API 키 설정 (Railway의 Variables에서 가져옴)
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# 2. Flask가 'templates' 폴더를 인식하도록 설정
app = Flask(__name__, template_folder='templates', static_folder='templates')

@app.route('/')
def index():
    # templates 폴더 안의 index.html을 화면에 띄웁니다
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 변경: 가장 기본형으로 다시 시도
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"너는 점성술사 플루토야. {name}의 운세를 아주 짧고 명쾌하게 반말로 알려줘."
        response = model.generate_content(prompt)
        
        return jsonify({"result": response.text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Railway에서 지정해주는 포트로 서버를 엽니다
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

