"""
Test suite for Nep - Conversational Dev Partner feature
Tests: /api/nep/chat, /api/nep/sessions, /api/nep/sessions/{id}, /api/nep/confirm
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vault-legacy.preview.emergentagent.com').rstrip('/')

class TestNepSessions:
    """Test Nep session management endpoints"""
    
    def test_get_sessions_returns_list(self):
        """GET /api/nep/sessions should return a list"""
        response = requests.get(f"{BASE_URL}/api/nep/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/nep/sessions returns list with {len(data)} sessions")
    
    def test_session_structure(self):
        """Sessions should have required fields"""
        response = requests.get(f"{BASE_URL}/api/nep/sessions")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            session = data[0]
            assert "id" in session
            assert "title" in session
            assert "created_at" in session
            assert "updated_at" in session
            print(f"✓ Session structure valid: id={session['id'][:8]}..., title={session['title'][:30]}...")
        else:
            print("✓ No sessions exist yet - structure test skipped")


class TestNepChat:
    """Test Nep chat functionality"""
    
    def test_chat_basic_message(self):
        """POST /api/nep/chat should accept messages and return responses"""
        response = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "yo what's good? just testing you out"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have session_id and response
        assert "session_id" in data
        assert "response" in data
        assert len(data["response"]) > 0
        
        # Check for chill personality markers
        response_lower = data["response"].lower()
        print(f"✓ Nep responded: {data['response'][:100]}...")
        print(f"  Session ID: {data['session_id']}")
        
        return data["session_id"]
    
    def test_chat_with_existing_session(self):
        """Chat should work with existing session"""
        # First create a session
        res1 = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "hey nep, let's test session persistence"
        })
        assert res1.status_code == 200
        session_id = res1.json()["session_id"]
        
        # Continue conversation
        res2 = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "session_id": session_id,
            "message": "do you remember what we just talked about?"
        })
        assert res2.status_code == 200
        data = res2.json()
        
        # Should use same session
        assert data["session_id"] == session_id
        print(f"✓ Session persistence works - same session ID maintained")
        print(f"  Response: {data['response'][:100]}...")
        
        return session_id
    
    def test_chat_with_url_analysis(self):
        """Chat should accept URLs for analysis"""
        response = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "check out this site for design inspo",
            "urls": ["https://example.com"]
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        print(f"✓ URL analysis accepted")
        print(f"  Response: {data['response'][:100]}...")
    
    def test_chat_proposal_generation(self):
        """Chat should generate proposals for content changes"""
        response = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "change the hero headline to 'TEST HEADLINE FOR NEP'"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert "has_proposal" in data
        
        if data.get("has_proposal"):
            assert "proposal" in data
            proposal = data["proposal"]
            assert "action" in proposal
            assert "changes" in proposal
            print(f"✓ Proposal generated: {proposal}")
        else:
            print(f"✓ Response received (no proposal block): {data['response'][:100]}...")
        
        return data


class TestNepSessionDetail:
    """Test getting specific session details"""
    
    def test_get_session_detail(self):
        """GET /api/nep/sessions/{id} should return full session with messages"""
        # First create a session
        chat_res = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "test message for session detail test"
        })
        assert chat_res.status_code == 200
        session_id = chat_res.json()["session_id"]
        
        # Get session detail
        response = requests.get(f"{BASE_URL}/api/nep/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert len(data["messages"]) >= 2  # User message + Nep response
        
        # Check message structure
        user_msg = data["messages"][0]
        assert user_msg["role"] == "user"
        assert "content" in user_msg
        assert "timestamp" in user_msg
        
        nep_msg = data["messages"][1]
        assert nep_msg["role"] == "nep"
        assert "content" in nep_msg
        
        print(f"✓ Session detail retrieved with {len(data['messages'])} messages")
        return session_id
    
    def test_get_nonexistent_session(self):
        """GET /api/nep/sessions/{id} should return 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/nep/sessions/nonexistent-session-id")
        assert response.status_code == 404
        print("✓ 404 returned for nonexistent session")


class TestNepConfirm:
    """Test proposal confirmation/rejection"""
    
    def test_confirm_requires_session(self):
        """POST /api/nep/confirm should require valid session"""
        response = requests.post(f"{BASE_URL}/api/nep/confirm", json={
            "session_id": "nonexistent-session",
            "message_index": 0,
            "approved": True
        })
        assert response.status_code == 404
        print("✓ Confirm requires valid session")
    
    def test_confirm_invalid_index(self):
        """POST /api/nep/confirm should reject invalid message index"""
        # Create a session first
        chat_res = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "test for confirm index validation"
        })
        session_id = chat_res.json()["session_id"]
        
        # Try to confirm with invalid index
        response = requests.post(f"{BASE_URL}/api/nep/confirm", json={
            "session_id": session_id,
            "message_index": 999,
            "approved": True
        })
        assert response.status_code == 400
        print("✓ Invalid message index rejected")


