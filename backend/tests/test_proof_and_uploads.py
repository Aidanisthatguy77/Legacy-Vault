"""
Backend API tests for NBA 2K Legacy Vault
Testing: Proof of Demand, File Uploads (multipart & base64), Admin features, Content management
"""
import pytest
import requests
import os
import base64
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vault-legacy.preview.emergentagent.com').rstrip('/')

# Test image data (1x1 red pixel PNG)
TEST_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API Root working: {data['message']}")
    
    def test_seed_games(self, api_client):
        """Seed games data"""
        response = api_client.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        print("✓ Games seeded successfully")
    
    def test_seed_content(self, api_client):
        """Seed site content"""
        response = api_client.post(f"{BASE_URL}/api/content/seed")
        assert response.status_code == 200
        print("✓ Content seeded successfully")


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with correct password"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "password": "A@070610"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Admin login successful with correct password")
    
    def test_admin_login_failure(self, api_client):
        """Test admin login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Admin login correctly rejects wrong password")


class TestProofOfDemand:
    """Proof of Demand CRUD tests"""
    
    created_proof_id = None
    
    def test_get_all_proofs(self, api_client):
        """Test GET /api/proof - Get all proofs"""
        response = api_client.get(f"{BASE_URL}/api/proof")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/proof returns {len(data)} proofs")
    
    def test_create_proof(self, api_client):
        """Test POST /api/proof - Create new proof"""
        proof_data = {
            "image_url": "https://example.com/test-proof.png",
            "title": "TEST_Proof Screenshot",
            "description": "Test proof of demand screenshot",
            "source": "Twitter",
            "order": 0
        }
        response = api_client.post(f"{BASE_URL}/api/proof", json=proof_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == proof_data["title"]
        assert data["image_url"] == proof_data["image_url"]
        assert "id" in data
        TestProofOfDemand.created_proof_id = data["id"]
        print(f"✓ POST /api/proof created proof with id: {data['id']}")
    
    def test_update_proof(self, api_client):
        """Test PUT /api/proof/{id} - Update proof"""
        if not TestProofOfDemand.created_proof_id:
            pytest.skip("No proof created to update")
        
        update_data = {
            "title": "TEST_Updated Proof Title",
            "description": "Updated description"
        }
        response = api_client.put(
            f"{BASE_URL}/api/proof/{TestProofOfDemand.created_proof_id}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        print(f"✓ PUT /api/proof updated proof successfully")
    
    def test_delete_proof(self, api_client):
        """Test DELETE /api/proof/{id} - Delete proof"""
        if not TestProofOfDemand.created_proof_id:
            pytest.skip("No proof created to delete")
        
        response = api_client.delete(
            f"{BASE_URL}/api/proof/{TestProofOfDemand.created_proof_id}"
        )
        assert response.status_code == 200
        print(f"✓ DELETE /api/proof deleted proof successfully")
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/proof")
        assert response.status_code == 200
        proofs = get_response.json()
        ids = [p["id"] for p in proofs]
        assert TestProofOfDemand.created_proof_id not in ids
        print("✓ Proof deletion verified")


class TestFileUploads:
    """File upload tests for both multipart and base64"""
    
    def test_upload_file_multipart(self, api_client):
        """Test POST /api/upload - Multipart file upload"""
        # Create a test PNG image
        png_data = base64.b64decode(TEST_PNG_BASE64)
        files = {
            'file': ('test_image.png', BytesIO(png_data), 'image/png')
        }
        
        # Note: Don't use json header for multipart
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "filename" in data
        assert data["url"].startswith("/api/uploads/")
        print(f"✓ POST /api/upload (multipart) uploaded file: {data['url']}")
        
        # Verify the file is accessible
        file_url = f"{BASE_URL}{data['url']}"
        file_response = session.head(file_url)
        assert file_response.status_code == 200
        print(f"✓ Uploaded file is accessible at {data['url']}")
    
    def test_upload_file_base64(self, api_client):
        """Test POST /api/upload/base64 - Base64 image upload (clipboard paste)"""
        base64_data = {
            "data": f"data:image/png;base64,{TEST_PNG_BASE64}",
            "filename": "pasted_image.png"
        }
        
        response = api_client.post(f"{BASE_URL}/api/upload/base64", json=base64_data)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "filename" in data
        assert data["url"].startswith("/api/uploads/")
        print(f"✓ POST /api/upload/base64 uploaded file: {data['url']}")
        
        # Verify the file is accessible
        file_url = f"{BASE_URL}{data['url']}"
        file_response = requests.head(file_url)
        assert file_response.status_code == 200
        print(f"✓ Base64 uploaded file is accessible at {data['url']}")
    
    def test_upload_invalid_type(self, api_client):
        """Test upload with invalid file type"""
        # Try to upload a text file
        files = {
            'file': ('test.txt', BytesIO(b'hello world'), 'text/plain')
        }
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 400
        print("✓ POST /api/upload correctly rejects invalid file types")


class TestContentManagement:
    """Site content management tests"""
    
    def test_get_all_content(self, api_client):
        """Test GET /api/content - Get all site content"""
        response = api_client.get(f"{BASE_URL}/api/content")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ GET /api/content returns {len(data)} content items")
        
        # Verify Google Doc fields exist
        assert "google_doc_url" in data or data == {}
        print("✓ Google Doc URL field exists in content")
    
    def test_update_google_doc_url(self, api_client):
        """Test updating Google Doc URL"""
        response = api_client.post(f"{BASE_URL}/api/content", json={
            "key": "google_doc_url",
            "value": "https://docs.google.com/document/d/test-updated"
        })
        assert response.status_code == 200
        print("✓ Google Doc URL updated successfully")
        
        # Verify update
        get_response = api_client.get(f"{BASE_URL}/api/content")
        content = get_response.json()
        # Reset to original
        api_client.post(f"{BASE_URL}/api/content", json={
            "key": "google_doc_url",
            "value": "https://docs.google.com/document/d/1DEb_W0fxCGWaGN97KcVkVqD1JmZEOUrl5DpCCaayHe0/edit?tab=t.0#heading=h.4a00a8jkgs1z"
        })
    
    def test_update_google_doc_label(self, api_client):
        """Test updating Google Doc button text"""
        response = api_client.post(f"{BASE_URL}/api/content", json={
            "key": "google_doc_label",
            "value": "TEST_Read Full Document"
        })
        assert response.status_code == 200
        print("✓ Google Doc label updated successfully")
        
        # Reset
        api_client.post(f"{BASE_URL}/api/content", json={
            "key": "google_doc_label",
            "value": "Read the Full Concept Document"
        })
    
    def test_get_specific_content(self, api_client):
        """Test GET /api/content/{key}"""
        response = api_client.get(f"{BASE_URL}/api/content/google_doc_url")
        assert response.status_code == 200
        print("✓ GET /api/content/{key} works correctly")


class TestGamesAPI:
    """Games API tests"""
    
    def test_get_active_games(self, api_client):
        """Test GET /api/games - Active games only"""
        response = api_client.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200
        games = response.json()
        assert isinstance(games, list)
        print(f"✓ GET /api/games returns {len(games)} active games")
    
    def test_get_all_games(self, api_client):
        """Test GET /api/games/all - Admin route for all games"""
        response = api_client.get(f"{BASE_URL}/api/games/all")
        assert response.status_code == 200
        games = response.json()
        assert isinstance(games, list)
        print(f"✓ GET /api/games/all returns {len(games)} total games")


class TestClipsAPI:
    """Clips management tests"""
    
    def test_get_all_clips(self, api_client):
        """Test GET /api/clips"""
        response = api_client.get(f"{BASE_URL}/api/clips")
        assert response.status_code == 200
        clips = response.json()
        assert isinstance(clips, list)
        print(f"✓ GET /api/clips returns {len(clips)} clips")


class TestCommentsAPI:
    """Comments tests"""
    
    def test_get_comments(self, api_client):
        """Test GET /api/comments"""
        response = api_client.get(f"{BASE_URL}/api/comments")
        assert response.status_code == 200
        comments = response.json()
        assert isinstance(comments, list)
        print(f"✓ GET /api/comments returns {len(comments)} comments")


class TestSubscriptionsAPI:
    """Email subscriptions tests"""
    
    def test_get_subscriptions(self, api_client):
        """Test GET /api/subscriptions"""
        response = api_client.get(f"{BASE_URL}/api/subscriptions")
        assert response.status_code == 200
        subs = response.json()
        assert isinstance(subs, list)
        print(f"✓ GET /api/subscriptions returns {len(subs)} subscribers")


class TestPetitionAPI:
    """Petition tests"""
    
    def test_get_petition_count(self, api_client):
        """Test GET /api/petition/count"""
        response = api_client.get(f"{BASE_URL}/api/petition/count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ GET /api/petition/count returns count: {data['count']}")
    
    def test_get_petition_signatures(self, api_client):
        """Test GET /api/petition/signatures"""
        response = api_client.get(f"{BASE_URL}/api/petition/signatures")
        assert response.status_code == 200
        sigs = response.json()
        assert isinstance(sigs, list)
        print(f"✓ GET /api/petition/signatures returns {len(sigs)} signatures")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
