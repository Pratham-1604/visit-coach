def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_list_schools_has_seed_data_and_focus(client):
    schools = client.get("/api/schools").json()
    assert len(schools) > 0
    assert schools[0]["focus"]["area"] in ("literacy", "numeracy", "general")


def test_get_school_includes_teachers(client):
    school_id = client.get("/api/schools").json()[0]["id"]
    school = client.get(f"/api/schools/{school_id}").json()
    assert len(school["teachers"]) > 0


def test_unknown_school_is_404(client):
    assert client.get("/api/schools/99999").status_code == 404
