import requests
import os
import json

BASE_URL = "http://localhost:8080/api"
RESOURCE_DIR = os.path.join(os.path.dirname(__file__), "resource")

def login(username="testuser", password="password123"):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if resp.status_code == 200:
        token = resp.json().get("token")
        print(f"✅ Login OK. Token: {token[:30]}...")
        return token
    else:
        # Try register first
        resp2 = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "email": f"{username}@test.com", "password": password})
        if resp2.status_code == 200:
            token = resp2.json().get("token")
            print(f"✅ Registered OK. Token: {token[:30]}...")
            return token
        print(f"❌ Login failed: {resp.status_code} {resp.text}")
        return None

def upload_video(token, filepath, title=None, description="Video mẫu"):
    if title is None:
        title = os.path.splitext(os.path.basename(filepath))[0]
    
    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"\n📤 Uploading: {os.path.basename(filepath)} ({size_mb:.1f} MB)")
    
    with open(filepath, 'rb') as f:
        files = {'file': (os.path.basename(filepath), f, 'video/mp4')}
        data = {'title': title, 'description': description}
        headers = {'Authorization': f'Bearer {token}'}
        
        resp = requests.post(f"{BASE_URL}/videos/upload", files=files, data=data, headers=headers, timeout=300)
    
    if resp.status_code == 200:
        video = resp.json()
        print(f"   ✅ OK! ID: {video.get('id')} | Title: {video.get('title')}")
        return video
    else:
        print(f"   ❌ Error {resp.status_code}: {resp.text[:200]}")
        return None

def main():
    print("=== Upload Video Mẫu ===\n")
    
    token = login()
    if not token:
        print("Cannot proceed without token!")
        return
    
    # Get list of mp4 files
    mp4_files = [f for f in os.listdir(RESOURCE_DIR) if f.endswith('.mp4')]
    print(f"\nFound {len(mp4_files)} video files in resource/")
    
    success = 0
    for fname in mp4_files:
        filepath = os.path.join(RESOURCE_DIR, fname)
        result = upload_video(token, filepath)
        if result:
            success += 1
    
    print(f"\n=== Done! Uploaded {success}/{len(mp4_files)} videos ===")
    
    # Verify
    print("\n📋 Verifying videos in database...")
    videos = requests.get(f"{BASE_URL}/videos").json()
    print(f"Total videos in DB: {len(videos)}")
    for v in videos:
        print(f"  - [{v.get('id', '')[:8]}...] {v.get('title', '')}")

if __name__ == "__main__":
    main()
