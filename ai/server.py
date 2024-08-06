from gevent import pywsgi
from flask import Flask, request, jsonify
from async_call_LLM import translate_text

app = Flask(__name__)


@app.route("/translate", methods=["POST"])
async def translate():
    return jsonify(await translate_text(request.get_json()))


if __name__ == "__main__":
    pywsgi.WSGIServer(("localhost", 3001), app).serve_forever()
