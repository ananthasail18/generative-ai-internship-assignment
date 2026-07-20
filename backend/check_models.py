import urllib.request, json, os

api_key = os.environ.get("GEMINI_API_KEY", "")
if not api_key:
    print("NO KEY")
    exit(1)

req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
res = urllib.request.urlopen(req)
data = json.loads(res.read())
for m in data['models']:
    if 'flash' in m['name'] or 'gemini' in m['name']:
        print(m['name'])
