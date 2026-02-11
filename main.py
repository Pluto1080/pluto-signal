import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template

# API 키 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

app = Flask(__name__, template_folder='templates', static_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 모델 설정 및 응답 생성# v1beta에서 인식할 수 있도록 'models/' 접두어를 붙여줍니다.
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"너는 점성술사 플루토야. {name}의 오늘 운세를 아주 짧고 명쾌하게 반말로 알려줘."
        response = model.generate_content(prompt)
        
        # 성공 시 result라는 이름으로 텍스트 전달
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 발생 시 내용을 화면에 출력하도록 전달
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)


