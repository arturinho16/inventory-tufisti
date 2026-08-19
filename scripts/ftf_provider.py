import html as html_lib
import hashlib
import json
import os
import re
import threading
import time
import unicodedata
from pathlib import Path
from difflib import SequenceMatcher
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urljoin, urlparse

from scrapling.fetchers import FetcherSession

BRANDS = {"google":"e7aa12e","honor":"03cd1cd","motorola":"7a815","oneplus":"e7f78a","oppo":"46076a","realme":"83401ab","vivo":"b9e76e","xiaomi":"1e7667"}
BRAND_ALIASES = {"mi": "xiaomi", "iphone": "apple"}
BASE = "https://www.devicespecifications.com"
REQUEST_INTERVAL_SECONDS = max(0.0, float(os.getenv("FTF_REQUEST_INTERVAL_SECONDS", "120")))
MAX_RETRIES = max(1, int(os.getenv("FTF_MAX_RETRIES", "2")))
RETRY_BASE_SECONDS = max(0.1, float(os.getenv("FTF_RETRY_BASE_SECONDS", "1")))
MAX_CANDIDATES = min(10, max(1, int(os.getenv("FTF_MAX_CANDIDATES", "5"))))
BLOCK_PATTERNS = ("verify you are human", "just a moment", "checking your browser", "captcha", "challenge-platform", "recaptcha", "hcaptcha", "please verify")
_request_lock = threading.Lock()
_last_request_at = 0.0
HTML_STORAGE_DIR = Path(os.getenv("FTF_HTML_STORAGE_DIR", "storage/html"))
HTML_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class ProviderBlocked(RuntimeError):
    pass


def clean(value):
    return re.sub(r"\s+", " ", html_lib.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def cell_lines(value):
    """Conserva las líneas visibles de una celda sin mezclar su texto de ayuda."""
    value = re.sub(r"<p\b[^>]*>[\s\S]*?</p>", "", value or "", flags=re.I)
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    visible = html_lib.unescape(re.sub(r"<[^>]+>", " ", value))
    lines = []
    for item in visible.splitlines():
        item = re.sub(r"\s+", " ", item).strip()
        if item and item not in lines:
            lines.append(item)
    return lines


def norm(value):
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9+]+", " ", value).strip()


def norm_brand(value):
    value = norm(value)
    return BRAND_ALIASES.get(value, value)


def norm_model(value, brand):
    value, prefix = norm(value), norm_brand(brand) + " "
    return value[len(prefix):] if value.startswith(prefix) else value


def key(value):
    return re.sub(r"[^a-z0-9]+", "_", norm(value)).strip("_")


def response_body(page):
    body = getattr(page, "body", b"")
    return body.decode("utf-8", "ignore") if isinstance(body, bytes) else str(body)


def validate_response(page, body, url):
    status = getattr(page, "status", None) or getattr(page, "status_code", None)
    lowered = body.lower()
    if status in {403, 429}:
        raise ProviderBlocked(f"DeviceSpecifications bloqueó temporalmente la consulta (HTTP {status}).")
    if status and int(status) >= 400:
        raise RuntimeError(f"DeviceSpecifications respondió HTTP {status} para {url}.")
    if not body.strip():
        raise RuntimeError(f"DeviceSpecifications devolvió una respuesta vacía para {url}.")
    # Una página válida puede incluir referencias a CAPTCHA dentro de scripts.
    # Igual que busquedaPhone, el contenido técnico real tiene prioridad.
    if re.search(r"<h1[^>]*>[^<]+</h1>", body, re.I):
        return
    pattern = next((item for item in BLOCK_PATTERNS if item in lowered), None)
    if pattern:
        raise ProviderBlocked(f"DeviceSpecifications solicitó verificación humana ({pattern}).")
    raise RuntimeError(f"DeviceSpecifications no devolvió contenido técnico reconocible para {url}.")


def cache_path(url):
    return HTML_STORAGE_DIR / f"{hashlib.sha256(url.encode()).hexdigest()}.html"


def fetch(session, url):
    global _last_request_at
    cached = cache_path(url)
    if "/en/model/" in url and cached.exists():
        body = cached.read_text(encoding="utf-8")
        validate_response(None, body, url)
        return None, body
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with _request_lock:
                wait = REQUEST_INTERVAL_SECONDS - (time.monotonic() - _last_request_at)
                if wait > 0:
                    time.sleep(wait)
                page = session.get(url, stealthy_headers=True)
                _last_request_at = time.monotonic()
            body = response_body(page)
            validate_response(page, body, url)
            if "/en/model/" in url:
                cached.write_text(body, encoding="utf-8")
            return page, body
        except ProviderBlocked:
            raise
        except Exception as error:
            last_error = error
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BASE_SECONDS * (2 ** (attempt - 1)))
    raise RuntimeError(f"No fue posible consultar DeviceSpecifications después de {MAX_RETRIES} intento(s): {last_error}")


