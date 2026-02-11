import os
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__, template_folder='templates', static_folder='templates')

api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
# 2026년 최신 클라이언트 설정
client = genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # [핵심] 404를 피하기 위해 모델명을 가장 표준적인 형태로 전달합니다.
        # 만약 gemini-1.5-flash가 안된다면 gemini-2.0-flash-exp 로도 시도해볼 수 있습니다.
        response = client.models.generate_content(
            model='gemini-1.5-flash', 
            contents=f"너는 점성술사 플루토야. {name}의 오늘 운세를 짧고 맵게 반말로 알려줘."
        )
        
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 발생 시 원문을 그대로 출력하여 범인을 잡습니다.
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
