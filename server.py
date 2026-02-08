import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from janome.tokenizer import Tokenizer
import pykakasi

t = Tokenizer()
kks = pykakasi.kakasi()

class TokenizeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/tokenize':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            text = data.get('text', '')
            
            tokens_data = []
            for token in t.tokenize(text):
                surface = token.surface
                reading = token.reading
                pos = token.part_of_speech.split(',')[0]
                
                res = kks.convert(surface)
                hira = "".join([i['hira'] for i in res])
                roma = "".join([i['hepburn'] for i in res])
                
                tokens_data.append({
                    "s": surface,
                    "h": hira if hira != surface else None,
                    "r": roma,
                    "p": pos
                })

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(tokens_data).encode('utf-8'))

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 3000), TokenizeHandler)
    server.serve_forever()