def parse_ftf(raw):
    title_match = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", raw, re.I)
    title = re.sub(r"\s*-\s*Specifications.*$", "", clean(title_match.group(1) if title_match else ""), flags=re.I)
    sections = []
    pattern = re.compile(r'<header[^>]*class="[^"]*section-header[^"]*"[^>]*>([\s\S]*?)</header>([\s\S]*?)(?=<header[^>]*class="[^"]*section-header|$)', re.I)
    for match in pattern.finditer(raw):
        heading = re.search(r"<h2[^>]*>([\s\S]*?)</h2>", match.group(1), re.I)
        name, block = clean(heading.group(1) if heading else match.group(1)), match.group(2)
        table = re.search(r"<table[\s\S]*?</table>", block, re.I)
        fields = []
        if table:
            for row in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", table.group(0), re.I):
                cells = re.findall(r"<(?:td|th)[^>]*>([\s\S]*?)</(?:td|th)>", row.group(1), re.I)
                if len(cells) >= 2:
                    labels, values = cell_lines(cells[0]), cell_lines(cells[-1])
                    if labels and values:
                        expanded = []
                        for value in values:
                            expanded.extend(item.strip() for item in value.split("|") if item.strip())
                        fields.append({"etiqueta": labels[0], "valores": expanded or values})
        if name and fields:
            sections.append({"clave": key(name), "titulo": name, "campos": fields})
    identity = next((section for section in sections if "brand_and_model" in section["clave"]), None)
    def field(section, label):
        found = next((item for item in (section or {}).get("campos", []) if item["etiqueta"].lower() == label.lower()), None)
        return found["valores"][0] if found else None
    brand = field(identity, "Brand") or (title.split()[0] if title else "")
    model = field(identity, "Model") or title[len(brand):].strip()
    display = next((section for section in sections if section["clave"] == "display" or section["clave"].startswith("display_")), None)
    diagonal_raw = field(display, "Diagonal size")
    number = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:in|inches)\b", diagonal_raw or "", re.I)
    if not brand or not model or not sections:
        raise RuntimeError("La página no contiene una FTF reconocible.")
    return {"proveedor":"DeviceSpecifications","marca":brand,"modelo":model,"diagonal":float(number.group(1).replace(",", ".")) if number else None,"secciones":sections}


def search(brand, model):
    brand_id = BRANDS.get(norm_brand(brand).replace(" ", ""))
    if not brand_id:
        raise ValueError(f"Marca sin catálogo configurado: {brand}")
    with FetcherSession(impersonate="chrome") as session:
        page, _ = fetch(session, f"{BASE}/en/brand/{brand_id}")
        listings = {}
        for anchor in page.css("a"):
            url = anchor.attrib.get("href", "")
            text = " ".join(anchor.css("::text").getall()).strip()
            if "/en/model/" in url and text:
                listings[urljoin(BASE, url)] = text
        if not listings:
            raise RuntimeError("DeviceSpecifications no devolvió modelos; posible verificación del proveedor.")
        expected = norm_model(model, brand)
        ranked = sorted(((SequenceMatcher(None, expected, norm_model(text, brand)).ratio(), url, text) for url, text in listings.items()), reverse=True)
        ranked = [item for item in ranked if item[0] >= .45]
        ranked = ranked[:1] if ranked and ranked[0][0] == 1 else ranked[:MAX_CANDIDATES]
        results = []
        errors = []
        for score, url, listing_model in ranked:
            try:
                _, raw = fetch(session, url)
                ficha = parse_ftf(raw)
                results.append({"url":url,"ficha":ficha,"puntuacionListado":round(score * 100, 2),"modeloListado":listing_model})
            except ProviderBlocked:
                raise
            except Exception as error:
                errors.append(f"{listing_model}: {error}")
        if not results and errors:
            raise RuntimeError("No se pudo leer ningún candidato: " + "; ".join(errors[:3]))
        return results


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/salud":
            return self.reply(200, {"ok": True, "proveedor": "DeviceSpecifications", "scrapling": True})
        if parsed.path == "/extraer":
            query = parse_qs(parsed.query)
            target = query.get("url", [""])[0].strip()
            target_parsed = urlparse(target)
            if target_parsed.scheme != "https" or target_parsed.hostname not in {"devicespecifications.com", "www.devicespecifications.com"} or not target_parsed.path.startswith("/en/model/"):
                return self.reply(400, {"error": "La URL debe pertenecer a un modelo de DeviceSpecifications."})
            try:
                with FetcherSession(impersonate="chrome") as session:
                    _, raw = fetch(session, target)
                    return self.reply(200, {"url": target, "ficha": parse_ftf(raw)})
            except ProviderBlocked as error:
                return self.reply(503, {"error": str(error), "bloqueado": True})
            except Exception as error:
                return self.reply(502, {"error": str(error)})
        if parsed.path != "/buscar":
            return self.reply(404, {"error":"Ruta no encontrada"})
        query = parse_qs(parsed.query)
        brand, model = query.get("marca", [""])[0].strip(), query.get("modelo", [""])[0].strip()
        if not brand or not model:
            return self.reply(400, {"error": "Marca y modelo son obligatorios."})
        try:
            self.reply(200, {"candidatos": search(brand, model)})
        except ProviderBlocked as error:
            self.reply(503, {"error": str(error), "bloqueado": True})
        except Exception as error:
            self.reply(502, {"error": str(error)})

    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
