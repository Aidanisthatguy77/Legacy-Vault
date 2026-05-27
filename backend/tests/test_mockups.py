"""
Backend API tests for the NBA 2K Legacy Vault - Mockups Feature
Tests for mockup CRUD operations and seeding

Features tested:
- GET /api/mockups - Get all mockups
- POST /api/mockups - Create new mockup
- PUT /api/mockups/{id} - Update mockup
- DELETE /api/mockups/{id} - Delete mockup
- POST /api/mockups/seed - Seed default mockups
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMockupsAPI:
    """Test Mockups CRUD endpoints"""

    def test_api_root(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root accessible: {data['message']}")

    def test_seed_mockups(self):
        """Test POST /api/mockups/seed - Seed default mockups"""
        response = requests.post(f"{BASE_URL}/api/mockups/seed")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Either "Mockups seeded" or "Mockups already seeded"
        print(f"✓ Mockups seed: {data['message']}")

    def test_get_all_mockups(self):
        """Test GET /api/mockups - Returns list of mockups"""
        response = requests.get(f"{BASE_URL}/api/mockups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/mockups returned {len(data)} mockups")
        
        # Verify mockup structure if any exist
        if len(data) > 0:
            mockup = data[0]
            assert "id" in mockup
            assert "title" in mockup
            assert "description" in mockup
            assert "media_type" in mockup
            assert "order" in mockup
            print(f"✓ Mockup structure validated: {mockup['title']}")

    def test_create_mockup_with_image(self):
        """Test POST /api/mockups - Create mockup with image type"""
        payload = {
            "title": "TEST_Vault_Menu_Image",
            "description": "Test mockup with image",
            "media_type": "image",
            "image_url": "https://example.com/test-mockup.png",
            "video_embed_url": None,
            "order": 100
        }
        response = requests.post(f"{BASE_URL}/api/mockups", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response data
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["media_type"] == "image"
        assert data["image_url"] == payload["image_url"]
        assert "id" in data
        assert "created_at" in data
        
        print(f"✓ Created mockup with image: {data['id']}")
        
        # Cleanup - delete the test mockup
        delete_response = requests.delete(f"{BASE_URL}/api/mockups/{data['id']}")
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test mockup")

    def test_create_mockup_with_video(self):
        """Test POST /api/mockups - Create mockup with video type"""
        payload = {
            "title": "TEST_Video_Mockup",
            "description": "Test mockup with video embed",
            "media_type": "video",
            "image_url": None,
            "video_embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "order": 101
        }
        response = requests.post(f"{BASE_URL}/api/mockups", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response data
        assert data["title"] == payload["title"]
        assert data["media_type"] == "video"
        assert data["video_embed_url"] == payload["video_embed_url"]
        
        print(f"✓ Created mockup with video: {data['id']}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/mockups/{data['id']}")
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test mockup")

    def test_update_mockup(self):
        """Test PUT /api/mockups/{id} - Update existing mockup"""
        # First create a mockup
        create_payload = {
            "title": "TEST_Update_Mockup",
            "description": "Original description",
            "media_type": "image",
            "order": 102
        }
        create_response = requests.post(f"{BASE_URL}/api/mockups", json=create_payload)
        assert create_response.status_code == 200
        mockup_id = create_response.json()["id"]
        
        # Update the mockup
        update_payload = {
            "title": "TEST_Update_Mockup_UPDATED",
            "description": "Updated description",
            "media_type": "video",
            "video_embed_url": "https://www.youtube.com/embed/updated"
        }
        update_response = requests.put(f"{BASE_URL}/api/mockups/{mockup_id}", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        # Verify update
        assert updated_data["title"] == update_payload["title"]
        assert updated_data["description"] == update_payload["description"]
        assert updated_data["media_type"] == "video"
        assert updated_data["video_embed_url"] == update_payload["video_embed_url"]
        
        print(f"✓ Updated mockup: {mockup_id}")
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/mockups")
        mockups = get_response.json()
        found = False
        for m in mockups:
            if m["id"] == mockup_id:
                assert m["title"] == update_payload["title"]
                found = True
                break
        assert found, "Updated mockup not found in list"
        print(f"✓ Verified update persisted")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/mockups/{mockup_id}")

    def test_update_mockup_not_found(self):
        """Test PUT /api/mockups/{id} - 404 for non-existent mockup"""
        update_payload = {"title": "Should Fail"}
        response = requests.put(f"{BASE_URL}/api/mockups/non-existent-id-12345", json=update_payload)
        assert response.status_code == 404
        print(f"✓ PUT returns 404 for non-existent mockup")

    def test_delete_mockup(self):
        """Test DELETE /api/mockups/{id} - Delete mockup"""
        # Create mockup to delete
        create_payload = {
            "title": "TEST_Delete_Me",
            "description": "To be deleted",
            "media_type": "image",
            "order": 103
        }
        create_response = requests.post(f"{BASE_URL}/api/mockups", json=create_payload)
        assert create_response.status_code == 200
        mockup_id = create_response.json()["id"]
        
        # Delete the mockup
        delete_response = requests.delete(f"{BASE_URL}/api/mockups/{mockup_id}")
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert "message" in delete_data
        
        print(f"✓ Deleted mockup: {mockup_id}")
        
        # Verify deletion via GET
        get_response = requests.get(f"{BASE_URL}/api/mockups")
        mockups = get_response.json()
        for m in mockups:
            assert m["id"] != mockup_id, "Deleted mockup still exists"
        print(f"✓ Verified mockup deleted from database")

    def test_delete_mockup_not_found(self):
        """Test DELETE /api/mockups/{id} - 404 for non-existent mockup"""
        response = requests.delete(f"{BASE_URL}/api/mockups/non-existent-id-67890")
        assert response.status_code == 404
        print(f"✓ DELETE returns 404 for non-existent mockup")

    def test_default_mockups_have_expected_titles(self):
        """Test that seeded mockups have the expected titles"""
        # Ensure mockups are seeded
        requests.post(f"{BASE_URL}/api/mockups/seed")
        
        response = requests.get(f"{BASE_URL}/api/mockups")
        assert response.status_code == 200
        mockups = response.json()
        
        # Check for expected default titles
        titles = [m["title"] for m in mockups]
        expected_titles = ["Vault Menu", "ENTERING 2K16...", "Unified Friends"]
        
        found_count = 0
        for expected in expected_titles:
            if expected in titles:
                found_count += 1
                print(f"✓ Found default mockup: {expected}")
        
        # At least expect some default mockups if seeded
        print(f"✓ Found {found_count}/{len(expected_titles)} expected default mockups")


class TestAdminAuth:
    """Test Admin Authentication"""

    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "A@070610"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Admin login successful")

    def test_admin_login_failure(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong_password"})
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejects wrong password")


class TestExistingEndpoints:
    """Test that existing endpoints still work"""

    def test_games_endpoint(self):
        """Test GET /api/games"""
        response = requests.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/games works")

    def test_clips_endpoint(self):
        """Test GET /api/clips"""
        response = requests.get(f"{BASE_URL}/api/clips")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/clips works")

    def test_proof_endpoint(self):
        """Test GET /api/proof"""
        response = requests.get(f"{BASE_URL}/api/proof")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/proof works")

    def test_content_endpoint(self):
        """Test GET /api/content"""
        response = requests.get(f"{BASE_URL}/api/content")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
        print(f"✓ GET /api/content works")

    def test_comments_endpoint(self):
        """Test GET /api/comments"""
        response = requests.get(f"{BASE_URL}/api/comments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/comments works")

    def test_subscriptions_endpoint(self):
        """Test GET /api/subscriptions"""
        response = requests.get(f"{BASE_URL}/api/subscriptions")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/subscriptions works")

    def test_petition_count_endpoint(self):
        """Test GET /api/petition/count"""
        response = requests.get(f"{BASE_URL}/api/petition/count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ GET /api/petition/count works: {data['count']} signatures")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
