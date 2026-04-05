import csv
import random
import os

def import_shorts(csv_path, user_ids_path, output_sql_path):
    print(f"Loading user IDs from {user_ids_path}...")
    # Load user IDs
    with open(user_ids_path, "r", encoding="utf-8-sig") as f:
        user_ids = [line.strip().strip('"').strip() for line in f if line.strip()]
    
    # Filter to ensure they look like UUIDs (basic check)
    user_ids = [uid for uid in user_ids if len(uid) >= 32]
    
    if not user_ids:
        print("Error: No user IDs found in user_ids.txt!")
        return

    print(f"Processing CSV: {csv_path}...")
    # Open CSV
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        
        batch_size = 1000
        current_batch = []
        total_count = 0
        sql_statements = []
        
        for row in reader:
            try:
                user_id = random.choice(user_ids)
                video_url = row.get('video_url', '').replace("'", "''")
                thumbnail_url = row.get('thumbnail_url', '').replace("'", "''")
                # Titles can now be long (TEXT type in DB)
                title = row.get('title', 'Unknown Title').replace("'", "''")
                
                keyword = row.get('keyword_source', 'General')
                description = f"Awesome YouTube Short about {keyword}. Shared on Ptitube.".replace("'", "''")
                
                # Ensure duration is an integer
                duration_raw = str(row.get('duration_seconds', '0')).split('.')[0]
                try:
                    duration = int(duration_raw)
                except:
                    duration = 0
                
                fmt = row.get('format', 'mp4')[:20].replace("'", "''")
                status = 'active'
                category_id = row.get('category_id', '0')
                try:
                    category_id = int(category_id)
                except:
                    category_id = 0
                
                val = f"('{user_id}', '{video_url}', '{thumbnail_url}', '{title}', '{description}', {duration}, '{fmt}', '{status}', {category_id})"
                current_batch.append(val)
                total_count += 1
            except Exception as e:
                print(f"Skipping row due to error: {e}")
                continue
            
            if len(current_batch) >= batch_size:
                sql = "INSERT INTO videos (user_id, video_url, thumbnail_url, title, description, duration_seconds, format, status, category_id) VALUES\n"
                sql += ",\n".join(current_batch) + ";"
                sql_statements.append(sql)
                current_batch = []
        
        # Final batch
        if current_batch:
            sql = "INSERT INTO videos (user_id, video_url, thumbnail_url, title, description, duration_seconds, format, status, category_id) VALUES\n"
            sql += ",\n".join(current_batch) + ";"
            sql_statements.append(sql)
            
    print(f"Writing {total_count} records to {output_sql_path}...")
    with open(output_sql_path, "w", encoding="utf-8") as f:
        f.write("-- Seed videos generated from shorts_data_with_cats.csv\n")
        f.write("BEGIN;\n\n")
        f.write("-- Clear existing data as requested\n")
        f.write("TRUNCATE TABLE videos CASCADE;\n\n")
        for stmt in sql_statements:
            f.write(stmt + "\n\n")
        f.write("COMMIT;\n")
    
    print(f"Success! Generated {output_sql_path} with {total_count} videos in {len(sql_statements)} batches.")

if __name__ == "__main__":
    import_shorts("database/shorts_data_with_cats.csv", "database/user_ids.txt", "database/seed_shorts.sql")
