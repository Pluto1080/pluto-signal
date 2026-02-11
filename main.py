import os
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__, template_folder='templates', static_folder='templates')

# API 키 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

# 클라이언트 생성 시 API 버전을 명시하지 않고 기본값 사용
client = genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 모델 이름을 'models/' 접두사 없이 아주 명확하게 전달합니다.
        # 만약 1.5-flash가 안 된다면, 가장 안정적인 'gemini-1.5-flash-latest'로 지칭합니다.
        # main.py 수정 (가장 확실한 모델명 사용)
        response = client.models.generate_content(
        model='gemini-1.5-flash', # 'models/'를 붙이지 않는 것이 최신 SDK의 표준입니다.
        contents=f"너는 점성술사 플루토야. {name}의 오늘 운세를 짧고 맵게 반말로 알려줘."
)
        
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 메시지에 'models/' 접두사 관련 문제가 있는지 확인하기 위해 출력을 유지합니다.
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

