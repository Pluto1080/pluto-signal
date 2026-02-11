import os
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__, template_folder='templates', static_folder='templates')

# API 키 가져오기
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

# 2026년 최신 라이브러리용 클라이언트 설정
client = None
if api_key:
    client = genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    # API 키 누락 체크
    if not client:
        return jsonify({"result": "플루토 비명 발생: 서버에 API 키가 설정되지 않았어! Railway Variables를 확인해."}), 200

    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 404 에러가 발생하지 않는 최신 호출 방식
        response = client.models.generate_content(
            model='gemini-1.5-flash', 
            contents=f"너는 점성술사 플루토야. {name}의 오늘 운세를 아주 맵고 짧게 반말로 알려줘."
        )
        
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 발생 시 원인을 웹 화면에 그대로 출력
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
