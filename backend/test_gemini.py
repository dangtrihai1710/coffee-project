import requests
import json

# --- THAY THẾ BẰNG API KEY MỚI CỦA BẠN ---
API_KEY = "AIzaSyBB4iuEBZXJsDvPW-z0IzBLcnRsIDJA-EQ" # Nhớ thay key của bạn vào đây

print("💡 Bắt đầu chạy script test_gemini.py...")

# ✅ ĐÃ SỬA LỖI: Thay v1beta thành v1
url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key={API_KEY}"

payload = {
    "contents": [{
        "parts": [{
            "text": "Hãy viết một câu chào bằng tiếng Việt."
        }]
    }]
}

headers = {
    'Content-Type': 'application/json'
}

print("🚀 Đang gửi yêu cầu đến Gemini API...")

try:
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    response.raise_for_status() 

    result = response.json()
    generated_text = result['candidates'][0]['content']['parts'][0]['text']
    
    print("\n✅ KIỂM TRA THÀNH CÔNG!")
    print("---------------------------------")
    print("Gemini trả lời:")
    print(generated_text)
    print("---------------------------------")

except requests.exceptions.HTTPError as err:
    print(f"\n❌ Lỗi HTTP: {err}")
    try:
        error_details = response.json()
        print("Chi tiết lỗi từ API:")
        print(json.dumps(error_details, indent=2))
    except json.JSONDecodeError:
        print("Không thể phân tích chi tiết lỗi. Nội dung phản hồi:")
        print(response.text)
except Exception as e:
    print(f"\n❌ Đã xảy ra lỗi không xác định: {e}")