import importlib.util
import pathlib
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


class FakeSession:
    pass


scrapling = types.ModuleType("scrapling")
fetchers = types.ModuleType("scrapling.fetchers")
fetchers.FetcherSession = FakeSession
scrapling.fetchers = fetchers
sys.modules.setdefault("scrapling", scrapling)
sys.modules.setdefault("scrapling.fetchers", fetchers)

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("ftf_provider", ROOT / "scripts" / "ftf_provider.py")
provider = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(provider)


class Page:
    def __init__(self, body="<html><h1>OK</h1></html>", status=200):
        self.body = body.encode()
        self.status = status


class Session:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = 0

    def get(self, *_args, **_kwargs):
        self.calls += 1
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_patch = patch.object(provider, "HTML_STORAGE_DIR", pathlib.Path(self.temp_dir.name))
        self.storage_patch.start()
        provider._last_request_at = 0.0

    def tearDown(self):
        self.storage_patch.stop()
        self.temp_dir.cleanup()

    def test_detecta_bloqueo_http_sin_reintentar(self):
        session = Session([Page("Forbidden", 429), Page()])
        with self.assertRaisesRegex(provider.ProviderBlocked, "HTTP 429"):
            provider.fetch(session, "https://www.devicespecifications.com/en/model/test")
        self.assertEqual(session.calls, 1)

    def test_detecta_challenge_en_html(self):
        with self.assertRaisesRegex(provider.ProviderBlocked, "verificación humana"):
            provider.validate_response(Page("Just a moment... checking your browser"), "Just a moment... checking your browser", "https://example.test")

    def test_no_confunde_script_captcha_con_pagina_tecnica(self):
        body = "<html><script>const captcha=true</script><h1>Motorola Razr 50 - Specifications</h1></html>"
        provider.validate_response(Page(body), body, "https://www.devicespecifications.com/en/model/test")

    def test_reintenta_error_transitorio(self):
        session = Session([RuntimeError("temporal"), Page()])
        with patch.object(provider, "MAX_RETRIES", 2), patch.object(provider, "REQUEST_INTERVAL_SECONDS", 0), patch.object(provider, "RETRY_BASE_SECONDS", 0):
            _, body = provider.fetch(session, "https://www.devicespecifications.com/en/model/test")
        self.assertIn("<h1>OK</h1>", body)
        self.assertEqual(session.calls, 2)

    def test_parsea_todas_las_secciones_y_valores(self):
        html = """
        <h1>Xiaomi Redmi Note 14 Pro 5G - Specifications</h1>
        <header class="section-header"><h2>Brand and model</h2></header>
        <table><tr><td>Brand</td><td>Xiaomi</td></tr><tr><td>Model</td><td>Redmi Note 14 Pro 5G</td></tr></table>
        <header class="section-header"><h2>Display</h2></header>
        <table><tr><td>Diagonal size</td><td>6.67 in</td></tr><tr><td>Other features</td><td>HDR | DCI-P3</td></tr></table>
        <header class="section-header"><h2>Wi-Fi</h2></header>
        <table><tr><td>Standards</td><td>802.11 a/b/g/n/ac</td></tr></table>
        """
        ficha = provider.parse_ftf(html)
        self.assertEqual(ficha["marca"], "Xiaomi")
        self.assertEqual(ficha["diagonal"], 6.67)
        self.assertEqual([section["clave"] for section in ficha["secciones"]], ["brand_and_model", "display", "wi_fi"])
        self.assertEqual(ficha["secciones"][1]["campos"][1]["valores"], ["HDR", "DCI-P3"])

    def test_parsea_html_real_sin_mezclar_descripcion_del_campo(self):
        html = """
        <h1>Honor 600e - Specifications</h1>
        <header class="section-header"><h2 class="header">Brand and model</h2></header>
        <table class="model-information-table">
          <tr><td>Brand<p>Brand name of the company.</p></td><td>Honor</td></tr>
          <tr><td>Model<p>Model name of the device.</p></td><td>600e</td></tr>
        </table>
        <header class="section-header"><h2 class="header">Display</h2></header>
        <table class="model-information-table">
          <tr><td>Diagonal size<p>Display size is measured diagonally.</p></td>
          <td><span></span>6.6 in <span>(inches)</span><br />167.64 mm <span>(millimeters)</span><br />16.76 cm</td></tr>
          <tr><td>Width<p>Approximate display width.</p></td><td>70.25 mm<br />2.77 in</td></tr>
        </table>
        """
        ficha = provider.parse_ftf(html)
        display = ficha["secciones"][1]
        self.assertEqual(ficha["marca"], "Honor")
        self.assertEqual(ficha["modelo"], "600e")
        self.assertEqual(ficha["diagonal"], 6.6)
        self.assertEqual(display["campos"][0]["etiqueta"], "Diagonal size")
        self.assertEqual(display["campos"][0]["valores"], ["6.6 in (inches)", "167.64 mm (millimeters)", "16.76 cm"])


if __name__ == "__main__":
    unittest.main()
