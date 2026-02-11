import os
import google.generativeai as genai
from flask import Flask, request, jsonify

# API 키 설정
api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        name = data.get('name', '지구인')
        
        # [수정 포인트] 모델명을 가장 표준적인 'gemini-1.5-flash'로 설정
        # 만약 여기서 또 404가 난다면 'gemini-pro'로 자동으로 넘어가게 설계했습니다.
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"너는 점성술사야. {name}의 운세를 반말로 짧게 분석해줘."
            response = model.generate_content(prompt)
        except Exception:
            model = genai.GenerativeModel('gemini-pro')
            prompt = f"너는 점성술사야. {name}의 운세를 반말로 짧게 분석해줘."
            response = model.generate_content(prompt)

        return jsonify({"result": response.text})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Railway 포트 설정
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
