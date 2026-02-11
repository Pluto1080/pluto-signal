import os
from flask import Flask, request, jsonify, render_template
from google import genai

app = Flask(__name__, template_folder='templates', static_folder='templates')

# API 키 설정
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
        
        # [수정 핵심] 'models/'를 빼고 모델명만 정확히 입력합니다. 
        # 1.5-flash가 계속 404라면 'gemini-1.5-flash-latest'로 시도하세요.
        response = client.models.generate_content(
            model='gemini-1.5-flash', 
            contents=f"너는 점성술사 플루토야. {name}의 오늘 운세를 아주 맵고 짧게 반말로 알려줘."
        )
        
        return jsonify({"result": response.text})

    except Exception as e:
        # 에러 내용을 더 명확하게 보기 위해 원문 그대로 출력합니다.
        return jsonify({"result": f"플루토 비명 발생: {str(e)}"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
