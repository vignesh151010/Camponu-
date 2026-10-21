import pytest


def get_token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    return res.json()["token"]


def test_ai_college_assistant_grounded_attendance(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my attendance percentage?", "mode": "college"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "session_id" in data
    # Response must mention verified attendance
    assert "attendance" in data["reply"].lower() or "%" in data["reply"]


def test_ai_study_assistant_explains_concepts(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.post(
        "/api/v1/ai/chat",
        json={"message": "Can you explain how relational database indexing works?", "mode": "study"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 20


def test_ai_chat_history_isolation(client):
    import time
    unique_marker = f"secret_{int(time.time() * 1000)}"
    token_karthik = get_token(client, "student@camponu.edu", "Student@123")
    token_sarah = get_token(client, "sarah.jenkins@camponu.edu", "Student@123")

    # Karthik creates a chat
    client.post(
        "/api/v1/ai/chat",
        json={"message": f"Private question {unique_marker}", "mode": "college"},
        headers={"Authorization": f"Bearer {token_karthik}"},
    )

    # Sarah requests history — should NOT see Karthik's chat session
    sarah_history = client.get("/api/v1/ai/history", headers={"Authorization": f"Bearer {token_sarah}"})
    assert sarah_history.status_code == 200
    for sess in sarah_history.json():
        assert unique_marker not in sess["title"].lower()

    # Karthik requests history — MUST see his own session
    karthik_history = client.get("/api/v1/ai/history", headers={"Authorization": f"Bearer {token_karthik}"})
    assert any(unique_marker in sess["title"].lower() for sess in karthik_history.json())
