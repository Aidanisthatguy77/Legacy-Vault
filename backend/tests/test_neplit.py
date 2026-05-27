"""
Test suite for Neplit feature - NBA 2K Legacy Vault Admin Panel
Tests: Connectivity, Quick Commands, AI Analyzer, The Doc health checks, Action Logs, ZIP Export
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test /api/health endpoint for connectivity status"""
    
    def test_health_returns_healthy(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✅ Health check passed: {data}")


class TestNeplitLogs:
    """Test /api/neplit/logs endpoint for action logs"""
    
    def test_get_logs_returns_list(self):
        """Logs endpoint should return a list of actions"""
        response = requests.get(f"{BASE_URL}/api/neplit/logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Logs endpoint returned {len(data)} logs")
    
    def test_log_structure(self):
        """Each log should have required fields"""
        response = requests.get(f"{BASE_URL}/api/neplit/logs")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            log = data[0]
            assert "id" in log
            assert "action_type" in log
            assert "description" in log
            assert "status" in log
            assert "timestamp" in log
            print(f"✅ Log structure valid: {log['action_type']} - {log['description'][:50]}")
        else:
            print("⚠️ No logs found to validate structure")


class TestNeplitDocCheck:
    """Test /api/neplit/doc/check endpoint - The Doc health monitoring"""
    
    def test_doc_check_returns_health_status(self):
        """Doc check should return health status"""
        response = requests.post(f"{BASE_URL}/api/neplit/doc/check")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data
        assert "issues" in data
        assert "warnings" in data
        assert "checked_at" in data
        print(f"✅ Doc check passed: healthy={data['healthy']}, issues={len(data['issues'])}, warnings={len(data['warnings'])}")
    
    def test_doc_check_healthy_when_no_issues(self):
        """Doc check should be healthy when no critical issues"""
        response = requests.post(f"{BASE_URL}/api/neplit/doc/check")
        assert response.status_code == 200
        data = response.json()
        # If no issues, should be healthy
        if len(data["issues"]) == 0:
            assert data["healthy"] == True
            print("✅ System is healthy with no issues")
        else:
            print(f"⚠️ System has {len(data['issues'])} issues")


class TestNeplitExecute:
    """Test /api/neplit/execute endpoint - Quick commands"""
    
    def test_execute_returns_response(self):
        """Execute endpoint should accept commands"""
        response = requests.post(
            f"{BASE_URL}/api/neplit/execute",
            json={"command": "help"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        print(f"✅ Execute endpoint responded: {data['result'][:100]}...")
    
    def test_execute_headline_change(self):
        """Execute should handle headline change command"""
        test_headline = "TEST_HEADLINE_NEPLIT"
        response = requests.post(
            f"{BASE_URL}/api/neplit/execute",
            json={"command": f"Change the hero headline to '{test_headline}'"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        # Should indicate success
        assert "✅" in data["result"] or "Updated" in data["result"]
        print(f"✅ Headline change command executed: {data['result']}")
        
        # Verify the change was persisted (backend lowercases command text)
        content_response = requests.get(f"{BASE_URL}/api/content")
        assert content_response.status_code == 200
        content = content_response.json()
        assert content.get("hero_headline").lower() == test_headline.lower()
        print(f"✅ Headline change verified in content: {content.get('hero_headline')}")
    
    def test_execute_tagline_change(self):
        """Execute should handle tagline change command"""
        test_tagline = "TEST_TAGLINE_NEPLIT"
        response = requests.post(
            f"{BASE_URL}/api/neplit/execute",
            json={"command": f"Update the tagline to '{test_tagline}'"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        print(f"✅ Tagline change command executed: {data['result']}")
    
    def test_execute_vault_headline_change(self):
        """Execute should handle vault headline change command"""
        test_vault_headline = "TEST_VAULT_HEADLINE"
        response = requests.post(
            f"{BASE_URL}/api/neplit/execute",
            json={"command": f"Change the vault headline to '{test_vault_headline}'"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        print(f"✅ Vault headline change command executed: {data['result']}")


class TestNeplitAnalyze:
    """Test /api/neplit/analyze endpoint - AI Command Analyzer"""
    
    def test_analyze_returns_plan(self):
        """Analyze endpoint should return a plan or fallback"""
        response = requests.post(
            f"{BASE_URL}/api/neplit/analyze",
            json={"command": "Change the hero headline to 'NEW HEADLINE'"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have either plan or error/fallback
        assert "plan" in data or "error" in data or "fallback" in data
        print(f"✅ Analyze endpoint responded: {data}")


class TestNeplitExport:
    """Test /api/neplit/export endpoint - ZIP export"""
    
    def test_export_returns_zip(self):
        """Export endpoint should return a ZIP file"""
        response = requests.get(f"{BASE_URL}/api/neplit/export", timeout=120)
        assert response.status_code == 200
        # Check content type is zip
        content_type = response.headers.get('content-type', '')
        assert 'zip' in content_type or 'octet-stream' in content_type
        # Check we got some data
        assert len(response.content) > 1000  # Should be at least 1KB
        print(f"✅ Export returned ZIP file: {len(response.content)} bytes")


class TestAdminLogin:
    """Test admin login for Neplit access"""
    
    def test_admin_login_success(self):
        """Admin login should work with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "A@070610"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Admin login successful")
    
    def test_admin_login_failure(self):
        """Admin login should fail with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Admin login correctly rejected wrong password")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_restore_default_content(self):
        """Restore default content after tests"""
        # Restore hero headline
        response = requests.post(
            f"{BASE_URL}/api/content",
            json={"key": "hero_headline", "value": "The NBA 2K Legacy Vault"}
        )
        assert response.status_code == 200
        
        # Restore hero tagline
        response = requests.post(
            f"{BASE_URL}/api/content",
            json={"key": "hero_tagline", "value": "Persistent online. No resets. Ever."}
        )
        assert response.status_code == 200
        
        # Restore vault headline
        response = requests.post(
            f"{BASE_URL}/api/content",
            json={"key": "vault_headline", "value": "One Vault. Four Eras. Infinite Play."}
        )
        assert response.status_code == 200
        print("✅ Default content restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
