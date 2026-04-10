import json
import random
import os

def import_shorts_minio(json_path, user_ids_path, output_sql_path):
    print(f"Loading user IDs from {user_ids_path}...")
    with open(user_ids_path, "r", encoding="utf-8-sig") as f:
        user_ids = [line.strip().strip('"').strip() for line in f if line.strip()]
    
    user_ids = [uid for uid in user_ids if len(uid) >= 32]
    
    if not user_ids:
        print("Error: No user IDs found in user_ids.txt!")
        return

    print(f"Processing JSON: {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        videos_metadata = json.load(f)
        
    batch_size = 1000
    current_batch = []
    total_count = 0
    sql_statements = []
    
    for row in videos_metadata:
        try:
            user_id = random.choice(user_ids)
            video_id = row.get('id', '')
            video_url = f"{video_id}.mp4".replace("'", "''")
            thumbnail_url = f"{video_id}.webp".replace("'", "''")
            title = row.get('title', 'Unknown Title').replace("'", "''")
            
            description = row.get('description', '')
            if description:
                description = description.replace("'", "''")
            else:
                keyword = row.get('source_keyword', 'General').replace("'", "''")
                description = f"Awesome YouTube Short about {keyword}. Shared on Ptitube."
            
            try:
                duration = int(row.get('duration', 0))
            except:
                duration = 0
                
            fmt = "video/mp4"
            status = 'active'
            
            categories_str = row.get('categories', '[]')
            try:
                cat_list = json.loads(categories_str)
                category_id = int(cat_list[0]) if cat_list else 0
            except:
                category_id = 0
            
            try:
                file_size = int(row.get('filesize', 0))
            except:
                file_size = 0

            val = f"('{user_id}', '{video_url}', '{thumbnail_url}', '{title}', '{description}', {duration}, '{fmt}', '{status}', {category_id}, {file_size})"
            current_batch.append(val)
            total_count += 1
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue
        
        if len(current_batch) >= batch_size:
            sql = "INSERT INTO videos (user_id, video_url, thumbnail_url, title, description, duration_seconds, format, status, category_id, file_size) VALUES\n"
            sql += ",\n".join(current_batch) + ";"
            sql_statements.append(sql)
            current_batch = []
    
    if current_batch:
        sql = "INSERT INTO videos (user_id, video_url, thumbnail_url, title, description, duration_seconds, format, status, category_id, file_size) VALUES\n"
        sql += ",\n".join(current_batch) + ";"
        sql_statements.append(sql)
        
    print(f"Writing {total_count} records to {output_sql_path}...")
    with open(output_sql_path, "w", encoding="utf-8") as f:
        f.write("-- Seed videos generated from ytb_crawler/metadata.json for MinIO\n")
        f.write("BEGIN;\n\n")
        f.write("-- Clear existing data as requested\n")
        f.write("TRUNCATE TABLE videos CASCADE;\n\n")
        for stmt in sql_statements:
            f.write(stmt + "\n\n")
        f.write("COMMIT;\n")
    
    print(f"Success! Generated {output_sql_path} with {total_count} videos in {len(sql_statements)} batches.")

if __name__ == "__main__":
    import_shorts_minio("../ytb_crawler/metadata.json", "user_ids.txt", "seed_shorts_minio.sql")