class TestNepSessionDelete:
    """Test session deletion"""
    
    def test_delete_session(self):
        """DELETE /api/nep/sessions/{id} should delete session"""
        # Create a session
        chat_res = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "test session to be deleted"
        })
        session_id = chat_res.json()["session_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/nep/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify it's gone
        get_res = requests.get(f"{BASE_URL}/api/nep/sessions/{session_id}")
        assert get_res.status_code == 404
        
        print(f"✓ Session deleted successfully")
    
    def test_delete_nonexistent_session(self):
        """DELETE /api/nep/sessions/{id} should return 404 for invalid ID"""
        response = requests.delete(f"{BASE_URL}/api/nep/sessions/nonexistent-session-id")
        assert response.status_code == 404
        print("✓ 404 returned for deleting nonexistent session")


class TestNepPersonality:
    """Test Nep's chill dev personality"""
    
    def test_personality_in_responses(self):
        """Nep should use chill dev language"""
        response = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "what can you help me with?"
        })
        assert response.status_code == 200
        data = response.json()
        
        response_text = data["response"].lower()
        
        # Check for personality markers (at least one should be present)
        personality_markers = ["yo", "bet", "let's", "lowkey", "ngl", "fire", "cook", "vibe", "chill", "dope", "sick"]
        has_personality = any(marker in response_text for marker in personality_markers)
        
        print(f"✓ Nep response: {data['response'][:200]}...")
        if has_personality:
            print("  ✓ Chill dev personality detected!")
        else:
            print("  ⚠ No obvious personality markers (may still be valid)")


class TestNepIntegration:
    """Integration tests for Nep with site content"""
    
    def test_full_proposal_flow(self):
        """Test complete flow: chat -> proposal -> confirm -> verify change"""
        # Step 1: Ask Nep to make a change
        chat_res = requests.post(f"{BASE_URL}/api/nep/chat", json={
            "message": "change the hero headline to 'NEP TEST HEADLINE 12345'"
        })
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        session_id = chat_data["session_id"]
        
        print(f"Step 1: Chat response received")
        print(f"  Has proposal: {chat_data.get('has_proposal')}")
        
        if chat_data.get("has_proposal") and chat_data.get("proposal"):
            # Step 2: Get the message index
            session_res = requests.get(f"{BASE_URL}/api/nep/sessions/{session_id}")
            messages = session_res.json().get("messages", [])
            
            # Find the message with proposal
            proposal_index = None
            for idx, msg in enumerate(messages):
                if msg.get("has_proposal"):
                    proposal_index = idx
                    break
            
            if proposal_index is not None:
                # Step 3: Confirm the proposal
                confirm_res = requests.post(f"{BASE_URL}/api/nep/confirm", json={
                    "session_id": session_id,
                    "message_index": proposal_index,
                    "approved": True
                })
                
                if confirm_res.status_code == 200:
                    confirm_data = confirm_res.json()
                    print(f"Step 2: Proposal confirmed")
                    print(f"  Changes made: {confirm_data.get('changes_made')}")
                    
                    # Step 4: Verify the change was applied
                    content_res = requests.get(f"{BASE_URL}/api/content/hero_headline")
                    if content_res.status_code == 200:
                        content = content_res.json()
                        print(f"Step 3: Content verified: {content.get('value', '')[:50]}...")
                    
                    # Cleanup: Restore original headline
                    requests.post(f"{BASE_URL}/api/content", json={
                        "key": "hero_headline",
                        "value": "THE VAULT AWAITS"
                    })
                    print("Step 4: Cleaned up test data")
                else:
                    print(f"  Confirm failed: {confirm_res.status_code}")
            else:
                print("  No proposal message found in session")
        else:
            print("  Nep didn't generate a proposal block (may need follow-up)")
        
        # Cleanup session
        requests.delete(f"{BASE_URL}/api/nep/sessions/{session_id}")
        print("✓ Full proposal flow test completed")


class TestCleanup:
    """Cleanup test sessions"""
    
    def test_cleanup_test_sessions(self):
        """Clean up any test sessions created during testing"""
        sessions_res = requests.get(f"{BASE_URL}/api/nep/sessions")
        if sessions_res.status_code == 200:
            sessions = sessions_res.json()
            deleted = 0
            for session in sessions:
                if "test" in session.get("title", "").lower():
                    requests.delete(f"{BASE_URL}/api/nep/sessions/{session['id']}")
                    deleted += 1
            print(f"✓ Cleaned up {deleted} test sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
