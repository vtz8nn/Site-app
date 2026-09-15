"""Backend tests for Estoque API (auth, config, products, multi-user isolation)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@estoque.com"
ADMIN_PASSWORD = "admin123"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_a():
    email = f"test_a_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "UserA"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["access_token"], "user_id": d["user_id"]}


@pytest.fixture(scope="module")
def user_b():
    email = f"test_b_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "UserB"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["access_token"], "user_id": d["user_id"]}


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_token_and_sets_cookie(self):
        email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Reg"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["email"] == email
        assert "user_id" in data
        assert "access_token" in r.cookies

    def test_register_duplicate(self, user_a):
        r = requests.post(f"{API}/auth/register", json={"email": user_a["email"], "password": "pass1234"})
        assert r.status_code == 400

    def test_login_admin_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["access_token"]

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert "password_hash" not in r.json()

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookie(self, admin_token):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in s.cookies
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # cookie removed or empty in response
        # requests keeps set-cookie header; check the delete header presence
        set_cookie = r2.headers.get("set-cookie", "")
        assert "access_token" in set_cookie


# ---------- Config ----------
class TestConfig:
    def test_default_config_for_new_user(self, user_a):
        r = requests.get(f"{API}/config", headers=H(user_a["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["whatsapp_dono"] == ""
        assert d["store_name"] == "Minha Loja"

    def test_update_and_get_config(self, user_a):
        payload = {"whatsapp_dono": "5511999999999", "store_name": "Loja Teste"}
        r = requests.put(f"{API}/config", headers=H(user_a["token"]), json=payload)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/config", headers=H(user_a["token"]))
        assert r2.status_code == 200
        d = r2.json()
        assert d["whatsapp_dono"] == "5511999999999"
        assert d["store_name"] == "Loja Teste"

    def test_config_requires_auth(self):
        assert requests.get(f"{API}/config").status_code == 401
        assert requests.put(f"{API}/config", json={"whatsapp_dono": "x", "store_name": "y"}).status_code == 401


# ---------- Products ----------
BASE64_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


class TestProducts:
    def test_products_requires_auth(self):
        assert requests.get(f"{API}/products").status_code == 401
        assert requests.post(f"{API}/products", json={}).status_code == 401

    def test_create_product_full(self, user_a):
        payload = {
            "nome": "Camiseta Azul",
            "foto_url": BASE64_IMG,
            "preco_venda": 59.9,
            "quantidade_estoque": 10,
            "estoque_minimo": 3,
            "whatsapp_fornecedor": "5511988887777",
        }
        r = requests.post(f"{API}/products", headers=H(user_a["token"]), json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["nome"] == "Camiseta Azul"
        assert d["preco_venda"] == 59.9
        assert d["quantidade_estoque"] == 10
        assert d["foto_url"].startswith("data:image")
        assert "_id" not in d
        user_a["pid"] = d["id"]

    def test_list_products_only_own(self, user_a, user_b):
        # user_b has no products yet
        rb = requests.get(f"{API}/products", headers=H(user_b["token"]))
        assert rb.status_code == 200
        assert all(p.get("user_id") != user_a["user_id"] for p in rb.json())
        # user_a lists their product
        ra = requests.get(f"{API}/products", headers=H(user_a["token"]))
        assert ra.status_code == 200
        ids = [p["id"] for p in ra.json()]
        assert user_a["pid"] in ids

    def test_get_product_by_id(self, user_a):
        r = requests.get(f"{API}/products/{user_a['pid']}", headers=H(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == user_a["pid"]

    def test_get_other_users_product_404(self, user_a, user_b):
        r = requests.get(f"{API}/products/{user_a['pid']}", headers=H(user_b["token"]))
        assert r.status_code == 404

    def test_partial_update(self, user_a):
        r = requests.put(
            f"{API}/products/{user_a['pid']}",
            headers=H(user_a["token"]),
            json={"nome": "Camiseta Preta"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["nome"] == "Camiseta Preta"
        assert r.json()["preco_venda"] == 59.9  # unchanged

    def test_other_user_cannot_update(self, user_a, user_b):
        r = requests.put(
            f"{API}/products/{user_a['pid']}",
            headers=H(user_b["token"]),
            json={"nome": "Hacked"},
        )
        assert r.status_code == 404

    def test_adjust_decrement_and_floor(self, user_a):
        # current qty = 10
        r = requests.post(
            f"{API}/products/{user_a['pid']}/adjust",
            headers=H(user_a["token"]),
            json={"delta": -1},
        )
        assert r.status_code == 200, r.text
        assert r.json()["quantidade_estoque"] == 9

        # decrement a lot; floor at 0
        r2 = requests.post(
            f"{API}/products/{user_a['pid']}/adjust",
            headers=H(user_a["token"]),
            json={"delta": -1000},
        )
        assert r2.status_code == 200
        assert r2.json()["quantidade_estoque"] == 0

    def test_adjust_increment(self, user_a):
        r = requests.post(
            f"{API}/products/{user_a['pid']}/adjust",
            headers=H(user_a["token"]),
            json={"delta": 5},
        )
        assert r.status_code == 200
        assert r.json()["quantidade_estoque"] == 5

    def test_other_user_cannot_delete(self, user_a, user_b):
        r = requests.delete(f"{API}/products/{user_a['pid']}", headers=H(user_b["token"]))
        assert r.status_code == 404

    def test_delete_and_verify(self, user_a):
        r = requests.delete(f"{API}/products/{user_a['pid']}", headers=H(user_a["token"]))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/products/{user_a['pid']}", headers=H(user_a["token"]))
        assert r2.status_code == 404


class TestIsolationConfig:
    def test_config_isolated(self, user_a, user_b):
        # user_a set config previously; user_b should still have defaults
        r = requests.get(f"{API}/config", headers=H(user_b["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["whatsapp_dono"] == ""
        assert d["store_name"] == "Minha Loja"
