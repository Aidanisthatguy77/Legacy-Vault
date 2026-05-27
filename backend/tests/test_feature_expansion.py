"""
Test file for NBA 2K Legacy Vault Feature Expansion
Tests: Chat API, Votes API, Creator Submissions API, Community Posts API, Social Feed API
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestChatAPI:
    """Tests for Vault AI Chatbot - POST /api/chat"""

    def test_chat_endpoint_works(self):
        """Test that chat endpoint responds (Claude integration)"""
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json={"message": "What is the Legacy Vault?"},
            timeout=60  # AI responses take longer
        )
        print(f"Chat API status: {response.status_code}")
        
        # Check status code
        assert response.status_code == 200, f"Chat API failed: {response.text}"
        
        # Verify response structure
        data = response.json()
        assert "response" in data, "Missing 'response' field"
        assert "session_id" in data, "Missing 'session_id' field"
        assert len(data["response"]) > 10, "Response too short"
        print(f"Chat response length: {len(data['response'])} chars")
        print(f"Session ID: {data['session_id']}")

    def test_chat_maintains_session(self):
        """Test that chat maintains session context"""
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/chat",
            json={"message": "My name is TestUser"},
            timeout=60
        )
        assert response1.status_code == 200
        session_id = response1.json()["session_id"]
        
        # Second message in same session
        response2 = requests.post(
            f"{BASE_URL}/api/chat",
            json={"message": "What is my name?", "session_id": session_id},
            timeout=60
        )
        assert response2.status_code == 200
        # Session should be the same
        assert response2.json()["session_id"] == session_id
        print(f"Session maintained: {session_id}")


class TestVotesAPI:
    """Tests for Era Voting Poll - GET/POST /api/votes"""

    def test_get_votes_returns_structure(self):
        """Test GET /api/votes returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/votes")
        assert response.status_code == 200
        
        data = response.json()
        assert "votes" in data, "Missing 'votes' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["votes"], dict)
        assert isinstance(data["total"], int)
        print(f"Vote results: {data}")

    def test_cast_vote_for_valid_game(self):
        """Test POST /api/votes with valid game"""
        # Test each valid game
        valid_games = ["2k15", "2k16", "2k17", "2k20"]
        
        for game_id in valid_games:
            response = requests.post(
                f"{BASE_URL}/api/votes",
                json={"game_id": game_id}
            )
            assert response.status_code == 200, f"Failed for {game_id}: {response.text}"
            
            data = response.json()
            assert "message" in data
            assert data["game_id"] == game_id
            print(f"Successfully voted for {game_id}")

    def test_cast_vote_invalid_game_rejected(self):
        """Test POST /api/votes with invalid game returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/votes",
            json={"game_id": "2k99"}  # Invalid game
        )
        assert response.status_code == 400
        print("Invalid game vote correctly rejected")

    def test_vote_counts_increment(self):
        """Test that votes increment the count"""
        # Get initial count
        initial = requests.get(f"{BASE_URL}/api/votes").json()
        initial_total = initial["total"]
        
        # Cast a vote
        requests.post(f"{BASE_URL}/api/votes", json={"game_id": "2k16"})
        
        # Get updated count
        updated = requests.get(f"{BASE_URL}/api/votes").json()
        assert updated["total"] > initial_total, "Vote count did not increment"
        print(f"Vote count incremented: {initial_total} -> {updated['total']}")


class TestCreatorSubmissionsAPI:
    """Tests for Creator Submission Form - CRUD /api/creator-submissions"""

    def test_submit_creator_content(self):
        """Test POST /api/creator-submissions creates submission"""
        submission_data = {
            "name": "TEST_Creator_User",
            "platform": "youtube",
            "profile_url": "https://youtube.com/@testcreator",
            "content_url": "https://youtube.com/watch?v=test123",
            "description": "Test video about Legacy Vault",
            "follower_count": "10K"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/creator-submissions",
            json=submission_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "id" in data
        print(f"Submission created with ID: {data['id']}")
        return data["id"]

    def test_get_all_submissions(self):
        """Test GET /api/creator-submissions returns list"""
        response = requests.get(f"{BASE_URL}/api/creator-submissions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} submissions")

    def test_get_submissions_by_status(self):
        """Test GET /api/creator-submissions?status=pending"""
        response = requests.get(f"{BASE_URL}/api/creator-submissions?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        for submission in data:
            assert submission["status"] == "pending"
        print(f"Retrieved {len(data)} pending submissions")

    def test_update_submission_status(self):
        """Test PUT /api/creator-submissions/{id}?status=approved"""
        # First create a submission
        create_response = requests.post(
            f"{BASE_URL}/api/creator-submissions",
            json={
                "name": "TEST_Status_Update",
                "platform": "tiktok",
                "profile_url": "https://tiktok.com/@testuser",
                "content_url": "https://tiktok.com/video/123",
                "description": "Test for status update"
            }
        )
        submission_id = create_response.json()["id"]
        
        # Update status to approved
        update_response = requests.put(
            f"{BASE_URL}/api/creator-submissions/{submission_id}?status=approved"
        )
        assert update_response.status_code == 200
        
        data = update_response.json()
        assert data["message"] == "Submission approved"
        print(f"Submission {submission_id} status updated to approved")

    def test_update_invalid_status_rejected(self):
        """Test PUT with invalid status returns 400"""
        # Create a submission
        create_response = requests.post(
            f"{BASE_URL}/api/creator-submissions",
            json={
                "name": "TEST_Invalid_Status",
                "platform": "twitter",
                "profile_url": "https://twitter.com/testuser",
                "content_url": "https://twitter.com/status/123",
                "description": "Test"
            }
        )
        submission_id = create_response.json()["id"]
        
        # Try invalid status
        response = requests.put(
            f"{BASE_URL}/api/creator-submissions/{submission_id}?status=invalid_status"
        )
        assert response.status_code == 400
        print("Invalid status correctly rejected")


class TestCommunityPostsAPI:
    """Tests for Community Speaks Wall - CRUD /api/community-posts"""

    def test_create_community_post(self):
        """Test POST /api/community-posts creates post"""
        post_data = {
            "platform": "twitter",
            "author_name": "TEST_Community_User",
            "author_handle": "@testuser",
            "author_avatar": "https://example.com/avatar.jpg",
            "follower_count": "50K",
            "content": "This Legacy Vault concept is amazing!",
            "post_url": "https://twitter.com/testuser/status/123",
            "screenshot_url": "https://example.com/screenshot.jpg",
            "order": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/community-posts",
            json=post_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["platform"] == "twitter"
        assert data["author_name"] == "TEST_Community_User"
        print(f"Community post created: {data['id']}")
        return data["id"]

    def test_get_community_posts(self):
        """Test GET /api/community-posts returns list"""
        response = requests.get(f"{BASE_URL}/api/community-posts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} community posts")

    def test_update_community_post(self):
        """Test PUT /api/community-posts/{id}"""
        # Create a post first
        create_response = requests.post(
            f"{BASE_URL}/api/community-posts",
            json={
                "platform": "reddit",
                "author_name": "TEST_Update_User",
                "author_handle": "u/testuser",
                "content": "Original content"
            }
        )
        post_id = create_response.json()["id"]
        
        # Update the post
        update_response = requests.put(
            f"{BASE_URL}/api/community-posts/{post_id}",
            json={
                "platform": "reddit",
                "author_name": "TEST_Update_User",
                "author_handle": "u/testuser",
                "content": "Updated content - edited!"
            }
        )
        assert update_response.status_code == 200
        print(f"Community post {post_id} updated")

    def test_delete_community_post(self):
        """Test DELETE /api/community-posts/{id}"""
        # Create a post first
        create_response = requests.post(
            f"{BASE_URL}/api/community-posts",
            json={
                "platform": "youtube",
                "author_name": "TEST_Delete_User",
                "author_handle": "@deleteuser",
                "content": "To be deleted"
            }
        )
        post_id = create_response.json()["id"]
        
        # Delete the post
        delete_response = requests.delete(f"{BASE_URL}/api/community-posts/{post_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/community-posts")
        posts = get_response.json()
        post_ids = [p["id"] for p in posts]
        assert post_id not in post_ids
        print(f"Community post {post_id} deleted and verified")


class TestSocialFeedAPI:
    """Tests for Live Social Feed - CRUD /api/social-feed"""

    def test_create_social_feed_item(self):
        """Test POST /api/social-feed creates item"""
        item_data = {
            "platform": "twitter",
            "author": "@nba2kfan",
            "content": "Can't wait for the Legacy Vault! #NBA2K #LegacyVault",
            "timestamp": "2026-01-15T10:30:00Z",
            "url": "https://twitter.com/nba2kfan/status/456"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social-feed",
            json=item_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["platform"] == "twitter"
        print(f"Social feed item created: {data['id']}")
        return data["id"]

    def test_get_social_feed(self):
        """Test GET /api/social-feed returns list"""
        response = requests.get(f"{BASE_URL}/api/social-feed")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} social feed items")

    def test_delete_social_feed_item(self):
        """Test DELETE /api/social-feed/{id}"""
        # Create an item first
        create_response = requests.post(
            f"{BASE_URL}/api/social-feed",
            json={
                "platform": "reddit",
                "author": "u/2kfan",
                "content": "TEST_To be deleted"
            }
        )
        item_id = create_response.json()["id"]
        
        # Delete the item
        delete_response = requests.delete(f"{BASE_URL}/api/social-feed/{item_id}")
        assert delete_response.status_code == 200
        print(f"Social feed item {item_id} deleted")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""

    def test_games_endpoint(self):
        """Test GET /api/games"""
        response = requests.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Games endpoint OK: {len(data)} games")

    def test_admin_login(self):
        """Test POST /api/admin/login"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "A@070610"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("Admin login successful")

    def test_mockups_endpoint(self):
        """Test GET /api/mockups"""
        response = requests.get(f"{BASE_URL}/api/mockups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Mockups endpoint OK: {len(data)} mockups")

    def test_content_endpoint(self):
        """Test GET /api/content"""
        response = requests.get(f"{BASE_URL}/api/content")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"Content endpoint OK: {len(data)} keys")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
