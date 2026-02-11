import os
from flask import Flask, send_from_directory

# 절대 경로를 사용하여 파일 위치를 명확히 합니다.
app = Flask(__name__)
base_dir = os.path.abspath(os.path.dirname(__file__))

@app.route('/')
def index():
    # 파일이 있는 경로를 직접 찍어줍니다.
    return send_from_directory(base_dir, 'index.html')

# 1. API 키 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# static_folder='.' 설정을 통해 루트 폴더의 index.html을 읽어옵니다.
app = Flask(__name__, static_folder='.')

# [추가] 첫 화면(홈페이지)을 띄워주는 경로
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# [유지] 플루토와 통신하는 경로
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # 모델 호출 (가장 안정적인 기본형)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"너는 점성술사 플루토야. {name}의 운세를 아주 짧고 명쾌하게 반말로 알려줘."
        response = model.generate_content(prompt)
        
        return jsonify({"result": response.text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)

